/**
 * Main orchestrator for Zammit order sync.
 * Per-business flow: decrypt creds → login → load XDIGIX catalog → fetch new orders → match products → create orders → reserve stock.
 *
 * Product Matching:
 * - Before mapping, loads all products from the business's XDIGIX catalog.
 * - Each Zammit line item is matched by name (fuzzy) + size to find the real productId.
 * - If matched: ORDER_CREATED event is emitted → triggers stock reservation (reservedStock).
 * - If unmatched: product shows as "Unknown Product" — no stock impact.
 */

import { ZammitIntegration, type IZammitIntegration } from '../../schemas/zammit-integration.schema';
import { addDocument } from '../../services/firestore.service';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { ZammitApiClient } from './zammit-api-client';
import { mapZammitPurchaseToOrder, type XdigixProduct } from './zammit-order-mapper';
import { orderEvents, ORDER_CREATED } from '../../events/orderEvents';
import type { SyncResult } from './types';

/** Maximum number of sync log entries to keep per integration */
const MAX_SYNC_LOGS = 50;

/** Maximum syncedOrderIds to keep (trim oldest beyond this). */
const MAX_SYNCED_IDS = 10_000;

/**
 * Load all products from this business's XDIGIX catalog.
 * Returns a simplified array for name-matching.
 */
async function loadProductCatalog(businessId: string): Promise<XdigixProduct[]> {
  const { FirestoreDoc } = await import('../../schemas/document.schema');

  const docs = await FirestoreDoc.find(
    { businessId, coll: 'products', 'data.deleted': { $ne: true } },
    { docId: 1, 'data.name': 1, 'data.price': 1, 'data.sellingPrice': 1, 'data.images': 1, 'data.stock': 1, 'data.reservedStock': 1 },
  ).lean();

  return docs.map((doc: Record<string, unknown>) => {
    const data = (doc as { data?: Record<string, unknown> }).data ?? {};
    return {
      docId: (doc as { docId: string }).docId,
      name: (data.name as string) || '',
      price: (data.price as number) || 0,
      sellingPrice: (data.sellingPrice as number) || undefined,
      images: (data.images as string[]) || [],
      stock: (data.stock as Record<string, number>) || {},
      reservedStock: (data.reservedStock as Record<string, number>) || {},
    };
  });
}

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

    // 3. Load XDIGIX product catalog for matching
    const catalog = await loadProductCatalog(businessId);
    logger.info('Zammit sync: loaded product catalog', { ...logMeta, productCount: String(catalog.length) });

    // 4. Fetch new orders (not yet synced)
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

    // 5. Map and create orders in XDIGIX
    const errors: string[] = [];
    const newSyncedIds: string[] = [];
    let created = 0;

    for (const purchase of newPurchases) {
      const purchaseId = String(purchase.id);
      try {
        // Map with product matching
        const { orderData, matchedItems } = mapZammitPurchaseToOrder(purchase, catalog);

        // Create the order
        const result = await addDocument(`businesses/${businessId}/orders`, orderData, tenantId);

        // Emit ORDER_CREATED for matched products so stock gets reserved
        const matchedOrderItems = matchedItems
          .filter((item) => item.matched && item.productId)
          .map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size || undefined,
          }));

        if (matchedOrderItems.length > 0) {
          orderEvents.emit(ORDER_CREATED, {
            clientId: businessId,
            orderId: result.id,
            items: matchedOrderItems,
          });
          logger.debug('Zammit sync: stock reservation emitted', {
            ...logMeta,
            zammitId: purchaseId,
            matchedCount: String(matchedOrderItems.length),
          });
        }

        newSyncedIds.push(purchaseId);
        created++;

        const unmatchedCount = matchedItems.filter((i) => !i.matched).length;
        logger.debug('Zammit sync: order created', {
          ...logMeta,
          zammitId: purchaseId,
          orderId: result.id,
          matchedProducts: String(matchedItems.filter((i) => i.matched).length),
          unmatchedProducts: String(unmatchedCount),
        });
      } catch (err) {
        const msg = `Failed to create order #${purchaseId}: ${(err as Error).message}`;
        errors.push(msg);
        logger.error('Zammit sync: order creation failed', { ...logMeta, zammitId: purchaseId, error: msg });
        // Mark as synced anyway to avoid infinite retries
        newSyncedIds.push(purchaseId);
      }
    }

    // 6. Update integration state
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
        $slice: -MAX_SYNC_LOGS,
      },
    },
  };

  if (input.newSyncedIds && input.newSyncedIds.length > 0) {
    update.$push = {
      ...update.$push as Record<string, unknown>,
      syncedOrderIds: {
        $each: input.newSyncedIds,
        $slice: -MAX_SYNCED_IDS,
      },
    };
  }

  await ZammitIntegration.updateOne({ businessId }, update);
}
