/**
 * Shipping reports — read-only aggregations over Shipment.
 */

import { Shipment } from '../shipping-module/shipment.schema';
import { CodCollection } from '../shipping-module/cod-collection.schema';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const shippingReports = {
  /**
   * F1 — Shipping summary.
   */
  async summary(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });

    const [statusCounts, deliveryTimes] = await Promise.all([
      Shipment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Shipment.aggregate([
        { $match: { ...match, deliveredAt: { $ne: null }, pickedUpAt: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgDeliveryMs: { $avg: { $subtract: ['$deliveredAt', '$pickedUpAt'] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(
      (statusCounts || []).map((r: Record<string, unknown>) => [r._id, r.count]),
    );
    const total = Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0);
    const dur = (deliveryTimes || [])[0] || { avgDeliveryMs: 0, count: 0 };

    return {
      totalShipments: total,
      delivered: byStatus.delivered || 0,
      inTransit: byStatus.in_transit || 0,
      failedDelivery: byStatus.failed_delivery || 0,
      returnedToSender: byStatus.returned_to_sender || 0,
      exception: byStatus.exception || 0,
      cancelled: byStatus.cancelled || 0,
      avgDeliveryHours: Math.round(((dur.avgDeliveryMs as number) || 0) / 3600000),
      deliveredWithTiming: dur.count,
      byStatus,
    };
  },

  /**
   * F2 — Carrier performance.
   */
  async carrierPerformance(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return Shipment.aggregate([
      { $match: { ...match, carrierId: { $ne: null } } },
      {
        $group: {
          _id: '$carrierId',
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed_delivery'] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ['$status', 'returned_to_sender'] }, 1, 0] } },
          avgRetries: { $avg: '$retryCount' },
        },
      },
      {
        $addFields: {
          deliveryRate: {
            $cond: [{ $gt: ['$total', 0] }, { $round: [{ $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 1] }, 0],
          },
        },
      },
      { $sort: { deliveryRate: -1 } },
    ]);
  },

  /**
   * F3 — Failed delivery report.
   */
  async failedDeliveries(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return Shipment.aggregate([
      { $match: { ...match, status: { $in: ['failed_delivery', 'returned_to_sender'] } } },
      {
        $project: {
          _id: 0,
          shipmentId: 1,
          orderId: 1,
          tenantId: 1,
          carrierId: 1,
          status: 1,
          retryCount: 1,
          maxRetries: 1,
          createdAt: 1,
          'shippingAddress.city': 1,
          'shippingAddress.country': 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: filters.limit || 100 },
    ]);
  },

  /**
   * F5 — COD collection report.
   */
  async codCollection(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });

    const [pending, collected] = await Promise.all([
      Shipment.aggregate([
        { $match: { ...match, codAmount: { $gt: 0 }, codCollected: false, status: { $nin: ['cancelled', 'returned_to_sender', 'failed_delivery', 'exception'] } } },
        { $group: { _id: null, pendingAmount: { $sum: '$codAmount' }, count: { $sum: 1 } } },
      ]),
      Shipment.aggregate([
        { $match: { ...match, codAmount: { $gt: 0 }, codCollected: true } },
        { $group: { _id: null, collectedAmount: { $sum: '$codAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const p = (pending || [])[0] as Record<string, number> | undefined;
    const c = (collected || [])[0] as Record<string, number> | undefined;

    return {
      pendingAmount: p?.pendingAmount || 0,
      pendingCount: p?.count || 0,
      collectedAmount: c?.collectedAmount || 0,
      collectedCount: c?.count || 0,
    };
  },

  /**
   * F6 — Shipping trend.
   */
  async trend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return Shipment.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr('createdAt', groupBy),
          created: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed_delivery'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },
};
