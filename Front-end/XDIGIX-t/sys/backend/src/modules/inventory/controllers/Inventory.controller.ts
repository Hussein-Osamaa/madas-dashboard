import { Request, Response } from 'express';
import { getIo, emitWarehouseUpdate } from '../../../realtime';
import { recordTransaction } from '../services/Inventory.service';
import { StockTransactionRepository } from '../repositories/StockTransaction.repository';
import { StockTransactionModel } from '../models/StockTransaction.model';

const txRepo = new StockTransactionRepository();

/**
 * POST /warehouse/inbound - Admin inbound products
 */
export async function inbound(req: Request, res: Response): Promise<void> {
  const { productId, quantity, referenceId } = req.body;
  const clientId = req.clientId!;
  const staffId = req.accountPayload?.accountType === 'STAFF' ? req.accountPayload.userId : undefined;
  await recordTransaction({
    productId,
    clientId,
    type: 'INBOUND',
    quantity: Number(quantity),
    referenceId,
    performedByStaffId: staffId,
  });
  emitWarehouseUpdate(getIo(), { type: 'transactions', clientId });
  emitWarehouseUpdate(getIo(), { type: 'products', clientId });
  res.json({ success: true });
}

/**
 * POST /warehouse/damage - Admin mark damaged
 */
export async function damage(req: Request, res: Response): Promise<void> {
  const { productId, quantity, referenceId } = req.body;
  const clientId = req.clientId!;
  const staffId = req.accountPayload?.accountType === 'STAFF' ? req.accountPayload.userId : undefined;
  await recordTransaction({
    productId,
    clientId,
    type: 'DAMAGED',
    quantity: Number(quantity),
    referenceId,
    performedByStaffId: staffId,
  });
  emitWarehouseUpdate(getIo(), { type: 'transactions', clientId });
  emitWarehouseUpdate(getIo(), { type: 'products', clientId });
  res.json({ success: true });
}

/**
 * POST /warehouse/missing - Admin mark missing
 */
export async function missing(req: Request, res: Response): Promise<void> {
  const { productId, quantity, referenceId } = req.body;
  const clientId = req.clientId!;
  const staffId = req.accountPayload?.accountType === 'STAFF' ? req.accountPayload.userId : undefined;
  await recordTransaction({
    productId,
    clientId,
    type: 'MISSING',
    quantity: Number(quantity),
    referenceId,
    performedByStaffId: staffId,
  });
  emitWarehouseUpdate(getIo(), { type: 'transactions', clientId });
  emitWarehouseUpdate(getIo(), { type: 'products', clientId });
  res.json({ success: true });
}

/**
 * GET /warehouse/transactions - Paginated transactions
 */
export async function listTransactions(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const productId = req.query.productId as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { clientId };
  if (productId) filter.productId = productId;

  const [items, total] = await Promise.all([
    StockTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockTransactionModel.countDocuments(filter),
  ]);

  res.json({
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
