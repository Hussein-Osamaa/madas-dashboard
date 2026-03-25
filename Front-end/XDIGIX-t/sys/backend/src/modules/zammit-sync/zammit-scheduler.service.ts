/**
 * Cron-based scheduler for Zammit order sync.
 * Runs a master check every 5 minutes. For each enabled integration whose
 * interval has elapsed, triggers a sync. Follows the pattern of reportCron.ts.
 *
 * Concurrency: processes integrations sequentially to avoid overwhelming Zammit.
 * Each sync is wrapped in try/catch so one business failure does not block others.
 */

import cron from 'node-cron';
import { ZammitIntegration } from '../../schemas/zammit-integration.schema';
import { syncZammitOrders } from './zammit-sync.service';
import { logger } from '../../utils/logger';

let isRunning = false;

/**
 * Start the Zammit sync cron job. Call once from index.ts after DB connect.
 */
export function startZammitSyncCron(): void {
  // Master tick every 5 minutes
  cron.schedule(
    '*/5 * * * *',
    async () => {
      if (isRunning) {
        logger.debug('Zammit scheduler: previous tick still running, skipping');
        return;
      }

      isRunning = true;
      try {
        await runScheduledSyncs();
      } catch (err) {
        logger.error('Zammit scheduler: unexpected error', {
          error: (err as Error).message,
        });
      } finally {
        isRunning = false;
      }
    },
    { timezone: 'UTC' }
  );

  logger.info('Zammit scheduler: started (every 5 min)');
}

/**
 * Find all integrations due for sync and run them sequentially.
 */
async function runScheduledSyncs(): Promise<void> {
  const now = new Date();

  // Find enabled integrations that are either:
  // - Never synced (lastSyncAt is null), or
  // - Last synced more than syncIntervalMinutes ago
  // - Not currently running
  const integrations = await ZammitIntegration.find({
    enabled: true,
    lastSyncStatus: { $ne: 'running' },
  }).lean();

  const due = integrations.filter((integration) => {
    if (!integration.lastSyncAt) return true; // Never synced
    const intervalMs = (integration.syncIntervalMinutes || 15) * 60 * 1000;
    const nextSyncAt = new Date(integration.lastSyncAt.getTime() + intervalMs);
    return now >= nextSyncAt;
  });

  if (due.length === 0) return;

  logger.info('Zammit scheduler: processing due integrations', {
    count: String(due.length),
  });

  for (const integration of due) {
    try {
      // Re-fetch the full document (lean() returns plain object, we need the full doc for the sync)
      const fullDoc = await ZammitIntegration.findOne({ businessId: integration.businessId });
      if (!fullDoc || !fullDoc.enabled) continue;

      await syncZammitOrders(fullDoc);
    } catch (err) {
      logger.error('Zammit scheduler: sync failed for business', {
        businessId: integration.businessId,
        error: (err as Error).message,
      });
    }
  }
}
