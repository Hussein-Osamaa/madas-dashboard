/**
 * Main orchestrator for Zammit order sync.
 *
 * Product Matching:
 * - Loads BOTH own products AND linked inventory (XDF) products.
 * - Uses EXACT name matching (not substring) to prevent wrong matches.
 * - Emits ORDER_CREATED for matched products → reserves stock.
 *
 * Customer Handling:
 * - Customer data stored inline on order (customerName, customerContact, etc.).
 * - Checks existing customers by phone to prevent duplicate customer records.
 * - If customer exists, links to existing record; otherwise creates one.
 */

import { ZammitIntegration, type IZammitIntegration } from '../../schemas/zammit-integration.schema';
import { addDocument } from '../../services/firestore.service';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { ZammitApiClient } from './zammit-api-client';
import { mapZammitPurchaseToOrder, type XdigixProduct } from './zammit-order-mapper';
import { orderEvents, ORDER_CREATED } from '../../events/orderEvents';
import type { SyncResult, ZammitPurchase } from './types';

const MAX_SYNC_LOGS = 50;
const MAX_SYNCED_IDS = 10_000;

// ── Product Catalog Loading ───────────────────────────────────────

/**
 * Load products from a single business.
 */
async function loadBusinessProducts(businessId: string): Promise<XdigixProduct[]> {
  const { FirestoreDoc } = await import('../../schemas/document.schema');

  const docs = await FirestoreDoc.find(
    { businessId, coll: 'products', 'data.deleted': { $ne: true } },
    {
      docId: 1,
      'data.name': 1,
      'data.sku': 1,
      'data.barcode': 1,
      'data.price': 1,
      'data.sellingPrice': 1,
      'data.images': 1,
      'data.stock': 1,
      'data.reservedStock': 1,
      'data.sizeBarcodes': 1,
    },
  ).lean();

  return docs.map((doc: Record<string, unknown>) => {
    const data = (doc as { data?: Record<string, unknown> }).data ?? {};
    return {
      docId: (doc as { docId: string }).docId,
      name: (data.name as string) || '',
      sku: (data.sku as string) || undefined,
      barcode: (data.barcode as string) || undefined,
      price: (data.price as number) || 0,
      sellingPrice: (data.sellingPrice as number) || undefined,
      images: (data.images as string[]) || [],
      stock: (data.stock as Record<string, number>) || {},
      reservedStock: (data.reservedStock as Record<string, number>) || {},
      sizeBarcodes: (data.sizeBarcodes as Record<string, string>) || undefined,
      businessId,
    };
  });
}

/**
 * Load full product catalog: own products + linked inventory (XDF).
 * Linked businesses are found from the Business document's linkedBusinessIds field.
 */
async function loadFullCatalog(businessId: string): Promise<XdigixProduct[]> {
  const { Business } = await import('../../schemas/business.schema');

  // Load own products
  const ownProducts = await loadBusinessProducts(businessId);

  // Find linked businesses (XDF fulfillment partners)
  const business = await Business.findOne(
    { businessId },
    { linkedBusinessIds: 1 }
  ).lean() as { linkedBusinessIds?: string[] } | null;

  const linkedIds = business?.linkedBusinessIds || [];
  if (linkedIds.length === 0) {
    return ownProducts;
  }

  // Load products from each linked business
  const linkedProducts: XdigixProduct[] = [];
  for (const linkedBizId of linkedIds) {
    const products = await loadBusinessProducts(linkedBizId);
    linkedProducts.push(...products);
  }

  logger.info('Zammit sync: loaded catalog', {
    businessId,
    ownProducts: String(ownProducts.length),
    linkedProducts: String(linkedProducts.length),
    linkedBusinesses: linkedIds.join(', '),
  });

  // Own products first (priority), then linked
  return [...ownProducts, ...linkedProducts];
}

// ── Customer Deduplication ────────────────────────────────────────

/**
 * Normalize a phone number for comparison.
 * Strips all non-digit characters, handles Egyptian country code.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Remove leading country codes: +20, 0020, 20 for Egyptian numbers
  if (digits.startsWith('20') && digits.length > 10) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('0020')) {
    return '0' + digits.slice(4);
  }
  // Ensure starts with 0 for Egyptian mobile
  if (digits.length === 10 && !digits.startsWith('0')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Check if a customer with this phone already exists in the business.
 * Returns the existing customer's docId if found.
 */
async function findExistingCustomer(
  businessId: string,
  phone: string
): Promise<{ docId: string; data: Record<string, unknown> } | null> {
  if (!phone) return null;

  const { FirestoreDoc } = await import('../../schemas/document.schema');
  const normalizedPhone = normalizePhone(phone);

  // Search customers collection for matching phone
  const customers = await FirestoreDoc.find(
    { businessId, coll: 'customers' },
    { docId: 1, 'data.phone': 1, 'data.name': 1, 'data.email': 1 },
  ).lean();

  for (const cust of customers) {
    const data = (cust as { data?: Record<string, unknown> }).data ?? {};
    const custPhone = normalizePhone(String(data.phone || ''));
    if (custPhone && custPhone === normalizedPhone) {
      return {
        docId: (cust as { docId: string }).docId,
        data,
      };
    }
    // Also check if one ends with the other (handles +20 prefix variations)
    if (custPhone && normalizedPhone && (custPhone.endsWith(normalizedPhone.slice(-10)) || normalizedPhone.endsWith(custPhone.slice(-10)))) {
      return {
        docId: (cust as { docId: string }).docId,
        data,
      };
    }
  }

  return null;
}

/**
 * Create a customer record if one doesn't exist for this phone number.
 * Returns the customer docId.
 */
async function ensureCustomer(
  businessId: string,
  tenantId: string,
  purchase: ZammitPurchase
): Promise<string | null> {
  const customer = purchase.customer;
  const address = purchase.address;
  const phone = customer?.phoneNumber || address?.phoneNumber || '';
  if (!phone) return null;

  // Check for existing customer by phone
  const existing = await findExistingCustomer(businessId, phone);
  if (existing) {
    logger.debug('Zammit sync: customer already exists', {
      businessId,
      phone,
      existingDocId: existing.docId,
    });
    return existing.docId;
  }

  // Create new customer record
  try {
    const customerData: Record<string, unknown> = {
      name: customer?.name || address?.name || '',
      phone,
      email: customer?.email || '',
      status: 'active',
      orderCount: 1,
      totalSpent: purchase.total || 0,
      lastOrder: new Date(),
      addressDetails: address
        ? {
            line: address.addressLine1 || '',
            governorate: address.city || '',
            neighborhood: address.region || '',
            district: address.district || '',
            building: address.building || '',
            floor: address.floor || '',
            apartment: address.apartment || '',
          }
        : undefined,
      source: 'zammit',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await addDocument(
      `businesses/${businessId}/customers`,
      customerData,
      tenantId
    );

    logger.debug('Zammit sync: customer created', {
      businessId,
      phone,
      customerId: result.id,
    });

    return result.id;
  } catch (err) {
    logger.warn('Zammit sync: customer creation failed (non-fatal)', {
      businessId,
      phone,
      error: (err as Error).message,
    });
    return null;
  }
}

// ── Main Sync ─────────────────────────────────────────────────────

export async function syncZammitOrders(
  integration: IZammitIntegration
): Promise<SyncResult> {
  const startTime = Date.now();
  const { businessId, tenantId } = integration;
  const logMeta = { tenantId, businessId };

  logger.info('Zammit sync: starting', logMeta);

  // Atomic lock
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

    // 3. Load FULL product catalog (own + linked inventory)
    const catalog = await loadFullCatalog(businessId);
    logger.info('Zammit sync: catalog loaded', { ...logMeta, totalProducts: String(catalog.length) });

    // 4. Fetch new orders
    const syncedSet = new Set(integration.syncedOrderIds || []);
    const newPurchases = await client.fetchNewPurchases(syncedSet);

    if (newPurchases.length === 0) {
      logger.info('Zammit sync: no new orders', logMeta);
      await updateSyncState(businessId, { status: 'success', orderCount: 0, durationMs: Date.now() - startTime });
      return { success: true, newOrdersCount: 0, skippedCount: 0, errors: [], durationMs: Date.now() - startTime };
    }

    // 5. Map and create orders
    const errors: string[] = [];
    const newSyncedIds: string[] = [];
    let created = 0;

    // Pre-load existing zammit order IDs to prevent duplicates after a sync reset
    const { FirestoreDoc } = await import('../../schemas/document.schema');
    const existingZammitOrders = await FirestoreDoc.find(
      { businessId, coll: 'orders', 'data.zammitPurchaseId': { $exists: true } },
      { 'data.zammitPurchaseId': 1 },
    ).lean();
    const existingZammitIds = new Set(
      existingZammitOrders.map((d: Record<string, unknown>) => String(((d as { data?: Record<string, unknown> }).data?.zammitPurchaseId) || ''))
    );

    for (const purchase of newPurchases) {
      const purchaseId = String(purchase.id);

      // Skip if this Zammit order already exists in the dashboard (prevents duplicates after reset)
      if (existingZammitIds.has(purchaseId)) {
        newSyncedIds.push(purchaseId);
        logger.debug('Zammit sync: order already exists in dashboard, skipping', { ...logMeta, zammitId: purchaseId });
        continue;
      }

      try {
        // Match products
        const { orderData, matchedItems } = mapZammitPurchaseToOrder(purchase, catalog);

        // Create the order FIRST — customer handling must never block this
        const result = await addDocument(`businesses/${businessId}/orders`, orderData, tenantId);

        // Then handle customer dedup (non-blocking — errors here don't affect the order)
        try {
          await ensureCustomer(businessId, tenantId, purchase);
        } catch (custErr) {
          logger.warn('Zammit sync: customer handling failed (order still created)', {
            ...logMeta, zammitId: purchaseId, error: (custErr as Error).message,
          });
        }

        // Reserve stock for matched products
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
        }

        newSyncedIds.push(purchaseId);
        created++;

        logger.debug('Zammit sync: order created', {
          ...logMeta,
          zammitId: purchaseId,
          orderId: result.id,
          matched: String(matchedItems.filter((i) => i.matched).length),
          unmatched: String(matchedItems.filter((i) => !i.matched).length),
        });
      } catch (err) {
        const msg = `Failed to create order #${purchaseId}: ${(err as Error).message}`;
        errors.push(msg);
        logger.error('Zammit sync: order creation failed', { ...logMeta, zammitId: purchaseId, error: msg });
        // Don't add to syncedIds — failed orders should be retried on next sync
      }
    }

    // 6. Update state
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
    await updateSyncState(businessId, { status: 'error', orderCount: 0, durationMs, error: errorMsg });
    return { success: false, newOrdersCount: 0, skippedCount: 0, errors: [errorMsg], durationMs };
  }
}

// ── State Management ──────────────────────────────────────────────

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
      syncLogs: { $each: [logEntry], $slice: -MAX_SYNC_LOGS },
    },
  };

  if (input.newSyncedIds && input.newSyncedIds.length > 0) {
    update.$push = {
      ...update.$push as Record<string, unknown>,
      syncedOrderIds: { $each: input.newSyncedIds, $slice: -MAX_SYNCED_IDS },
    };
  }

  await ZammitIntegration.updateOne({ businessId }, update);
}
