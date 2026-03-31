/**
 * Revenue reports — read-only aggregations over LedgerEntry, Invoice, CreditNote.
 */

import { LedgerEntry } from '../finance/ledger-entry.schema';
import { Invoice } from '../finance/invoice.schema';
import { CreditNote } from '../finance/credit-note.schema';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const revenueReports = {
  /**
   * B1 — Revenue summary: recognized, receivables, overdue, refunds, COD, credit notes.
   */
  async summary(filters: ReportFilters) {
    const dr = filters.dateRange || defaultDateRange();
    const match = buildMatch({ ...filters, dateRange: dr });

    const [ledger, invoices, credits] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { ...buildMatch({ ...filters, dateRange: dr }), status: 'overdue' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      CreditNote.aggregate([
        { $match: buildMatch({ ...filters, dateRange: dr }) },
        { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const byType = Object.fromEntries(ledger.map((r: Record<string, unknown>) => [r._id, r]));
    const overdue = invoices[0] || { total: 0, count: 0 };
    const creditMap = Object.fromEntries(credits.map((r: Record<string, unknown>) => [r._id, r]));

    return {
      dateRange: dr,
      revenueRecognized: (byType.revenue_recognized as Record<string, number>)?.total || 0,
      revenueReceivable: (byType.revenue_receivable as Record<string, number>)?.total || 0,
      paymentsReceived: (byType.payment_received as Record<string, number>)?.total || 0,
      refunds: (byType.refund as Record<string, number>)?.total || 0,
      codReceipts: (byType.cod_receipt as Record<string, number>)?.total || 0,
      writeOffs: (byType.write_off as Record<string, number>)?.total || 0,
      overdueInvoices: { total: overdue.total as number, count: overdue.count as number },
      creditNotesIssued: (creditMap.issued as Record<string, number>)?.total || 0,
      creditNotesApplied: (creditMap.applied as Record<string, number>)?.total || 0,
    };
  },

  /**
   * B2 — Revenue by tenant.
   */
  async byTenant(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return LedgerEntry.aggregate([
      { $match: { ...match, type: { $in: ['revenue_recognized', 'revenue_receivable'] } } },
      {
        $group: {
          _id: '$tenantId',
          recognized: {
            $sum: { $cond: [{ $eq: ['$type', 'revenue_recognized'] }, '$amount', 0] },
          },
          receivable: {
            $sum: { $cond: [{ $eq: ['$type', 'revenue_receivable'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { recognized: -1 } },
      { $limit: filters.limit || 50 },
    ]);
  },

  /**
   * B3 — Revenue by payment method (join via orderId to orders).
   */
  async byPaymentMethod(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    // Use ledger entries linked to orders
    return LedgerEntry.aggregate([
      { $match: { ...match, referenceType: 'order', type: 'revenue_receivable' } },
      {
        $lookup: {
          from: 'storefrontorders',
          localField: 'orderId',
          foreignField: 'orderId',
          as: 'order',
          pipeline: [{ $project: { paymentMethod: 1 } }],
        },
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$order.paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
  },

  /**
   * B5 — Revenue trend (grouped by day/week/month).
   */
  async trend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return LedgerEntry.aggregate([
      { $match: { ...match, type: { $in: ['revenue_recognized', 'revenue_receivable'] } } },
      {
        $group: {
          _id: dateGroupExpr('createdAt', groupBy),
          recognized: {
            $sum: { $cond: [{ $eq: ['$type', 'revenue_recognized'] }, '$amount', 0] },
          },
          receivable: {
            $sum: { $cond: [{ $eq: ['$type', 'revenue_receivable'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },

  /**
   * B6 — Receivables aging buckets.
   */
  async receivablesAging(filters: ReportFilters) {
    const match = buildMatch(filters);
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);
    const d90 = new Date(now.getTime() - 90 * 86400000);

    return Invoice.aggregate([
      { $match: { ...match, status: { $in: ['issued', 'overdue'] }, dueDate: { $ne: null } } },
      {
        $addFields: {
          bucket: {
            $switch: {
              branches: [
                { case: { $gte: ['$dueDate', now] }, then: 'current' },
                { case: { $gte: ['$dueDate', d30] }, then: '1-30 days' },
                { case: { $gte: ['$dueDate', d60] }, then: '31-60 days' },
                { case: { $gte: ['$dueDate', d90] }, then: '61-90 days' },
              ],
              default: '90+ days',
            },
          },
        },
      },
      {
        $group: {
          _id: '$bucket',
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  },
};
