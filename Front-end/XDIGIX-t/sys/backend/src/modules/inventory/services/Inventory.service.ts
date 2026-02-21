/**
 * InventoryService - ONLY place allowed to change stock.
 * Uses MongoDB transactions when connected to a replica set; otherwise runs without transactions (standalone).
 */
import mongoose from 'mongoose';
import { StockTransactionModel, type StockTransactionType } from '../models/StockTransaction.model';
import { WarehouseStockModel } from '../models/WarehouseStock.model';
import { StockTransactionRepository } from '../repositories/StockTransaction.repository';
import { toMonthString } from '../../../utils/month';
import { FirestoreDoc } from '../../../schemas/document.schema';
import type { ClientSession } from 'mongoose';

const txRepo = new StockTransactionRepository();

const ADDS: StockTransactionType[] = ['INBOUND', 'RETURNED', 'ADJUSTMENT'];
const SUBS: StockTransactionType[] = ['SOLD', 'DAMAGED', 'MISSING', 'RESERVED', 'SHIPPING'];

function computeDelta(type: StockTransactionType, quantity: number): number {
  if (ADDS.includes(type)) return quantity;
  if (SUBS.includes(type)) return -quantity;
  return 0; // AUDIT
}

function isReplicaSetTransactionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /transaction numbers are only allowed on a replica set member or mongos/i.test(msg) || /Transaction numbers are only allowed/i.test(msg);
}

/**
 * Core logic: create transaction doc and update warehouse stock. Optional session for replica-set transactions.
 */
async function recordTransactionWithSession(params: {
  productId: string;
  clientId: string;
  type: StockTransactionType;
  quantity: number;
  referenceId?: string;
  performedByStaffId?: string;
  month: string;
}, session: ClientSession | null): Promise<string> {
  const { productId, clientId, type, quantity, referenceId, performedByStaffId, month } = params;
  const opts = session ? { session } : {};

  const doc = await StockTransactionModel.create(
    [{ productId, clientId, type, quantity, referenceId, month, performedByStaffId }],
    opts
  );

  const current = await WarehouseStockModel.findOne({ productId, clientId })
    .session(session ?? undefined)
    .lean();
  const delta = computeDelta(type, quantity);
  const newAvailable = Math.max(0, (current?.availableQuantity ?? 0) + delta);

  await WarehouseStockModel.updateOne(
    { productId, clientId },
    {
      $set: {
        availableQuantity: newAvailable,
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true, ...opts }
  );

  return doc[0]._id.toString();
}

/**
 * Record a stock transaction. Validates product belongs to client.
 * Uses a MongoDB transaction when connected to a replica set; otherwise runs without a session (standalone).
 */
export async function recordTransaction(params: {
  productId: string;
  clientId: string;
  type: StockTransactionType;
  quantity: number;
  referenceId?: string;
  performedByStaffId?: string;
}): Promise<string> {
  const { productId, clientId, type, quantity, referenceId, performedByStaffId } = params;

  if (quantity < 0 || (type !== 'AUDIT' && quantity === 0)) {
    throw new Error('Quantity must be positive');
  }

  const product = await FirestoreDoc.findOne({
    businessId: clientId,
    coll: 'products',
    docId: productId,
  }).lean();

  if (!product) {
    throw new Error('Product not found or does not belong to client');
  }

  const month = toMonthString(new Date());

  // Try with transaction first (replica set / mongos)
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const id = await recordTransactionWithSession(
        { productId, clientId, type, quantity, referenceId, performedByStaffId, month },
        session
      );
      await session.commitTransaction();
      return id;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    if (isReplicaSetTransactionError(err)) {
      // Standalone MongoDB: run same logic without transaction
      return recordTransactionWithSession(
        { productId, clientId, type, quantity, referenceId, performedByStaffId, month },
        null
      );
    }
    throw err;
  }
}

/**
 * getAvailableStock = INBOUND - SOLD - DAMAGED - MISSING - RESERVED
 * (plus RETURNED, ADJUSTMENT as additive)
 */
export async function getAvailableStock(productId: string, clientId: string): Promise<number> {
  const results = await txRepo.aggregateByType(productId, clientId);
  let available = 0;
  for (const r of results) {
    if (ADDS.includes(r._id)) available += r.total;
    if (SUBS.includes(r._id)) available -= r.total;
  }
  return Math.max(0, available);
}
