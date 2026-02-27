/**
 * Movement-based inventory: NO static quantity updates.
 * The system NEVER directly updates a quantity field. All stock values are computed
 * dynamically from inventory_movements only.
 *
 * Available Stock per SKU (computed only from movements):
 *   Available =
 *     + STOCK_IN
 *     + RETURNED
 *     - PICKED
 *     - SHIPPED
 *     - DAMAGED
 *     + MANUAL_ADJUSTMENT (if positive)
 *     - MANUAL_ADJUSTMENT (if negative)
 */
import { InventoryMovement, INVENTORY_MOVEMENT_TYPES, type InventoryMovementType } from '../../../schemas/inventory-movement.schema';

/**
 * Contribution of a single movement row to Available Stock.
 * This is the ONLY place that defines how movement types affect stock; no other quantity logic exists.
 */
function movementContributionToAvailable(type: InventoryMovementType, quantity: number): number {
  switch (type) {
    case 'STOCK_IN':
    case 'RETURNED':
      return quantity;
    case 'PICKED':
    case 'SHIPPED':
    case 'DAMAGED':
      return -quantity;
    case 'MANUAL_ADJUSTMENT':
      return quantity; // stored as signed: positive adds, negative subtracts
    default:
      return 0;
  }
}

/**
 * Create a single movement. Validates type is allowed and quantity (non-zero except for optional MANUAL_ADJUSTMENT zero).
 */
export async function createMovement(params: {
  sku: string;
  type: InventoryMovementType;
  quantity: number;
  reference_id?: string;
  worker_id?: string;
  note?: string;
}): Promise<{ id: string }> {
  const { sku, type, quantity, reference_id, worker_id, note } = params;

  if (!INVENTORY_MOVEMENT_TYPES.includes(type)) {
    throw new Error(`Invalid movement type. Allowed: ${INVENTORY_MOVEMENT_TYPES.join(', ')}`);
  }
  if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
    throw new Error('Quantity must be a number');
  }
  if (type === 'MANUAL_ADJUSTMENT') {
    // allowed to be positive or negative
  } else if (quantity <= 0) {
    throw new Error('Quantity must be positive for this movement type');
  }

  const doc = await InventoryMovement.create({
    sku: String(sku).trim(),
    type,
    quantity,
    reference_id: reference_id?.trim() || undefined,
    worker_id: worker_id?.trim() || undefined,
    note: note?.trim() || undefined,
  });

  return { id: doc.id };
}

/**
 * List movements with optional filters and pagination.
 */
export async function listMovements(params: {
  sku?: string;
  type?: InventoryMovementType;
  reference_id?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  items: Array<{
    id: string;
    sku: string;
    type: InventoryMovementType;
    quantity: number;
    reference_id?: string;
    worker_id?: string;
    note?: string;
    created_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (params.sku) filter.sku = params.sku.trim();
  if (params.type) filter.type = params.type;
  if (params.reference_id) filter.reference_id = params.reference_id.trim();

  const sortAsc = params.sortOrder === 'asc';
  const [items, total] = await Promise.all([
    InventoryMovement.find(filter).sort({ created_at: sortAsc ? 1 : -1 }).skip(skip).limit(limit).lean(),
    InventoryMovement.countDocuments(filter),
  ]);

  return {
    items: items.map((d: Record<string, unknown>) => ({
      id: String(d.id ?? ''),
      sku: String(d.sku ?? ''),
      type: d.type as InventoryMovementType,
      quantity: Number(d.quantity ?? 0),
      reference_id: d.reference_id != null ? String(d.reference_id) : undefined,
      worker_id: d.worker_id != null ? String(d.worker_id) : undefined,
      note: d.note != null ? String(d.note) : undefined,
      created_at: (d.created_at as Date)?.toISOString?.() ?? new Date().toISOString(),
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get Available Stock for a single SKU. Computed dynamically from inventory_movements only.
 * No quantity field is ever read or updated; this is the only stock calculation.
 */
export async function getStockBySku(sku: string): Promise<number> {
  const rows = await InventoryMovement.find({ sku: sku.trim() }).select('type quantity').lean();
  let available = 0;
  for (const r of rows) {
    available += movementContributionToAvailable(r.type as InventoryMovementType, r.quantity);
  }
  return Math.max(0, available);
}

/**
 * Get Available Stock for multiple SKUs. Computed dynamically from inventory_movements only.
 * No quantity field is ever read or updated.
 */
export async function getStockBySkuMap(skus: string[]): Promise<Record<string, number>> {
  if (skus.length === 0) return {};
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))];
  const rows = await InventoryMovement.find({ sku: { $in: unique } }).select('sku type quantity').lean();
  const map: Record<string, number> = {};
  for (const sku of unique) map[sku] = 0;
  for (const r of rows) {
    const sku = r.sku as string;
    if (sku in map) {
      map[sku] += movementContributionToAvailable(r.type as InventoryMovementType, r.quantity);
    }
  }
  for (const sku of Object.keys(map)) {
    map[sku] = Math.max(0, map[sku]);
  }
  return map;
}

/**
 * Get Available Stock for multiple SKUs as of a given date (movements with created_at <= asOf only).
 * Used for weekly report opening/closing balance.
 */
export async function getStockBySkuMapAtDate(
  skus: string[],
  asOf: Date
): Promise<Record<string, number>> {
  if (skus.length === 0) return {};
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))];
  const rows = await InventoryMovement.find({
    sku: { $in: unique },
    created_at: { $lte: asOf },
  })
    .select('sku type quantity')
    .lean();
  const map: Record<string, number> = {};
  for (const sku of unique) map[sku] = 0;
  for (const r of rows) {
    const sku = r.sku as string;
    if (sku in map) {
      map[sku] += movementContributionToAvailable(r.type as InventoryMovementType, r.quantity);
    }
  }
  for (const sku of Object.keys(map)) {
    map[sku] = Math.max(0, map[sku]);
  }
  return map;
}
