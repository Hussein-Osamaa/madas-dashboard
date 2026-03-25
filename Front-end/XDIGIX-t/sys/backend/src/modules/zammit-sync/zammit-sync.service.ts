/**
 * Main orchestrator for Zammit order sync.
 * Per-business flow: decrypt creds → login → fetch new orders → map → create in XDIGIX → update state.
 *
 * Orders are created directly via addDocument() (same path as external.routes.ts).
 * ORDER_CREATED events are NOT emitted — Zammit products are not in the XDIGIX catalog,
 * so stock reservation is irrelevant.
 */

import { ZammitIntegration, type IZammitIntegration } from '../../schemas/zammit-integration.schema';
import { addDocument } from '../../services/firestore.service';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { ZammitApiClient } from './zammit-api-client';
import { mapZammitPurchaseToOrder } from './zammit-order-mapper';
import type { SyncResult } from './types';

/** Maximum number of sync log entries to keep per integration */
const MAX_SYNC_LOGS = 50;

/** Maximum syncedOrderIds to keep (trim oldest beyond this). */
const MAX_SYNCED_IDS = 10_000;

/**
 * Run a full sync for a single business integration.
 * Designed to be safe: catches all errors internally and updates the DB status.
 */
export async function syncZammitOrders(
  integration: IZammitIntegration
): Promise<SyncResult> {
  const startTime = Date.now();
  const { businessId, tenantId } = integration;
  const logMeta = { tenantId, businessId };

  logger.info('Zammit sync: starting', logMeta);

  // Mark as running (with atomic check to prevent double-runs)
  const lockResult = await ZammitIntegration.findOneAndUpdate(
    { businessId, lastSyncStatus: { $ne: 'running' } },
    { $set: { lastSyncStatus: 'running', lastSyncError: '' } },
    { new: true }
  );

  if (!lockResult) {
    logger.warn('Zammit sync: already running, skipping', logMeta);
    return { success: false, newOrdersCount: 0, skippedCount: 0, errors: ['Sync already running'], durationMs: 0 };
  }

  try {
    // 1. Decrypt credentials
    const email = decrypt(integration.zammitEmail);
    const password = decrypt(integration.zammitPassword);

    // 2. Login to Zammit API
    const client = new ZammitApiClient(email, password);
    await client.login();

    // 3. Fetch new orders (not yet synced)
    const syncedSet = new Set(integration.syncedOrderIds || []);
    const newPurchases = await client.fetchNewPurchases(syncedSet);

    if (newPurchases.length === 0) {
      logger.info('Zammit sync: no new orders', logMeta);
      await updateSyncState(businessId, {
        status: 'success',
        orderCount: 0,
        durationMs: Date.now() - startTime,
      });
      return { success: true, newOrdersCount: 0, skippedCount: 0, errors: [], durationMs: Date.now() - startTime };
    }

    // 4. Map and create orders in XDIGIX
    const errors: string[] = [];
    const newSyncedIds: string[] = [];
    let created = 0;

    for (const purchase of newPurchases) {
      const purchaseId = String(purchase.id);
      try {
        const orderData = mapZammitPurchaseToOrder(purchase);
        await addDocument(`businesses/${businessId}/orders`, orderData, tenantId);
        newSyncedIds.push(purchaseId);
        created++;
        logger.debug('Zammit sync: order created', { ...logMeta, zammitId: purchaseId });
      } catch (err) {
        const msg = `Failed to create order #${purchaseId}: ${(err as Error).message}`;
        errors.push(msg);
        logger.error('Zammit sync: order creation failed', { ...logMeta, zammitId: purchaseId, error: msg });
        // Mark as synced anyway to avoid infinite retries on permanently broken orders
        newSyncedIds.push(purchaseId);
      }
    }

    // 5. Update integration state
    const durationMs = Date.now() - startTime;
    await updateSyncState(businessId, {
      status: errors.length > 0 && created === 0 ? 'error' : 'success',
      orderCount: created,
      durationMs,
      error: errors.join('; '),
      newSyncedIds,
    });

    logger.info('Zammit sync: complete', {
      ...logMeta,
      created: String(created),
      errors: String(errors.length),
      durationMs: String(durationMs),
    });

    return { success: true, newOrdersCount: created, skippedCount: errors.length, errors, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = (err as Error).message;
    logger.error('Zammit sync: fatal error', { ...logMeta, error: errorMsg });

    await updateSyncState(businessId, {
      status: 'error',
      orderCount: 0,
      durationMs,
      error: errorMsg,
    });

    return { success: false, newOrdersCount: 0, skippedCount: 0, errors: [errorMsg], durationMs };
  }
}

// ── Internal Helpers ──────────────────────────────────────────────

interface UpdateStateInput {
  status: 'success' | 'error';
  orderCount: number;
  durationMs: number;
  error?: string;
  newSyncedIds?: string[];
}

async function updateSyncState(businessId: string, input: UpdateStateInput): Promise<void> {
  const now = new Date();
  const logEntry = {
    timestamp: now,
    status: input.status,
    orderCount: input.orderCount,
    error: input.error,
    durationMs: input.durationMs,
  };

  const update: Record<string, unknown> = {
    $set: {
      lastSyncAt: now,
      lastSyncStatus: input.status,
      lastSyncError: input.error || '',
      lastSyncOrderCount: input.orderCount,
    },
    $push: {
      syncLogs: {
        $each: [logEntry],
        $slice: -MAX_SYNC_LOGS, // Keep only the most recent entries
      },
    },
  };

  // Append new synced IDs if any
  if (input.newSyncedIds && input.newSyncedIds.length > 0) {
    update.$push = {
      ...update.$push as Record<string, unknown>,
      syncedOrderIds: {
        $each: input.newSyncedIds,
        $slice: -MAX_SYNCED_IDS, // Trim oldest to prevent unbounded growth
      },
    };
  }

  await ZammitIntegration.updateOne({ businessId }, update);
}
