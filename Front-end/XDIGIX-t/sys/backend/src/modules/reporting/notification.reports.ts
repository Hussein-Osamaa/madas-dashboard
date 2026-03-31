/**
 * Notification reports — read-only aggregations over NotificationLog.
 */

import { NotificationLog } from '../notifications/notification-log.schema';
import {
  ReportFilters,
  buildMatch,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const notificationReports = {
  /**
   * G1 — Notification summary.
   */
  async summary(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });

    const results = await NotificationLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAttempts: { $sum: '$attempts' },
        },
      },
    ]);

    const byStatus = Object.fromEntries(
      results.map((r: Record<string, unknown>) => [r._id, r]),
    );
    const total = results.reduce((a: number, r: Record<string, unknown>) => a + (r.count as number), 0);

    return {
      total,
      sent: (byStatus.sent as Record<string, number>)?.count || 0,
      failed: (byStatus.failed as Record<string, number>)?.count || 0,
      bounced: (byStatus.bounced as Record<string, number>)?.count || 0,
      skipped: (byStatus.skipped as Record<string, number>)?.count || 0,
      queued: (byStatus.queued as Record<string, number>)?.count || 0,
      retrying: (byStatus.retrying as Record<string, number>)?.count || 0,
      totalRetryAttempts: results.reduce(
        (a: number, r: Record<string, unknown>) => a + ((r.totalAttempts as number) || 0),
        0,
      ),
      byStatus: Object.fromEntries(
        results.map((r: Record<string, unknown>) => [r._id, r.count]),
      ),
    };
  },

  /**
   * G2 — Delivery success by channel.
   */
  async byChannel(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return NotificationLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { channel: '$channel', status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.channel',
          statuses: { $push: { status: '$_id.status', count: '$count' } },
          total: { $sum: '$count' },
        },
      },
      { $sort: { total: -1 } },
    ]);
  },

  /**
   * G3 — Notification trend.
   */
  async trend(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    const groupBy = filters.groupBy || 'day';
    return NotificationLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr('createdAt', groupBy),
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },

  /**
   * G4 — Failed notification details.
   */
  async failedDetails(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return NotificationLog.aggregate([
      { $match: { ...match, status: { $in: ['failed', 'bounced'] } } },
      {
        $project: {
          _id: 0,
          notificationId: 1,
          tenantId: 1,
          channel: 1,
          eventType: 1,
          recipient: 1,
          lastError: 1,
          attempts: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: filters.limit || 100 },
    ]);
  },

  /**
   * G5 — Template usage report.
   */
  async templateUsage(filters: ReportFilters) {
    const match = buildMatch({ ...filters, dateRange: filters.dateRange || defaultDateRange() });
    return NotificationLog.aggregate([
      { $match: { ...match, templateId: { $ne: null } } },
      {
        $group: {
          _id: { templateId: '$templateId', eventType: '$eventType' },
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'bounced']] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: filters.limit || 50 },
    ]);
  },
};
