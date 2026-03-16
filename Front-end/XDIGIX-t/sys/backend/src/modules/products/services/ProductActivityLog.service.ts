import { ProductActivityLog } from '../../../schemas/product-activity-log.schema';

export type ProductActivityAction = 'created' | 'updated' | 'deleted';

export async function logProductActivity(params: {
  clientId: string;
  productId: string;
  productName?: string;
  action: ProductActivityAction;
  performedByUserId: string;
  performedByEmail: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await ProductActivityLog.create({
    clientId: params.clientId,
    productId: params.productId,
    productName: params.productName,
    action: params.action,
    performedByUserId: params.performedByUserId,
    performedByEmail: params.performedByEmail,
    details: params.details,
  });
}

/** Bulk insert multiple activity log entries in a single DB operation (used by bulk-stock route). */
export async function batchLogProductActivity(
  entries: Array<{
    clientId: string;
    productId: string;
    productName?: string;
    action: ProductActivityAction;
    performedByUserId: string;
    performedByEmail: string;
    details?: Record<string, unknown>;
  }>
): Promise<void> {
  if (entries.length === 0) return;
  await ProductActivityLog.insertMany(entries);
}

export async function listProductActivityLog(params: {
  clientId?: string;
  page?: number;
  limit?: number;
}): Promise<{ entries: Array<{
  id: string;
  clientId: string;
  productId: string;
  productName?: string;
  action: ProductActivityAction;
  performedByUserId: string;
  performedByEmail: string;
  details?: Record<string, unknown>;
  createdAt: string;
}>; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const skip = (page - 1) * limit;
  const filter = params.clientId ? { clientId: params.clientId } : {};
  const [entries, total] = await Promise.all([
    ProductActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductActivityLog.countDocuments(filter),
  ]);
  return {
    entries: entries.map((e: Record<string, unknown>) => ({
      id: String(e._id),
      clientId: String(e.clientId ?? ''),
      productId: String(e.productId ?? ''),
      productName: e.productName != null ? String(e.productName) : undefined,
      action: e.action as ProductActivityAction,
      performedByUserId: String(e.performedByUserId ?? ''),
      performedByEmail: String(e.performedByEmail ?? ''),
      details: e.details != null ? (e.details as Record<string, unknown>) : undefined,
      createdAt: (e.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    })),
    total,
  };
}
