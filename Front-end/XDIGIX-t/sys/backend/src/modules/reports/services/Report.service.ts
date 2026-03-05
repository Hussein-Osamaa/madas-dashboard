import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getIo, emitWarehouseUpdate } from '../../../realtime';
import { StockTransactionModel } from '../../inventory/models/StockTransaction.model';
import { InventoryReportModel } from '../models/InventoryReport.model';
import { getAvailableStock } from '../../inventory/services/Inventory.service';
import { getClientSkus } from '../../inventory/services/Dashboard.service';
import { getStockBySkuMapAtDate } from '../../inventory/services/InventoryMovement.service';
import { InventoryMovement } from '../../../schemas/inventory-movement.schema';
import { toWeekLabel } from '../../../utils/month';
import { FirestoreDoc } from '../../../schemas/document.schema';
import type { ProductAuditDetail } from '../../audit/services/Audit.service';

const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'uploads', 'reports');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Last week Monday 00:00 UTC and Sunday 23:59:59.999 UTC */
function getLastWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - diff);
  thisMonday.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(thisMonday);
  weekStart.setUTCDate(thisMonday.getUTCDate() - 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

/** Weekly report: operational. Triggered after audit. periodLabel YYYY-WXX. */
export async function generateWeeklyReport(
  clientId: string,
  options?: {
    adjustments?: Array<{ productId: string; expected: number; actual: number; type: string }>;
    detailedBreakdown?: ProductAuditDetail[];
  }
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
  const detailedBreakdown = options?.detailedBreakdown ?? [];

  const totalMissingThisAudit = adjustments
    .filter((a) => a.type === 'MISSING')
    .reduce((s, a) => s + Math.max(0, a.expected - a.actual), 0);
  const totalAdjustmentsThisAudit = adjustments
    .filter((a) => a.type === 'ADJUSTMENT')
    .reduce((s, a) => s + Math.max(0, a.actual - a.expected), 0);
  const totalDamagedLast7Days = damaged;

  // Separate extra products (scanned > expected)
  const extraProducts = detailedBreakdown
    .filter((p) => p.type === 'ADJUSTMENT')
    .map((p) => ({
      ...p,
      excessQuantity: p.actualTotal - p.expectedTotal,
    }));

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
    detailedProductBreakdown: detailedBreakdown,
    extraProducts,
  });

  const pdfPath = await generatePdf(report);
  if (pdfPath) {
    report.pdfUrl = `${BASE_URL}/storage/files/reports/${path.basename(pdfPath)}`;
    await report.save();
  }
  emitWarehouseUpdate(getIo(), { type: 'reports', clientId });
  return report._id.toString();
}

/**
 * Weekly inventory report from inventory_movements only.
 * Contains: Opening Balance, STOCK_IN, PICKED, SHIPPED, RETURNED, DAMAGED, Manual Adjustments, Closing Balance,
 * Top 10 SKUs, movement summary. reportSource: 'movements'.
 */
export async function generateWeeklyMovementReport(clientId: string): Promise<string> {
  const { weekStart, weekEnd } = getLastWeekBounds();
  const clientSkus = await getClientSkus(clientId);
  const periodLabel = toWeekLabel(weekEnd);

  let openingBalance = 0;
  let closingBalance = 0;
  let stockIn = 0;
  let picked = 0;
  let shipped = 0;
  let returned = 0;
  let damaged = 0;
  let manualAdjustment = 0;
  let topSkus: Array<{ sku: string; totalMovement: number; in: number; out: number }> = [];

  if (clientSkus.length > 0) {
    const openingMap = await getStockBySkuMapAtDate(clientSkus, new Date(weekStart.getTime() - 1));
    const closingMap = await getStockBySkuMapAtDate(clientSkus, weekEnd);
    openingBalance = Object.values(openingMap).reduce((a, b) => a + b, 0);
    closingBalance = Object.values(closingMap).reduce((a, b) => a + b, 0);

    const typeTotals = await InventoryMovement.aggregate<{ _id: string; total: number }>([
      { $match: { sku: { $in: clientSkus }, created_at: { $gte: weekStart, $lte: weekEnd } } },
      { $group: { _id: '$type', total: { $sum: '$quantity' } } },
    ]);
    for (const t of typeTotals) {
      const v = t.total ?? 0;
      if (t._id === 'STOCK_IN') stockIn = v;
      else if (t._id === 'PICKED') picked = v;
      else if (t._id === 'SHIPPED') shipped = v;
      else if (t._id === 'RETURNED') returned = v;
      else if (t._id === 'DAMAGED') damaged = v;
      else if (t._id === 'MANUAL_ADJUSTMENT') manualAdjustment = v;
    }

    const skuAgg = await InventoryMovement.aggregate<{ _id: string; total: number; in: number; out: number }>([
      { $match: { sku: { $in: clientSkus }, created_at: { $gte: weekStart, $lte: weekEnd } } },
      {
        $group: {
          _id: '$sku',
          total: { $sum: { $abs: '$quantity' } },
          in: {
            $sum: {
              $cond: [
                { $in: ['$type', ['STOCK_IN', 'RETURNED']] },
                '$quantity',
                { $cond: [{ $and: [{ $eq: ['$type', 'MANUAL_ADJUSTMENT'] }, { $gte: ['$quantity', 0] }] }, '$quantity', 0] },
              ],
            },
          },
          out: {
            $sum: {
              $cond: [
                { $in: ['$type', ['PICKED', 'SHIPPED', 'DAMAGED']] },
                '$quantity',
                { $cond: [{ $and: [{ $eq: ['$type', 'MANUAL_ADJUSTMENT'] }, { $lt: ['$quantity', 0] }] }, { $abs: '$quantity' }, 0] },
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
    topSkus = skuAgg.map((r) => ({
      sku: r._id,
      totalMovement: r.total ?? 0,
      in: r.in ?? 0,
      out: r.out ?? 0,
    }));
  }

  const report = await InventoryReportModel.create({
    clientId,
    period: 'WEEKLY',
    periodLabel,
    periodStart: weekStart,
    periodEnd: weekEnd,
    inbound: stockIn,
    sold: picked + shipped,
    damaged,
    missing: 0,
    openingBalance,
    closingBalance,
    stockIn,
    picked,
    shipped,
    returned,
    manualAdjustment,
    topSkus,
    reportSource: 'movements',
  });

  const pdfPath = await generatePdfForMovementReport(report);
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

/* ────────────────────────────────────────────────────────────────────────────
 * PDF Generation - 3-section layout
 * ──────────────────────────────────────────────────────────────────────────── */

interface SizeBreakdownItem {
  size: string;
  expectedCount: number;
  scannedCount: number;
  sizeBarcode?: string;
  difference: number;
  status?: string;
}

interface DetailedProduct {
  productId: string;
  name: string;
  sku: string;
  mainBarcode: string;
  expectedTotal: number;
  actualTotal: number;
  type: string;
  sizeBreakdown: SizeBreakdownItem[];
}

interface ExtraProduct extends DetailedProduct {
  excessQuantity: number;
}

interface ReportData {
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
  detailedProductBreakdown?: DetailedProduct[];
  extraProducts?: ExtraProduct[];
}

const LEFT = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - 100;
const BOTTOM_MARGIN = 60;

function checkPageSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y > doc.page.height - BOTTOM_MARGIN - needed) {
    doc.addPage();
  }
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: Array<{ text: string; x: number; width: number }>,
  bold: boolean
): void {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
  for (const col of cols) {
    doc.text(col.text, col.x, y, { width: col.width, lineBreak: false });
  }
}

function drawHorizontalLine(doc: PDFKit.PDFDocument, color = '#cccccc'): void {
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + CONTENT_WIDTH, doc.y).strokeColor(color).lineWidth(0.5).stroke();
}

async function generatePdf(report: ReportData): Promise<string | null> {
  ensureDir(REPORTS_DIR);
  const filename = `report-${report.period}-${report.periodLabel ?? Date.now()}-${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    /* ── SECTION 1: SUMMARY ─────────────────────────────────────────────── */
    doc.fontSize(18).font('Helvetica-Bold')
      .text(`Inventory Audit Report - ${report.period}`, { align: 'center' });
    if (report.periodLabel) {
      doc.fontSize(12).font('Helvetica')
        .text(`Period: ${report.periodLabel}`, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`${report.periodStart.toISOString().slice(0, 10)}  to  ${report.periodEnd.toISOString().slice(0, 10)}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary table
    const summaryColX = LEFT;
    const summaryValX = LEFT + 250;

    const summaryLines: Array<[string, string]> = [];
    if (report.openingBalance != null) summaryLines.push(['Opening Balance', String(report.openingBalance)]);
    summaryLines.push(
      ['Inbound', String(report.inbound)],
      ['Sold', String(report.sold)],
      ['Damaged', String(report.damaged)],
      ['Missing', String(report.missing)],
      ['Closing Balance', String(report.closingBalance)],
    );
    if (report.previousWeekClosingBalance != null) {
      summaryLines.push(['Previous Week Closing', String(report.previousWeekClosingBalance)]);
      const diff = report.closingBalance - report.previousWeekClosingBalance;
      summaryLines.push(['Week-over-Week Change', `${diff >= 0 ? '+' : ''}${diff}`]);
    }
    if (report.totalMissingThisAudit != null) {
      summaryLines.push(['Missing (this audit)', String(report.totalMissingThisAudit)]);
    }
    if (report.totalAdjustmentsThisAudit != null) {
      summaryLines.push(['Extra / Adjustments (this audit)', String(report.totalAdjustmentsThisAudit)]);
    }
    if (report.totalDamagedLast7Days != null) {
      summaryLines.push(['Damaged (last 7 days)', String(report.totalDamagedLast7Days)]);
    }

    // Header row
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Metric', summaryColX, doc.y, { continued: false });
    const headerY = doc.y - 12;
    doc.text('Value', summaryValX, headerY, { continued: false });
    doc.moveDown(0.3);
    drawHorizontalLine(doc);
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(10);
    for (const [label, value] of summaryLines) {
      const rowY = doc.y;
      doc.text(label, summaryColX, rowY);
      doc.text(value, summaryValX, rowY);
      doc.moveDown(0.2);
    }
    doc.moveDown(1);

    // Count matched products
    const detailed = report.detailedProductBreakdown ?? [];
    const matchedCount = detailed.filter((p) => p.type === 'AUDIT').length;
    const missingProducts = detailed.filter((p) => p.type === 'MISSING');
    const totalProducts = detailed.length;

    doc.font('Helvetica').fontSize(10)
      .text(`Total products audited: ${totalProducts}`)
      .text(`Products matching expected: ${matchedCount}`)
      .text(`Products with missing items: ${missingProducts.length}`)
      .text(`Products with extra items: ${(report.extraProducts ?? []).length}`);

    /* ── SECTION 2: DETAILED PRODUCT BREAKDOWN ───────────────────────── */
    const discrepancyProducts = detailed.filter((p) => p.type !== 'AUDIT');

    if (discrepancyProducts.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold')
        .text('Section 2: Detailed Product Breakdown', LEFT);
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica')
        .text('Products with discrepancies between expected and scanned inventory. Products that matched exactly are excluded.');
      doc.moveDown(1);

      // Column positions for size sub-table
      const sizeIndent = LEFT + 10;
      const sizeCols = [
        { label: 'Size', x: sizeIndent, w: 70 },
        { label: 'Barcode', x: sizeIndent + 70, w: 95 },
        { label: 'Expected', x: sizeIndent + 165, w: 60 },
        { label: 'Scanned', x: sizeIndent + 225, w: 60 },
        { label: 'Diff', x: sizeIndent + 285, w: 50 },
        { label: 'Status', x: sizeIndent + 335, w: 80 },
      ];

      for (const product of discrepancyProducts) {
        const estimatedHeight = 60 + (product.sizeBreakdown.length + 1) * 16;
        checkPageSpace(doc, estimatedHeight);

        // Product header
        const statusLabel = product.type === 'MISSING' ? 'MISSING' : 'EXTRA';
        doc.fontSize(11).font('Helvetica-Bold').text(product.name, LEFT);
        doc.fontSize(9).font('Helvetica')
          .text(`SKU: ${product.sku || '-'}  |  Barcode: ${product.mainBarcode || '-'}  |  Status: ${statusLabel}`);
        doc.text(`Expected Total: ${product.expectedTotal}  |  Scanned Total: ${product.actualTotal}  |  Difference: ${product.actualTotal - product.expectedTotal}`);
        doc.moveDown(0.3);

        // Size sub-table header
        if (product.sizeBreakdown.length > 0) {
          const hY = doc.y;
          drawTableRow(doc, hY, sizeCols.map((c) => ({ text: c.label, x: c.x, width: c.w })), true);
          doc.y = hY + 14;
          drawHorizontalLine(doc);
          doc.moveDown(0.2);

          for (const sb of product.sizeBreakdown) {
            checkPageSpace(doc, 16);
            const rY = doc.y;
            const diffStr = `${sb.difference >= 0 ? '+' : ''}${sb.difference}`;
            drawTableRow(doc, rY, [
              { text: sb.size, x: sizeCols[0].x, width: sizeCols[0].w },
              { text: sb.sizeBarcode || '-', x: sizeCols[1].x, width: sizeCols[1].w },
              { text: String(sb.expectedCount), x: sizeCols[2].x, width: sizeCols[2].w },
              { text: String(sb.scannedCount), x: sizeCols[3].x, width: sizeCols[3].w },
              { text: diffStr, x: sizeCols[4].x, width: sizeCols[4].w },
              { text: sb.status || '-', x: sizeCols[5].x, width: sizeCols[5].w },
            ], false);
            doc.y = rY + 14;
          }
        }

        doc.moveDown(0.5);
        drawHorizontalLine(doc, '#e0e0e0');
        doc.moveDown(0.5);
      }
    }

    /* ── SECTION 3: EXTRA / UNRETURNED PRODUCTS ──────────────────────── */
    const extras = report.extraProducts ?? [];
    if (extras.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold')
        .text('Section 3: Extra / Unreturned Products', LEFT);
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica')
        .text('Products scanned in quantities exceeding expected inventory. These may include returned items not added back to the system, or unexpected stock.');
      doc.moveDown(1);

      // Summary table for extras
      const exColX = LEFT;
      const exCols = [
        { label: 'Product', x: exColX, w: 150 },
        { label: 'SKU', x: exColX + 150, w: 90 },
        { label: 'Expected', x: exColX + 240, w: 70 },
        { label: 'Scanned', x: exColX + 310, w: 70 },
        { label: 'Excess', x: exColX + 380, w: 70 },
      ];

      // Header
      const ehY = doc.y;
      drawTableRow(doc, ehY, exCols.map((c) => ({ text: c.label, x: c.x, width: c.w })), true);
      doc.y = ehY + 14;
      drawHorizontalLine(doc);
      doc.moveDown(0.2);

      for (const product of extras) {
        checkPageSpace(doc, 16);
        const rY = doc.y;
        drawTableRow(doc, rY, [
          { text: product.name, x: exCols[0].x, width: exCols[0].w },
          { text: product.sku || '-', x: exCols[1].x, width: exCols[1].w },
          { text: String(product.expectedTotal), x: exCols[2].x, width: exCols[2].w },
          { text: String(product.actualTotal), x: exCols[3].x, width: exCols[3].w },
          { text: `+${product.excessQuantity}`, x: exCols[4].x, width: exCols[4].w },
        ], false);
        doc.y = rY + 14;
      }

      doc.moveDown(1);
      drawHorizontalLine(doc, '#e0e0e0');
      doc.moveDown(1);

      // Detailed size breakdown for extra products
      doc.fontSize(12).font('Helvetica-Bold').text('Size-Level Detail for Extra Products', LEFT);
      doc.moveDown(0.5);

      const sizeIndent = LEFT + 10;
      const sizeCols2 = [
        { label: 'Size', x: sizeIndent, w: 70 },
        { label: 'Barcode', x: sizeIndent + 70, w: 95 },
        { label: 'Expected', x: sizeIndent + 165, w: 60 },
        { label: 'Scanned', x: sizeIndent + 225, w: 60 },
        { label: 'Excess', x: sizeIndent + 285, w: 50 },
        { label: 'Status', x: sizeIndent + 335, w: 80 },
      ];

      for (const product of extras) {
        const extraSizes = product.sizeBreakdown.filter((sb) => sb.difference > 0);
        if (extraSizes.length === 0) continue;

        const estimatedHeight = 50 + (extraSizes.length + 1) * 16;
        checkPageSpace(doc, estimatedHeight);

        doc.fontSize(10).font('Helvetica-Bold').text(`${product.name}  (${product.mainBarcode || '-'})`, LEFT);
        doc.moveDown(0.3);

        const hY2 = doc.y;
        drawTableRow(doc, hY2, sizeCols2.map((c) => ({ text: c.label, x: c.x, width: c.w })), true);
        doc.y = hY2 + 14;
        drawHorizontalLine(doc);
        doc.moveDown(0.2);

        for (const sb of extraSizes) {
          checkPageSpace(doc, 16);
          const rY = doc.y;
          drawTableRow(doc, rY, [
            { text: sb.size, x: sizeCols2[0].x, width: sizeCols2[0].w },
            { text: sb.sizeBarcode || '-', x: sizeCols2[1].x, width: sizeCols2[1].w },
            { text: String(sb.expectedCount), x: sizeCols2[2].x, width: sizeCols2[2].w },
            { text: String(sb.scannedCount), x: sizeCols2[3].x, width: sizeCols2[3].w },
            { text: `+${sb.difference}`, x: sizeCols2[4].x, width: sizeCols2[4].w },
            { text: sb.status || 'Surplus', x: sizeCols2[5].x, width: sizeCols2[5].w },
          ], false);
          doc.y = rY + 14;
        }

        doc.moveDown(0.5);
        drawHorizontalLine(doc, '#e0e0e0');
        doc.moveDown(0.5);
      }
    }

    /* ── Footer ─────────────────────────────────────────────────────────── */
    checkPageSpace(doc, 40);
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').fillColor('#888888')
      .text(`Generated: ${new Date().toISOString()}  |  XDIGIX Inventory System`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', () => resolve(null));
  });
}

async function generatePdfForMovementReport(report: {
  period: string;
  periodLabel?: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance?: number;
  closingBalance?: number;
  stockIn?: number;
  picked?: number;
  shipped?: number;
  returned?: number;
  damaged?: number;
  manualAdjustment?: number;
  topSkus?: Array<{ sku: string; totalMovement: number; in: number; out: number }>;
}): Promise<string | null> {
  ensureDir(REPORTS_DIR);
  const filename = `report-${report.period}-movement-${report.periodLabel ?? Date.now()}-${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    doc.fontSize(20).text('Weekly Inventory Report (Movement-Based)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Period: ${report.periodStart.toISOString().slice(0, 10)} – ${report.periodEnd.toISOString().slice(0, 10)}${report.periodLabel ? ` (${report.periodLabel})` : ''}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).text('Summary', { continued: false });
    doc.fontSize(11);
    doc.text(`Opening Balance:     ${report.openingBalance ?? 0}`);
    doc.text(`Total STOCK_IN:     ${report.stockIn ?? 0}`);
    doc.text(`Total PICKED:       ${report.picked ?? 0}`);
    doc.text(`Total SHIPPED:      ${report.shipped ?? 0}`);
    doc.text(`Total RETURNED:     ${report.returned ?? 0}`);
    doc.text(`Total DAMAGED:      ${report.damaged ?? 0}`);
    doc.text(`Manual Adjustments: ${report.manualAdjustment ?? 0}`);
    doc.text(`Closing Balance:    ${report.closingBalance ?? 0}`);
    doc.moveDown(1);
    doc.fontSize(14).text('Movement Summary', { continued: false });
    doc.fontSize(11);
    const net = (report.stockIn ?? 0) + (report.returned ?? 0) + (report.manualAdjustment ?? 0) - (report.picked ?? 0) - (report.shipped ?? 0) - (report.damaged ?? 0);
    doc.text(`Net change (units): ${net}`);
    doc.moveDown(1);
    doc.fontSize(14).text('Top 10 SKUs by Movement', { continued: false });
    doc.fontSize(10);
    const topSkus = report.topSkus ?? [];
    if (topSkus.length === 0) {
      doc.text('No movement in this period.');
    } else {
      doc.text('SKU'.padEnd(24) + 'Total'.padStart(10) + 'In'.padStart(10) + 'Out'.padStart(10));
      doc.text('-'.repeat(54));
      for (const row of topSkus) {
        doc.text((row.sku || '').slice(0, 22).padEnd(24) + String(row.totalMovement).padStart(10) + String(row.in).padStart(10) + String(row.out).padStart(10));
      }
    }
    doc.end();
    stream.on('finish', () => resolve(filepath));
    stream.on('error', () => resolve(null));
  });
}
