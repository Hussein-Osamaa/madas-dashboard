/**
 * Export inventory data to Excel (4 sheets) for a selected date range.
 * Sheet 1: Weekly Summary | Sheet 2: Detailed Movement Log | Sheet 3: SKU-Level Breakdown | Sheet 4: Profit Estimation
 */
import ExcelJS from 'exceljs';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { InventoryMovement } from '../../../schemas/inventory-movement.schema';
import { getClientSkus } from './Dashboard.service';
import { getStockBySkuMapAtDate } from './InventoryMovement.service';

export async function buildInventoryExport(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<ExcelJS.Buffer> {
  const clientSkus = await getClientSkus(clientId);
  const rangeStart = new Date(startDate);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(endDate);
  rangeEnd.setUTCHours(23, 59, 59, 999);

  const openingMap =
    clientSkus.length > 0
      ? await getStockBySkuMapAtDate(clientSkus, new Date(rangeStart.getTime() - 1))
      : {};
  const closingMap =
    clientSkus.length > 0 ? await getStockBySkuMapAtDate(clientSkus, rangeEnd) : {};
  const openingBalance = Object.values(openingMap).reduce((a, b) => a + b, 0);
  const closingBalance = Object.values(closingMap).reduce((a, b) => a + b, 0);

  const movements = await InventoryMovement.find({
    sku: clientSkus.length ? { $in: clientSkus } : { $in: [] },
    created_at: { $gte: rangeStart, $lte: rangeEnd },
  })
    .sort({ created_at: 1 })
    .lean();

  const typeTotals: Record<string, number> = {};
  for (const m of movements) {
    const t = (m as { type: string }).type;
    typeTotals[t] = (typeTotals[t] || 0) + (m as { quantity: number }).quantity;
  }
  const stockIn = typeTotals.STOCK_IN ?? 0;
  const picked = typeTotals.PICKED ?? 0;
  const shipped = typeTotals.SHIPPED ?? 0;
  const returned = typeTotals.RETURNED ?? 0;
  const damaged = typeTotals.DAMAGED ?? 0;
  const manualAdjustment = typeTotals.MANUAL_ADJUSTMENT ?? 0;

  const skuBreakdown: Record<
    string,
    { opening: number; closing: number; STOCK_IN: number; PICKED: number; SHIPPED: number; RETURNED: number; DAMAGED: number; MANUAL_ADJUSTMENT: number }
  > = {};
  for (const sku of clientSkus) {
    skuBreakdown[sku] = {
      opening: openingMap[sku] ?? 0,
      closing: closingMap[sku] ?? 0,
      STOCK_IN: 0,
      PICKED: 0,
      SHIPPED: 0,
      RETURNED: 0,
      DAMAGED: 0,
      MANUAL_ADJUSTMENT: 0,
    };
  }
  for (const m of movements) {
    const r = m as { sku: string; type: string; quantity: number };
    if (!(r.sku in skuBreakdown)) continue;
    const key = r.type as keyof typeof skuBreakdown[string];
    if (key in skuBreakdown[r.sku]) (skuBreakdown[r.sku] as Record<string, number>)[key] += r.quantity;
  }

  const productDocs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' })
    .select('docId data')
    .lean();
  const costBySku: Record<string, number> = {};
  const priceBySku: Record<string, number> = {};
  for (const d of productDocs) {
    const data = (d as { data?: { sku?: string; cost?: number; price?: number }; docId: string }).data || {};
    const sku = ((data.sku ?? (d as { docId: string }).docId) ?? '').trim();
    if (!sku) continue;
    costBySku[sku] = typeof data.cost === 'number' ? data.cost : typeof data.price === 'number' ? data.price : 0;
    priceBySku[sku] = typeof data.price === 'number' ? data.price : costBySku[sku];
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Warehouse Export';
  workbook.created = new Date();

  // Sheet 1: Weekly Summary
  const ws1 = workbook.addWorksheet('Weekly Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws1.addRow(['Inventory Export – Date Range Summary']);
  ws1.addRow([]);
  ws1.addRow(['Date Range', `${rangeStart.toISOString().slice(0, 10)} to ${rangeEnd.toISOString().slice(0, 10)}`]);
  ws1.addRow([]);
  ws1.addRow(['Opening Balance', 'Total STOCK_IN', 'Total PICKED', 'Total SHIPPED', 'Total RETURNED', 'Total DAMAGED', 'Manual Adjustments', 'Closing Balance']);
  ws1.addRow([openingBalance, stockIn, picked, shipped, returned, damaged, manualAdjustment, closingBalance]);
  ws1.getRow(6).font = { bold: true };

  // Sheet 2: Detailed Movement Log
  const ws2 = workbook.addWorksheet('Detailed Movement Log', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws2.addRow(['ID', 'SKU', 'Type', 'Quantity', 'Reference ID', 'Worker ID', 'Note', 'Created At']);
  ws2.getRow(1).font = { bold: true };
  for (const m of movements) {
    const r = m as Record<string, unknown>;
    ws2.addRow([
      r.id ?? '',
      r.sku ?? '',
      r.type ?? '',
      r.quantity ?? 0,
      r.reference_id ?? '',
      r.worker_id ?? '',
      r.note ?? '',
      (r.created_at as Date)?.toISOString?.() ?? '',
    ]);
  }

  // Sheet 3: SKU-Level Breakdown
  const ws3 = workbook.addWorksheet('SKU-Level Breakdown', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws3.addRow(['SKU', 'Opening', 'Closing', 'STOCK_IN', 'PICKED', 'SHIPPED', 'RETURNED', 'DAMAGED', 'Manual Adj', 'Net Change']);
  ws3.getRow(1).font = { bold: true };
  for (const sku of clientSkus) {
    const b = skuBreakdown[sku];
    if (!b) continue;
    const net =
      b.STOCK_IN + b.RETURNED + b.MANUAL_ADJUSTMENT - b.PICKED - b.SHIPPED - b.DAMAGED;
    ws3.addRow([
      sku,
      b.opening,
      b.closing,
      b.STOCK_IN,
      b.PICKED,
      b.SHIPPED,
      b.RETURNED,
      b.DAMAGED,
      b.MANUAL_ADJUSTMENT,
      net,
    ]);
  }

  // Sheet 4: Profit Estimation
  const ws4 = workbook.addWorksheet('Profit Estimation', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws4.addRow(['SKU', 'Units Out (Picked+Shipped)', 'Cost Per Unit', 'Total COGS', 'Price Per Unit', 'Est. Revenue', 'Est. Profit']);
  ws4.getRow(1).font = { bold: true };
  for (const sku of clientSkus) {
    const b = skuBreakdown[sku];
    if (!b) continue;
    const unitsOut = b.PICKED + b.SHIPPED;
    const cost = costBySku[sku] ?? 0;
    const price = priceBySku[sku] ?? cost;
    const totalCOGS = unitsOut * cost;
    const estRevenue = unitsOut * price;
    const estProfit = estRevenue - totalCOGS;
    ws4.addRow([sku, unitsOut, cost, totalCOGS, price, estRevenue, estProfit]);
  }

  return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
}
