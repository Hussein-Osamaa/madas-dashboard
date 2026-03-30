/**
 * Fulfillment background jobs.
 *
 * Checks for overdue fulfillment jobs that have exceeded their SLA threshold.
 */

import { FulfillmentJob } from './fulfillment-job.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('fulfillment-jobs');

/** SLA thresholds in milliseconds by priority. */
const SLA_THRESHOLDS_MS: Record<string, number> = {
  normal: 4 * 60 * 60 * 1000,  // 4 hours
  high: 2 * 60 * 60 * 1000,    // 2 hours
  urgent: 1 * 60 * 60 * 1000,  // 1 hour
};

/**
 * Find jobs that have been in active states (created, picking, packing)
 * for longer than their SLA threshold. Logs warnings for each.
 *
 * @returns The count of overdue jobs found.
 */
export async function checkOverdueJobs(): Promise<number> {
  const now = Date.now();
  let overdueCount = 0;

  for (const [priority, thresholdMs] of Object.entries(SLA_THRESHOLDS_MS)) {
    const cutoff = new Date(now - thresholdMs);

    const overdueJobs = await FulfillmentJob.find({
      status: { $in: ['created', 'picking', 'packing'] },
      priority,
      createdAt: { $lt: cutoff },
    })
      .select('fulfillmentJobId orderId tenantId status priority createdAt')
      .lean();

    for (const job of overdueJobs) {
      const ageMinutes = Math.round((now - new Date(job.createdAt).getTime()) / 60000);
      log.warn('Overdue fulfillment job detected', {
        fulfillmentJobId: job.fulfillmentJobId,
        orderId: job.orderId,
        tenantId: job.tenantId,
        status: job.status,
        priority: job.priority,
        ageMinutes: String(ageMinutes),
      });
    }

    overdueCount += overdueJobs.length;
  }

  if (overdueCount > 0) {
    log.warn(`Total overdue fulfillment jobs: ${overdueCount}`);
  }

  return overdueCount;
}
