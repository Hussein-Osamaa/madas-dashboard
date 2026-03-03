import mongoose from 'mongoose';
import { StockTransaction } from '../models/StockTransaction.js';
import { InventoryReport } from '../models/InventoryReport.js';
import { Client } from '../models/Client.js';
import { Product } from '../models/Product.js';
import { generateReportPdf } from './pdfService.js';
import { notifyReportReady } from './notificationService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getMonth(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekLabel(date = new Date()) {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Sum transactions by type for a client in a date range (inclusive).
 */
async function getTransactionTotals(clientId, startDate, endDate) {
  const match = {
    clientId: new mongoose.Types.ObjectId(clientId),
    createdAt: { $gte: startDate, $lte: endDate },
  };
  const agg = await StockTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$quantity' } } },
  ]);
  const totals = {
    INBOUND: 0,
    SOLD: 0,
    DAMAGED: 0,
    MISSING: 0,
    ADJUSTMENT: 0,
    RETURNED: 0,
    RESERVED: 0,
    SHIPPING: 0,
  };
  for (const r of agg) totals[r._id] = r.total;
  return totals;
}

/**
 * Get total stock (available) for a client at a given time (sum over all products).
 */
async function getTotalStockAt(clientId, atDate) {
  const products = await Product.find({ clientId }).select('_id').lean();
  let total = 0;
  for (const p of products) {
    const transactions = await StockTransaction.find({
      productId: p._id,
      createdAt: { $lte: atDate },
    });
    let qty = 0;
    for (const t of transactions) {
      if (['INBOUND', 'RETURNED'].includes(t.type)) qty += t.quantity;
      else if (t.type === 'ADJUSTMENT') qty += t.quantity;
      else if (['SOLD', 'DAMAGED', 'MISSING', 'RESERVED', 'SHIPPING'].includes(t.type)) qty -= t.quantity;
    }
    total += Math.max(0, qty);
  }
  return total;
}

/**
 * Get opening balance at start of period (stock at startDate - 1ms).
 */
async function getOpeningBalance(clientId, startDate) {
  const before = new Date(startDate.getTime() - 1);
  return getTotalStockAt(clientId, before);
}

/**
 * Get closing balance at end of period (stock at endDate).
 */
async function getClosingBalance(clientId, endDate) {
  return getTotalStockAt(clientId, endDate);
}

/**
 * Weekly report: last 7 days. Run after each completed audit.
 */
export async function runWeeklyReportForClient(clientId) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const [totals, opening, closing] = await Promise.all([
    getTransactionTotals(clientId, startDate, endDate),
    getOpeningBalance(clientId, startDate),
    getClosingBalance(clientId, endDate),
  ]);

  const periodLabel = getWeekLabel(endDate);
  const report = await InventoryReport.create({
    clientId,
    periodType: 'WEEKLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });

  const client = await Client.findById(clientId).lean();
  const pdfPath = await generateReportPdf({
    clientName: client?.name || 'Client',
    periodType: 'WEEKLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });
  const pdfUrl = pdfPath ? `/reports/${path.basename(pdfPath)}` : '';
  await InventoryReport.updateOne({ _id: report._id }, { $set: { pdfUrl } });

  await notifyReportReady(clientId, report._id, 'WEEKLY', periodLabel, closing);
  return report;
}

/**
 * Monthly report: previous month. Run at 00:05 on 1st (cron).
 */
export async function runMonthlyReportForClient(clientId) {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(firstOfThisMonth.getTime() - 1);
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totals, opening, closing] = await Promise.all([
    getTransactionTotals(clientId, startDate, endDate),
    getOpeningBalance(clientId, startDate),
    getClosingBalance(clientId, endDate),
  ]);

  const periodLabel = getMonth(endDate);
  const report = await InventoryReport.create({
    clientId,
    periodType: 'MONTHLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });

  const client = await Client.findById(clientId).lean();
  const pdfPath = await generateReportPdf({
    clientName: client?.name || 'Client',
    periodType: 'MONTHLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });
  const pdfUrl = pdfPath ? `/reports/${path.basename(pdfPath)}` : '';
  await InventoryReport.updateOne({ _id: report._id }, { $set: { pdfUrl } });

  await notifyReportReady(clientId, report._id, 'MONTHLY', periodLabel, closing);
  return report;
}

/**
 * Yearly report: previous year. Run Jan 1 00:10.
 */
export async function runYearlyReportForClient(clientId) {
  const now = new Date();
  const year = now.getFullYear() - 1;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const [totals, opening, closing] = await Promise.all([
    getTransactionTotals(clientId, startDate, endDate),
    getOpeningBalance(clientId, startDate),
    getClosingBalance(clientId, endDate),
  ]);

  const periodLabel = String(year);
  const report = await InventoryReport.create({
    clientId,
    periodType: 'YEARLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });

  const client = await Client.findById(clientId).lean();
  const pdfPath = await generateReportPdf({
    clientName: client?.name || 'Client',
    periodType: 'YEARLY',
    periodLabel,
    openingBalance: opening,
    totalInbound: totals.INBOUND,
    totalSold: totals.SOLD,
    totalDamaged: totals.DAMAGED,
    totalMissing: totals.MISSING,
    closingBalance: closing,
  });
  const pdfUrl = pdfPath ? `/reports/${path.basename(pdfPath)}` : '';
  await InventoryReport.updateOne({ _id: report._id }, { $set: { pdfUrl } });

  await notifyReportReady(clientId, report._id, 'YEARLY', periodLabel, closing);
  return report;
}

export async function runMonthlyReportsForAllClients() {
  const clients = await Client.find().select('_id').lean();
  for (const c of clients) {
    try {
      await runMonthlyReportForClient(c._id);
    } catch (e) {
      console.error('Monthly report failed for client', c._id, e);
    }
  }
}

export async function runYearlyReportsForAllClients() {
  const clients = await Client.find().select('_id').lean();
  for (const c of clients) {
    try {
      await runYearlyReportForClient(c._id);
    } catch (e) {
      console.error('Yearly report failed for client', c._id, e);
    }
  }
}
