import { Request, Response } from 'express';
import { StockTransactionModel } from '../../inventory/models/StockTransaction.model';

/**
 * GET /transactions - Paginated list (client read-only)
 */
export async function list(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const productId = req.query.productId as string | undefined;

  const filter: Record<string, unknown> = { clientId };
  if (productId) filter.productId = productId;

  const [items, total] = await Promise.all([
    StockTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockTransactionModel.countDocuments(filter),
  ]);

  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
