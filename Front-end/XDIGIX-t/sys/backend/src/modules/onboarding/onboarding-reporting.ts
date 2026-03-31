/**
 * Onboarding reporting — funnel metrics and operational visibility.
 *
 * Persistent metrics derived from audit log + onboarding_progress collection.
 * In-memory counters supplement with since-restart view.
 */
import mongoose from 'mongoose';
import { OnboardingProgress, ONBOARDING_STATUSES } from './onboarding-progress.schema';
import { onboardingMetrics } from './onboarding-metrics';

export const onboardingReporting = {

  /**
   * Funnel summary — counts by status + derived metrics.
   */
  async funnelSummary(): Promise<{
    byStatus: Record<string, number>;
    total: number;
    completedCount: number;
    abandonedCount: number;
    completionRate: number;
    inProgress: number;
  }> {
    const statusCounts = await OnboardingProgress.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const s of statusCounts) {
      byStatus[s._id as string] = s.count as number;
      total += s.count as number;
    }

    const completedCount = byStatus.completed || 0;
    const abandonedCount = byStatus.abandoned || 0;
    const terminalCount = completedCount + abandonedCount + (byStatus.suspended || 0);
    const inProgress = total - terminalCount;

    return {
      byStatus,
      total,
      completedCount,
      abandonedCount,
      completionRate: total > 0 ? Math.round((completedCount / total) * 10000) / 100 : 0,
      inProgress,
    };
  },

  /**
   * Funnel by plan — how many onboardings per selected plan.
   */
  async funnelByPlan(): Promise<Array<{ plan: string; count: number; completed: number }>> {
    return OnboardingProgress.aggregate([
      { $group: {
        _id: '$planIntent',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      }},
      { $sort: { count: -1 } },
    ]).then(results => results.map((r: Record<string, unknown>) => ({
      plan: (r._id as string) || 'none',
      count: r.count as number,
      completed: r.completed as number,
    })));
  },

  /**
   * Operational lists.
   */
  async abandonedList(limit = 50): Promise<unknown[]> {
    return OnboardingProgress.find({ status: 'abandoned' })
      .sort({ abandonedAt: -1 }).limit(limit)
      .select('onboardingId userId planIntent completedSteps abandonedAt createdAt').lean();
  },

  async paymentPendingList(limit = 50): Promise<unknown[]> {
    return OnboardingProgress.find({ status: 'payment_pending' })
      .sort({ updatedAt: -1 }).limit(limit)
      .select('onboardingId userId tenantId planIntent failedStep failureReason updatedAt').lean();
  },

  async trialActiveList(limit = 50): Promise<unknown[]> {
    return OnboardingProgress.find({ status: 'trial_active' })
      .sort({ trialEndsAt: 1 }).limit(limit)
      .select('onboardingId userId tenantId planIntent trialEndsAt createdAt').lean();
  },

  /**
   * Live in-memory metrics (since restart).
   */
  liveMetrics() {
    return onboardingMetrics.getAll();
  },

  /**
   * Persistent metrics — derived from audit log. Survives restart.
   * Counts onboarding-related audit actions across all time.
   */
  async persistentMetrics(): Promise<Record<string, number>> {
    const AuditLog = mongoose.models.AuditLog;
    if (!AuditLog) return {};

    const results = await AuditLog.aggregate([
      { $match: { module: 'onboarding' } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]);

    const metrics: Record<string, number> = {};
    for (const r of results) {
      metrics[r._id as string] = r.count as number;
    }
    return metrics;
  },

  /**
   * Combined metrics: persistent (from audit) + live (since restart).
   */
  async combinedMetrics(): Promise<{
    persistent: Record<string, number>;
    sinceRestart: Record<string, number>;
  }> {
    const persistent = await this.persistentMetrics();
    const sinceRestart = onboardingMetrics.getAll();
    return { persistent, sinceRestart };
  },
};
