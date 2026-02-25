import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getIo, emitWarehouseUpdate } from '../../../realtime';
import { StockTransactionModel } from '../../inventory/models/StockTransaction.model';
import { InventoryReportModel } from '../models/InventoryReport.model';
import { getAvailableStock } from '../../inventory/services/Inventory.service';
import { toWeekLabel } from '../../../utils/month';
import { FirestoreDoc } from '../../../schemas/document.schema';

const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'uploads', 'reports');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Weekly report: operational. Triggered after audit. periodLabel YYYY-WXX. */
export async function generateWeeklyReport(
  clientId: string,
  options?: { adjustments?: Array<{ productId: string; expected: number; actual: number; type: string }> }
): Promise<string> {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 7);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);

  const totals = await StockTransactionModel.aggregate([
    { $match: { clientId, createdAt: { $gte: periodStart, $lte: periodEnd } } },
    { $group: { _id: '$type', total: { $sum: '$quantity' } } },
  ]);

  const inbound = totals.find((t) => t._id === 'INBOUND')?.total ?? 0;
  const sold = totals.find((t) => t._id === 'SOLD')?.total ?? 0;
  const damaged = totals.find((t) => t._id === 'DAMAGED')?.total ?? 0;
  const missing = totals.find((t) => t._id === 'MISSING')?.total ?? 0;

  const productIds = await StockTransactionModel.distinct('productId', { clientId });
  const productDocs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' }).select('docId').lean();
  const allProductIds = [...new Set([...productIds, ...productDocs.map((d: { docId: string }) => d.docId)])];

  let closingBalance = 0;
  const productBreakdown: Array<{ productId: string; availableStock: number }> = [];
  for (const pid of allProductIds) {
    const qty = await getAvailableStock(pid, clientId);
    closingBalance += qty;
    productBreakdown.push({ productId: pid, availableStock: qty });
  }

  const adjustments = options?.adjustments ?? [];
  const totalMissingThisAudit = adjustments
    .filter((a) => a.type === 'MISSING')
    .reduce((s, a) => s + Math.max(0, a.expected - a.actual), 0);
  const totalAdjustmentsThisAudit = adjustments
    .filter((a) => a.type === 'ADJUSTMENT')
    .reduce((s, a) => s + Math.max(0, a.actual - a.expected), 0);
  const totalDamagedLast7Days = damaged;

  const prevWeekEnd = new Date(periodStart);
  prevWeekEnd.setMilliseconds(-1);
  const prevReport = await InventoryReportModel.findOne({
    clientId,
    period: 'WEEKLY',
    periodEnd: { $lte: prevWeekEnd },
  })
    .sort({ periodEnd: -1 })
    .lean();
  const previousWeekClosingBalance = prevReport?.closingBalance ?? undefined;

  const periodLabel = toWeekLabel(now);

  const report = await InventoryReportModel.create({
    clientId,
    period: 'WEEKLY',
    periodLabel,
    periodStart,
    periodEnd,
    inbound,
    sold,
    damaged,
    missing,
    closingBalance,
    totalMissingThisAudit,
    totalAdjustmentsThisAudit,
    totalDamagedLast7Days,
    previousWeekClosingBalance,
    productBreakdown,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }
  emitWarehouseUpdate(getIo(), { type: 'reports', clientId });
  return report._id.toString();
}

/** Monthly report: financial. openingBalance = previous month closing; closing = opening + inbound - sold - damaged - missing. */
export async function generateMonthlyReport(clientId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const periodStart = new Date(year, month - 1, 1, 0, 0, 0);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const totals = await StockTransactionModel.aggregate([
    { $match: { clientId, createdAt: { $gte: periodStart, $lte: periodEnd } } },
    { $group: { _id: '$type', total: { $sum: '$quantity' } } },
  ]);

  const totalInbound = totals.find((t) => t._id === 'INBOUND')?.total ?? 0;
  const totalSold = totals.find((t) => t._id === 'SOLD')?.total ?? 0;
  const totalDamaged = totals.find((t) => t._id === 'DAMAGED')?.total ?? 0;
  const totalMissing = totals.find((t) => t._id === 'MISSING')?.total ?? 0;

  const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);
  const prevReport = await InventoryReportModel.findOne({
    clientId,
    period: 'MONTHLY',
    periodEnd: { $lte: prevMonthEnd },
  })
    .sort({ periodEnd: -1 })
    .lean();
  const openingBalance = prevReport?.closingBalance ?? 0;

  const closingBalance =
    openingBalance + totalInbound - totalSold - totalDamaged - totalMissing;

  const periodLabel = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

  const report = await InventoryReportModel.create({
    clientId,
    period: 'MONTHLY',
    periodLabel,
    periodStart,
    periodEnd,
    inbound: totalInbound,
    sold: totalSold,
    damaged: totalDamaged,
    missing: totalMissing,
    openingBalance,
    closingBalance,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }
  emitWarehouseUpdate(getIo(), { type: 'reports', clientId });
  return report._id.toString();
}

/** Yearly report: aggregated from monthly reports. periodLabel YYYY. */
export async function generateYearlyReport(clientId: string): Promise<string> {
  const year = new Date().getFullYear();
  const periodStart = new Date(year, 0, 1, 0, 0, 0);
  const periodEnd = new Date(year, 11, 31, 23, 59, 59);

  const monthlyReports = await InventoryReportModel.find({
    clientId,
    period: 'MONTHLY',
    periodStart: { $gte: periodStart },
    periodEnd: { $lte: periodEnd },
  })
    .sort({ periodEnd: 1 })
    .lean();

  let totalInboundYear = 0;
  let totalSoldYear = 0;
  let totalDamagedYear = 0;
  let totalMissingYear = 0;
  let closingBalanceYear = 0;

  for (const r of monthlyReports) {
    const rep = r as { inbound?: number; sold?: number; damaged?: number; missing?: number; closingBalance?: number };
    totalInboundYear += rep.inbound ?? 0;
    totalSoldYear += rep.sold ?? 0;
    totalDamagedYear += rep.damaged ?? 0;
    totalMissingYear += rep.missing ?? 0;
    closingBalanceYear = rep.closingBalance ?? closingBalanceYear;
  }

  const periodLabel = String(year);

  const report = await InventoryReportModel.create({
    clientId,
    period: 'YEARLY',
    periodLabel,
    periodStart,
    periodEnd,
    inbound: totalInboundYear,
    sold: totalSoldYear,
    damaged: totalDamagedYear,
    missing: totalMissingYear,
    closingBalance: closingBalanceYear,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }
  emitWarehouseUpdate(getIo(), { type: 'reports', clientId });
  return report._id.toString();
}

async function generatePdf(report: {
  period: string;
  periodLabel?: string;
  periodStart: Date;
  periodEnd: Date;
  inbound: number;
  sold: number;
  damaged: number;
  missing: number;
  closingBalance: number;
  openingBalance?: number;
  totalMissingThisAudit?: number;
  totalAdjustmentsThisAudit?: number;
  totalDamagedLast7Days?: number;
  previousWeekClosingBalance?: number;
}): Promise<string | null> {
  ensureDir(REPORTS_DIR);
  const filename = `report-${report.period}-${report.periodLabel ?? Date.now()}-${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    doc.fontSize(20).text(`Inventory Report - ${report.period}${report.periodLabel ? ` (${report.periodLabel})` : ''}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Period: ${report.periodStart.toISOString().slice(0, 10)} - ${report.periodEnd.toISOString().slice(0, 10)}`);
    if (report.openingBalance != null) doc.text(`Opening balance: ${report.openingBalance}`);
    doc.text(`Inbound: ${report.inbound}`);
    doc.text(`Sold: ${report.sold}`);
    doc.text(`Damaged: ${report.damaged}`);
    doc.text(`Missing: ${report.missing}`);
    doc.text(`Closing balance: ${report.closingBalance} items`);
    if (report.totalMissingThisAudit != null) doc.text(`Missing this audit: ${report.totalMissingThisAudit}`);
    if (report.totalAdjustmentsThisAudit != null) doc.text(`Adjustments this audit: ${report.totalAdjustmentsThisAudit}`);
    if (report.totalDamagedLast7Days != null) doc.text(`Damaged (last 7 days): ${report.totalDamagedLast7Days}`);
    if (report.previousWeekClosingBalance != null) doc.text(`Previous week closing: ${report.previousWeekClosingBalance}`);
    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', () => resolve(null));
  });
}
