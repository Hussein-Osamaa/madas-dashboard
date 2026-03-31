/**
 * Tenant / SaaS reports — read-only aggregations over Tenant, AuditLog.
 */

import { Tenant } from '../platform-core/tenant.schema';
import { AuditLog } from '../platform-core/audit.schema';
import {
  ReportFilters,
  dateGroupExpr,
  defaultDateRange,
} from './report-helpers';

export const tenantReports = {
  /**
   * H1 — Tenant growth summary.
   */
  async summary(filters: ReportFilters) {
    const [statusCounts, planCounts, growth] = await Promise.all([
      Tenant.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Tenant.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // New tenants in date range
      (() => {
        const dr = filters.dateRange || defaultDateRange();
        return Tenant.aggregate([
          { $match: { createdAt: { $gte: dr.from, $lte: dr.to } } },
          {
            $group: {
              _id: dateGroupExpr('createdAt', filters.groupBy || 'day'),
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
        ]);
      })(),
    ]);

    const byStatus = Object.fromEntries(
      statusCounts.map((r: Record<string, unknown>) => [r._id, r.count]),
    );
    const total = Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0);

    return {
      totalTenants: total,
      active: byStatus.active || 0,
      suspended: byStatus.suspended || 0,
      cancelled: byStatus.cancelled || 0,
      byPlan: planCounts.map((r: Record<string, unknown>) => ({
        plan: r._id,
        count: r.count,
      })),
      growthTrend: growth,
    };
  },

  /**
   * H2 — Grace period report.
   */
  async graceReport() {
    return Tenant.aggregate([
      { $match: { planActivation: 'grace' } },
      {
        $project: {
          _id: 0,
          tenantId: 1,
          plan: 1,
          graceExpiresAt: 1,
          graceReason: 1,
          graceApprovedBy: 1,
          graceApprovedAt: 1,
          daysRemaining: {
            $cond: {
              if: { $gt: ['$graceExpiresAt', '$$NOW'] },
              then: {
                $ceil: {
                  $divide: [{ $subtract: ['$graceExpiresAt', '$$NOW'] }, 86400000],
                },
              },
              else: 0,
            },
          },
        },
      },
      { $sort: { graceExpiresAt: 1 } },
    ]);
  },

  /**
   * H3 — Churn report (cancelled tenants over time).
   */
  async churn(filters: ReportFilters) {
    const dr = filters.dateRange || defaultDateRange();
    const groupBy = filters.groupBy || 'month';

    // Use audit log for cancellation events (more accurate timestamps)
    return AuditLog.aggregate([
      {
        $match: {
          action: 'tenant_cancelled',
          module: 'tenant',
          timestamp: { $gte: dr.from, $lte: dr.to },
        },
      },
      {
        $group: {
          _id: dateGroupExpr('timestamp', groupBy),
          churned: { $sum: 1 },
          tenantIds: { $push: '$entityId' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);
  },

  /**
   * H4 — Plan change report (upgrades/downgrades).
   */
  async planChanges(filters: ReportFilters) {
    const dr = filters.dateRange || defaultDateRange();
    return AuditLog.aggregate([
      {
        $match: {
          action: 'plan_changed',
          module: 'tenant',
          timestamp: { $gte: dr.from, $lte: dr.to },
        },
      },
      {
        $project: {
          _id: 0,
          tenantId: '$entityId',
          previousPlan: '$details.previousPlan',
          newPlan: '$details.newPlan',
          actor: 1,
          timestamp: 1,
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: filters.limit || 100 },
    ]);
  },

  /**
   * H5 — Plan distribution summary.
   */
  async planDistribution() {
    return Tenant.aggregate([
      {
        $group: {
          _id: { plan: '$plan', activation: '$planActivation' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  },
};
