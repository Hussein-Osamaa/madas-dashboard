/**
 * Inventory Service - Transaction-based stock calculation.
 * Inventory = sum of transactions. No direct stock editing.
 */
import { StockTransaction, type StockTransactionType } from '../schemas/warehouse';
import mongoose from 'mongoose';

// Simple in-memory cache (Redis-ready structure)
const cache = new Map<string, { value: number; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function cacheKey(prefix: string, productId: string, clientId: string): string {
  return `${prefix}:${clientId}:${productId}`;
}

function getCached(key: string): number | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.value;
}

function setCache(key: string, value: number): void {
  cache.set(key, { value, ts: Date.now() });
}

function invalidateProduct(clientId: string, productId: string): void {
  for (const k of cache.keys()) {
    if (k.includes(clientId) && k.includes(productId)) cache.delete(k);
  }
}

/**
 * Available stock = INBOUND + RETURNED - SOLD - DAMAGED - MISSING - RESERVED
 * (RESERVED reduces available; SHIPPING is in-transit, treated as reserved until SOLD)
 */
export async function getProductAvailableStock(
  productId: string,
  clientId: string
): Promise<number> {
  const key = cacheKey('avail', productId, clientId);
  const cached = getCached(key);
  if (cached !== null) return cached;

  const adds: StockTransactionType[] = ['INBOUND', 'RETURNED'];
  const subs: StockTransactionType[] = ['SOLD', 'DAMAGED', 'MISSING', 'RESERVED', 'SHIPPING'];

  const pipeline = [
    { $match: { clientId, productId } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ];

  const results = await StockTransaction.aggregate(pipeline);

  let available = 0;
  for (const r of results) {
    if (adds.includes(r._id)) available += r.total;
    if (subs.includes(r._id)) available -= r.total;
  }

  setCache(key, available);
  return Math.max(0, available);
}

/**
 * Warehouse quantity = physical stock in warehouse
 * = INBOUND + RETURNED - SOLD - DAMAGED - MISSING
 * (Excludes RESERVED from "available" but RESERVED is still in warehouse; SHIPPING is out)
 * Physical = INBOUND + RETURNED - SOLD - DAMAGED - MISSING - SHIPPING
 */
export async function getWarehouseQuantity(
  productId: string,
  clientId: string
): Promise<number> {
  const key = cacheKey('warehouse', productId, clientId);
  const cached = getCached(key);
  if (cached !== null) return cached;

  const adds: StockTransactionType[] = ['INBOUND', 'RETURNED'];
  const subs: StockTransactionType[] = ['SOLD', 'DAMAGED', 'MISSING', 'SHIPPING'];

  const pipeline = [
    { $match: { clientId, productId } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ];

  const results = await StockTransaction.aggregate(pipeline);

  let qty = 0;
  for (const r of results) {
    if (adds.includes(r._id)) qty += r.total;
    if (subs.includes(r._id)) qty -= r.total;
  }

  const result = Math.max(0, qty);
  setCache(key, result);
  return result;
}

/**
 * Create a stock transaction. Invalidates cache for product.
 */
export async function createStockTransaction(
  clientId: string,
  productId: string,
  type: StockTransactionType,
  quantity: number,
  opts?: { orderId?: string; auditSessionId?: string; reference?: string; metadata?: Record<string, unknown> }
): Promise<mongoose.Types.ObjectId> {
  const doc = await StockTransaction.create({
    clientId,
    productId,
    type,
    quantity,
    orderId: opts?.orderId,
    auditSessionId: opts?.auditSessionId,
    reference: opts?.reference,
    metadata: opts?.metadata,
  });
  invalidateProduct(clientId, productId);
  return doc._id;
}
