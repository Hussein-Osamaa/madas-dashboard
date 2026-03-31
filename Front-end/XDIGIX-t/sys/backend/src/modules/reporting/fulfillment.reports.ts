/**
 * Fulfillment reports — read-only aggregations over FulfillmentJob.
 */

import { FulfillmentJob } from '../fulfillment/fulfillment-job.schema';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const fulfillmentReports = {
  /**
   * E1 — Fulfillment summary.
   */
  async summary(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });

    const [statusCounts, durations] = await Promise.all([
      FulfillmentJob.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FulfillmentJob.aggregate([
        { $match: { ...match, packedAt: { $ne: null }, pickedAt: { $ne: null }, startedAt: { $ne: null } } },
        {
          $project: {
            pickDurationMs: { $subtract: ['$pickedAt', '$startedAt'] },
            packDurationMs: { $subtract: ['$packedAt', '$pickedAt'] },
            totalDurationMs: { $subtract: ['$packedAt', '$startedAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgPickMs: { $avg: '$pickDurationMs' },
            avgPackMs: { $avg: '$packDurationMs' },
            avgTotalMs: { $avg: '$totalDurationMs' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(
      (statusCounts || []).map((r: Record<string, unknown>) => [r._id, r.count]),
    );
    const dur = (durations || [])[0] || { avgPickMs: 0, avgPackMs: 0, avgTotalMs: 0, count: 0 };
    const total = Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0);

    // Overdue = created/picking/packing older than 24h
    // Use tenant/business scoping but NOT the report's dateRange (overdue is absolute, not relative)
    const overdueCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const overdueMatch: Record<string, unknown> = {
      status: { $in: ['created', 'picking', 'packing'] },
      createdAt: { $lt: overdueCutoff },
    };
    if (filters.tenantId) overdueMatch.tenantId = filters.tenantId;
    if (filters.businessId) overdueMatch.businessId = filters.businessId;
    const overdueCount = await FulfillmentJob.countDocuments(overdueMatch);

    return {
      totalJobs: total,
      byStatus,
      overdueJobs: overdueCount,
      completed: (byStatus.handed_to_shipping as number) || 0,
      shortPick: (byStatus.short_pick as number) || 0,
      avgPickMinutes: Math.round(((dur.avgPickMs as number) || 0) / 60000),
      avgPackMinutes: Math.round(((dur.avgPackMs as number) || 0) / 60000),
      avgTotalMinutes: Math.round(((dur.avgTotalMs as number) || 0) / 60000),
      completedWithDuration: dur.count,
    };
  },

  /**
   * E3 — Fulfillment SLA breaches (jobs open > threshold hours).
   */
  async slaBreaches(filters: ReportFilters, thresholdHours = 24) {
    const match = buildMatch(filters);
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    return FulfillmentJob.aggregate([
      {
        $match: {
          ...match,
          status: { $in: ['created', 'picking', 'packing'] },
          createdAt: { $lt: cutoff },
        },
      },
      {
        $project: {
          _id: 0,
          fulfillmentJobId: 1,
          orderId: 1,
          tenantId: 1,
          status: 1,
          priority: 1,
          assignedTo: 1,
          createdAt: 1,
          ageHours: {
            $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 3600000],
          },
        },
      },
      { $sort: { createdAt: 1 } },
      { $limit: filters.limit || 100 },
    ]);
  },

  /**
   * E4 — Fulfillment by staff.
   */
  async byStaff(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return FulfillmentJob.aggregate([
      { $match: { ...match, assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          totalJobs: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'handed_to_shipping'] }, 1, 0] },
          },
          shortPicks: {
            $sum: { $cond: [{ $eq: ['$status', 'short_pick'] }, 1, 0] },
          },
        },
      },
      { $sort: { completed: -1 } },
      { $limit: filters.limit || 50 },
    ]);
  },

  /**
   * E5 — Fulfillment trend.
   */
  async trend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return FulfillmentJob.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr('createdAt', groupBy),
          created: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'handed_to_shipping'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },
};
