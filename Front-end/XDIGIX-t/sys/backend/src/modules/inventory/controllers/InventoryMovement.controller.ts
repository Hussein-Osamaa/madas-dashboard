/**
 * Movement-based inventory API. Stock is derived only from inventory_movements.
 */
import { Request, Response } from 'express';
import {
  createMovement,
  listMovements,
  getStockBySku,
  getStockBySkuMap,
} from '../services/InventoryMovement.service';
import { INVENTORY_MOVEMENT_TYPES, type InventoryMovementType } from '../../../schemas/inventory-movement.schema';

/**
 * POST /warehouse/movements - Record a movement (no static quantity; stock derived from movements only).
 */
export async function recordMovement(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const sku = body.sku != null ? String(body.sku).trim() : '';
  const type = body.type as InventoryMovementType | undefined;
  const quantity = body.quantity != null ? Number(body.quantity) : NaN;

  if (!sku) {
    res.status(400).json({ error: 'sku is required' });
    return;
  }
  if (!type || !INVENTORY_MOVEMENT_TYPES.includes(type)) {
    res.status(400).json({
      error: `type must be one of: ${INVENTORY_MOVEMENT_TYPES.join(', ')}`,
    });
    return;
  }
  if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
    res.status(400).json({ error: 'quantity must be a number' });
    return;
  }

  try {
    const worker_id = req.accountPayload?.userId;
    const { id } = await createMovement({
      sku,
      type,
      quantity,
      reference_id: body.reference_id != null ? String(body.reference_id) : undefined,
      worker_id: (body.worker_id != null ? String(body.worker_id) : worker_id) || undefined,
      note: body.note != null ? String(body.note) : undefined,
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

/**
 * GET /warehouse/movements - List movements (optional sku, type, reference_id, page, limit).
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const sku = (req.query.sku as string) || undefined;
    const type = (req.query.type as InventoryMovementType) || undefined;
    const reference_id = (req.query.reference_id as string) || undefined;
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || undefined;
    const result = await listMovements({ sku, type, reference_id, page, limit, sortOrder });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /warehouse/stock - Get current stock by SKU. Query: sku (single) or skus (comma-separated).
 * Stock is derived ONLY from inventory_movements; no static quantity.
 */
export async function getStock(req: Request, res: Response): Promise<void> {
  const sku = (req.query.sku as string)?.trim();
  const skusQuery = (req.query.skus as string)?.trim();
  if (sku && skusQuery) {
    res.status(400).json({ error: 'Use either sku or skus, not both' });
    return;
  }
  if (!sku && !skusQuery) {
    res.status(400).json({ error: 'Query sku or skus is required' });
    return;
  }
  try {
    if (sku) {
      const stock = await getStockBySku(sku);
      res.json({ sku, stock });
      return;
    }
    const skus = skusQuery.split(',').map((s) => s.trim()).filter(Boolean);
    if (skus.length === 0) {
      res.status(400).json({ error: 'skus must contain at least one SKU' });
      return;
    }
    const map = await getStockBySkuMap(skus);
    res.json({ stockBySku: map });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
