/**
 * Report generator - weekly/monthly/yearly inventory reports.
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { InventoryReport, type ReportPeriod } from '../schemas/warehouse';
import { StockTransaction } from '../schemas/warehouse';
import { getWarehouseQuantity } from './inventory.service';

const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'uploads', 'reports');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function generateWeeklyReport(clientId: string): Promise<string | null> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const [opening, closing, totals] = await Promise.all([
    getOpeningStock(clientId, start),
    getClosingStock(clientId, end),
    getTotalsByType(clientId, start, end),
  ]);

  const report = await InventoryReport.create({
    clientId,
    period: 'WEEKLY',
    periodStart: start,
    periodEnd: end,
    opening,
    closing,
    totals,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }

  return report._id.toString();
}

export async function generateMonthlyReport(clientId: string): Promise<string | null> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [opening, closing, totals] = await Promise.all([
    getOpeningStock(clientId, start),
    getClosingStock(clientId, end),
    getTotalsByType(clientId, start, end),
  ]);

  const report = await InventoryReport.create({
    clientId,
    period: 'MONTHLY',
    periodStart: start,
    periodEnd: end,
    opening,
    closing,
    totals,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }

  return report._id.toString();
}

export async function generateYearlyReport(clientId: string): Promise<string | null> {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  const [opening, closing, totals] = await Promise.all([
    getOpeningStock(clientId, start),
    getClosingStock(clientId, end),
    getTotalsByType(clientId, start, end),
  ]);

  const report = await InventoryReport.create({
    clientId,
    period: 'YEARLY',
    periodStart: start,
    periodEnd: end,
    opening,
    closing,
    totals,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }

  return report._id.toString();
}

async function getOpeningStock(clientId: string, at: Date): Promise<number> {
  const pipeline = [
    { $match: { clientId, createdAt: { $lt: at } } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ];
  const results = await StockTransaction.aggregate(pipeline);
  return sumByType(results);
}

async function getClosingStock(clientId: string, at: Date): Promise<number> {
  const pipeline = [
    { $match: { clientId, createdAt: { $lte: at } } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ];
  const results = await StockTransaction.aggregate(pipeline);
  return sumByType(results);
}

function sumByType(results: Array<{ _id: string; total: number }>): number {
  const adds = ['INBOUND', 'RETURNED'];
  const subs = ['SOLD', 'DAMAGED', 'MISSING', 'SHIPPING', 'RESERVED'];
  let qty = 0;
  for (const r of results) {
    if (adds.includes(r._id)) qty += r.total;
    if (subs.includes(r._id)) qty -= r.total;
  }
  return Math.max(0, qty);
}

async function getTotalsByType(
  clientId: string,
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  const pipeline = [
    { $match: { clientId, createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$type', total: { $sum: '$quantity' } } },
  ];
  const results = await StockTransaction.aggregate(pipeline);
  const totals: Record<string, number> = {};
  for (const r of results) {
    totals[r._id] = r.total;
  }
  return totals;
}

async function generatePdf(report: { period: ReportPeriod; periodStart: Date; periodEnd: Date; opening: number; closing: number; totals: Record<string, number> }): Promise<string | null> {
  await ensureDir(REPORTS_DIR);
  const filename = `report-${report.period}-${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).text(`Inventory Report - ${report.period}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${report.periodStart.toISOString().slice(0, 10)} to ${report.periodEnd.toISOString().slice(0, 10)}`);
    doc.text(`Opening balance: ${report.opening} items`);
    doc.text(`Closing balance: ${report.closing} items`);
    doc.moveDown();
    doc.text('Transaction totals:');
    for (const [type, qty] of Object.entries(report.totals)) {
      doc.text(`  ${type}: ${qty}`);
    }

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', () => resolve(null));
  });
}
