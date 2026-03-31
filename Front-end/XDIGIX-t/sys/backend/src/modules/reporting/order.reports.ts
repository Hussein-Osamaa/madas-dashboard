/**
 * Order reports — read-only aggregations over StorefrontOrder.
 */

import mongoose from 'mongoose';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

// Lazy model access to avoid import-order issues with legacy schema
function OrderModel() {
  return mongoose.models.StorefrontOrder || mongoose.model('StorefrontOrder');
}

export const orderReports = {
  /**
   * C1 — Order volume summary.
   */
  async summary(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const Order = OrderModel();

    const [statusCounts, totals] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(
      statusCounts.map((r: Record<string, unknown>) => [r._id, r.count]),
    );
    const agg = totals[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
    const total = (agg.totalOrders as number) || 0;
    const delivered = (byStatus.delivered as number) || 0;

    return {
      totalOrders: total,
      totalRevenue: agg.totalRevenue,
      avgOrderValue: Math.round(((agg.avgOrderValue as number) || 0) * 100) / 100,
      delivered,
      cancelled: byStatus.cancelled || 0,
      expired: byStatus.expired || 0,
      failed: byStatus.failed || 0,
      conversionRate: total > 0 ? Math.round((delivered / total) * 10000) / 100 : 0,
      byStatus,
    };
  },

  /**
   * C3 — Orders by payment method.
   */
  async byPaymentMethod(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return OrderModel().aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$total' },
          avg: { $avg: '$total' },
        },
      },
      { $sort: { total: -1 } },
    ]);
  },

  /**
   * C4 — Orders by tenant.
   */
  async byTenant(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return OrderModel().aggregate([
      { $match: match },
      {
        $group: {
          _id: '$tenantId',
          count: { $sum: 1 },
          total: { $sum: '$total' },
          avg: { $avg: '$total' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: filters.limit || 50 },
    ]);
  },

  /**
   * C5 — Order trend by day/week/month.
   */
  async trend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return OrderModel().aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr('createdAt', groupBy),
          count: { $sum: 1 },
          total: { $sum: '$total' },
          avg: { $avg: '$total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },

  /**
   * C7 — Top products by order count.
   */
  async topProducts(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const limit = filters.limit || 20;
    // Two-stage group: first deduplicate per order, then aggregate per product
    return OrderModel().aggregate([
      { $match: match },
      { $unwind: '$items' },
      // Stage 1: collapse items to one row per (order, product)
      {
        $group: {
          _id: { orderId: '$_id', productId: '$items.productId' },
          name: { $first: '$items.name' },
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      // Stage 2: count unique orders per product
      {
        $group: {
          _id: '$_id.productId',
          name: { $first: '$name' },
          orderCount: { $sum: 1 },
          totalQty: { $sum: '$qty' },
          totalRevenue: { $sum: '$revenue' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
    ]);
  },
};
