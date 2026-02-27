/**
 * Audit comparison: record physical count, compare to system stock (from movements),
 * calculate difference, log shift, and create dashboard alert when variance exceeds threshold.
 */
import { getStockBySkuMap } from '../../inventory/services/InventoryMovement.service';
import { AuditComparisonModel } from '../../../schemas/warehouse/audit-comparison.schema';
import { AuditAlertModel } from '../../../schemas/warehouse/audit-alert.schema';

const DEFAULT_THRESHOLD = 5;
const ENV_KEY = 'AUDIT_VARIANCE_THRESHOLD';

function getThreshold(): number {
  const v = process.env[ENV_KEY];
  if (v != null && v !== '') {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_THRESHOLD;
}

export interface RecordCountInput {
  clientId: string;
  sku: string;
  physicalCount: number;
  shiftId?: string;
  shiftName?: string;
  performedBy?: string;
  note?: string;
}

export interface RecordCountResult {
  comparisonId: string;
  sku: string;
  physicalCount: number;
  systemStock: number;
  difference: number;
  threshold: number;
  alertTriggered: boolean;
  alertId?: string;
}

export async function recordPhysicalCount(input: RecordCountInput): Promise<RecordCountResult> {
  const { clientId, sku, physicalCount, shiftId, shiftName, performedBy, note } = input;
  const skuTrim = String(sku).trim();
  if (!skuTrim) throw new Error('sku is required');
  const count = Number(physicalCount);
  if (Number.isNaN(count) || count < 0) throw new Error('physicalCount must be a non-negative number');

  const threshold = getThreshold();
  const systemMap = await getStockBySkuMap([skuTrim]);
  const systemStock = systemMap[skuTrim] ?? 0;
  const difference = count - systemStock;
  const alertTriggered = Math.abs(difference) > threshold;

  const comparison = await AuditComparisonModel.create({
    clientId,
    sku: skuTrim,
    physicalCount: count,
    systemStock,
    difference,
    shiftId: shiftId?.trim() || undefined,
    shiftName: shiftName?.trim() || undefined,
    performedBy: performedBy?.trim() || undefined,
    note: note?.trim() || undefined,
    thresholdUsed: threshold,
    alertTriggered,
  });

  let alertId: string | undefined;
  if (alertTriggered) {
    const alert = await AuditAlertModel.create({
      clientId,
      comparisonId: comparison._id,
      sku: skuTrim,
      physicalCount: count,
      systemStock,
      difference,
      threshold,
      shiftId: comparison.shiftId,
      shiftName: comparison.shiftName,
      performedBy: comparison.performedBy,
    });
    alertId = alert._id.toString();
  }

  return {
    comparisonId: comparison._id.toString(),
    sku: skuTrim,
    physicalCount: count,
    systemStock,
    difference,
    threshold,
    alertTriggered,
    alertId,
  };
}

export interface RecordBulkCountInput {
  clientId: string;
  counts: Array<{ sku: string; physicalCount: number }>;
  shiftId?: string;
  shiftName?: string;
  performedBy?: string;
  note?: string;
}

export interface RecordBulkCountResult {
  comparisons: RecordCountResult[];
}

export async function recordBulkPhysicalCount(input: RecordBulkCountInput): Promise<RecordBulkCountResult> {
  const { clientId, counts, shiftId, shiftName, performedBy, note } = input;
  if (!counts?.length) throw new Error('counts array is required and must not be empty');

  const skus = counts.map((c) => String(c.sku).trim()).filter(Boolean);
  if (skus.length === 0) throw new Error('At least one valid sku required');
  const uniqueSkus = [...new Set(skus)];

  const threshold = getThreshold();
  const systemMap = await getStockBySkuMap(uniqueSkus);

  const comparisons: RecordCountResult[] = [];
  const alertsToCreate: Array<{
    clientId: string;
    comparisonId: unknown;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    threshold: number;
    shiftId?: string;
    shiftName?: string;
    performedBy?: string;
  }> = [];

  for (const { sku, physicalCount } of counts) {
    const skuTrim = String(sku).trim();
    if (!skuTrim) continue;
    const count = Number(physicalCount);
    if (Number.isNaN(count) || count < 0) continue;

    const systemStock = systemMap[skuTrim] ?? 0;
    const difference = count - systemStock;
    const alertTriggered = Math.abs(difference) > threshold;

    const comparison = await AuditComparisonModel.create({
      clientId,
      sku: skuTrim,
      physicalCount: count,
      systemStock,
      difference,
      shiftId: shiftId?.trim() || undefined,
      shiftName: shiftName?.trim() || undefined,
      performedBy: performedBy?.trim() || undefined,
      note: note?.trim() || undefined,
      thresholdUsed: threshold,
      alertTriggered,
    });

    comparisons.push({
      comparisonId: comparison._id.toString(),
      sku: skuTrim,
      physicalCount: count,
      systemStock,
      difference,
      threshold,
      alertTriggered,
    });

    if (alertTriggered) {
      alertsToCreate.push({
        clientId,
        comparisonId: comparison._id,
        sku: skuTrim,
        physicalCount: count,
        systemStock,
        difference,
        threshold,
        shiftId: comparison.shiftId,
        shiftName: comparison.shiftName,
        performedBy: comparison.performedBy,
      });
    }
  }

  for (const a of alertsToCreate) {
    const alert = await AuditAlertModel.create(a);
    const comp = comparisons.find((c) => c.sku === a.sku && c.alertTriggered);
    if (comp) comp.alertId = alert._id.toString();
  }

  return { comparisons };
}

export async function listComparisons(params: {
  clientId: string;
  sku?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: Array<{
    id: string;
    clientId: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    shiftId?: string;
    shiftName?: string;
    performedBy?: string;
    thresholdUsed: number;
    alertTriggered: boolean;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const { clientId, sku, page = 1, limit = 20 } = params;
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const take = Math.min(100, Math.max(1, limit));

  const filter: Record<string, unknown> = { clientId };
  if (sku?.trim()) filter.sku = sku.trim();

  const [items, total] = await Promise.all([
    AuditComparisonModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    AuditComparisonModel.countDocuments(filter),
  ]);

  return {
    items: items.map((d: Record<string, unknown>) => ({
      id: (d._id as { toString(): string }).toString(),
      clientId: String(d.clientId ?? ''),
      sku: String(d.sku ?? ''),
      physicalCount: Number(d.physicalCount ?? 0),
      systemStock: Number(d.systemStock ?? 0),
      difference: Number(d.difference ?? 0),
      shiftId: d.shiftId != null ? String(d.shiftId) : undefined,
      shiftName: d.shiftName != null ? String(d.shiftName) : undefined,
      performedBy: d.performedBy != null ? String(d.performedBy) : undefined,
      thresholdUsed: Number(d.thresholdUsed ?? 0),
      alertTriggered: Boolean(d.alertTriggered),
      createdAt: (d.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    })),
    total,
    page: Math.max(1, page),
    limit: take,
    pages: Math.ceil(total / take) || 1,
  };
}

export async function listAlerts(params: {
  clientId: string;
  acknowledged?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  items: Array<{
    id: string;
    clientId: string;
    comparisonId: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    threshold: number;
    shiftId?: string;
    shiftName?: string;
    performedBy?: string;
    acknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const { clientId, acknowledged, page = 1, limit = 50 } = params;
  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const take = Math.min(100, Math.max(1, limit));

  const filter: Record<string, unknown> = { clientId };
  if (typeof acknowledged === 'boolean') filter.acknowledged = acknowledged;

  const [items, total] = await Promise.all([
    AuditAlertModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    AuditAlertModel.countDocuments(filter),
  ]);

  return {
    items: items.map((d: Record<string, unknown>) => ({
      id: (d._id as { toString(): string }).toString(),
      clientId: String(d.clientId ?? ''),
      comparisonId: (d.comparisonId as { toString(): string }).toString(),
      sku: String(d.sku ?? ''),
      physicalCount: Number(d.physicalCount ?? 0),
      systemStock: Number(d.systemStock ?? 0),
      difference: Number(d.difference ?? 0),
      threshold: Number(d.threshold ?? 0),
      shiftId: d.shiftId != null ? String(d.shiftId) : undefined,
      shiftName: d.shiftName != null ? String(d.shiftName) : undefined,
      performedBy: d.performedBy != null ? String(d.performedBy) : undefined,
      acknowledged: Boolean(d.acknowledged),
      acknowledgedAt: (d.acknowledgedAt as Date)?.toISOString?.() ?? undefined,
      acknowledgedBy: d.acknowledgedBy != null ? String(d.acknowledgedBy) : undefined,
      createdAt: (d.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    })),
    total,
    page: Math.max(1, page),
    limit: take,
    pages: Math.ceil(total / take) || 1,
  };
}

export async function acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
  const updated = await AuditAlertModel.findByIdAndUpdate(
    alertId,
    { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: acknowledgedBy?.trim() || undefined },
    { new: true }
  );
  return !!updated;
}

export function getAuditThreshold(): number {
  return getThreshold();
}
