/**
 * Warehouse dashboard: metrics and charts from inventory_movements only.
 * Scoped by client (client's product SKUs).
 */
import { FirestoreDoc } from '../../../schemas/document.schema';
import { InventoryMovement } from '../../../schemas/inventory-movement.schema';
import { getStockBySkuMap } from './InventoryMovement.service';
import { listAlerts } from '../../audit/services/AuditComparison.service';

const TZ = 'UTC';

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysBack(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getClientSkus(clientId: string): Promise<string[]> {
  const docs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' })
    .select('docId data')
    .lean();
  const skus: string[] = [];
  for (const d of docs) {
    const data = (d as { data?: { sku?: string }; docId: string }).data || {};
    const sku = (data.sku ?? (d as { docId: string }).docId)?.trim?.();
    if (sku) skus.push(sku);
  }
  return [...new Set(skus)];
}

export async function getDashboardData(clientId: string): Promise<{
  totalStockValue: number | null;
  availableUnits: number;
  unitsPickedToday: number;
  unitsShippedToday: number;
  returnsThisWeek: number;
  damagedThisWeek: number;
  shrinkagePercentage: number;
  dailyMovementChart: Array<{ date: string; STOCK_IN: number; PICKED: number; SHIPPED: number; RETURNED: number; DAMAGED: number; MANUAL_ADJUSTMENT: number }>;
  topMovingSkus: Array<{ sku: string; totalMovement: number; in: number; out: number }>;
  workerActivityLog: Array<{ id: string; sku: string; type: string; quantity: number; worker_id: string; reference_id?: string; created_at: string }>;
  auditAlerts: Array<{ id: string; sku: string; physicalCount: number; systemStock: number; difference: number; threshold: number; shiftName?: string; createdAt: string }>;
}> {
  const clientSkus = await getClientSkus(clientId);
  const todayStart = startOfToday();
  const weekStart = startOfWeek();
  const chartStart = daysBack(14);

  const availableBySku = await getStockBySkuMap(clientSkus);
  const availableUnits = Object.values(availableBySku).reduce((a, b) => a + b, 0);

  const productDocs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' })
    .select('docId data')
    .lean();
  const costBySku: Record<string, number> = {};
  for (const d of productDocs) {
    const data = (d as { data?: { sku?: string; cost?: number; price?: number }; docId: string }).data || {};
    const sku = ((data.sku ?? (d as { docId: string }).docId) ?? '').trim();
    if (!sku) continue;
    const cost = typeof data.cost === 'number' ? data.cost : typeof data.price === 'number' ? data.price : 0;
    costBySku[sku] = cost;
  }
  let totalStockValue: number | null = 0;
  for (const sku of Object.keys(availableBySku)) {
    totalStockValue! += (availableBySku[sku] ?? 0) * (costBySku[sku] ?? 0);
  }
  const hasAnyCost = Object.values(costBySku).some((c) => c > 0);
  if (!hasAnyCost) totalStockValue = null;

  if (clientSkus.length === 0) {
    const emptyAlerts = await listAlerts({ clientId, acknowledged: false, limit: 10 });
    return {
      totalStockValue: null,
      availableUnits: 0,
      unitsPickedToday: 0,
      unitsShippedToday: 0,
      returnsThisWeek: 0,
      damagedThisWeek: 0,
      shrinkagePercentage: 0,
      dailyMovementChart: [],
      topMovingSkus: [],
      workerActivityLog: [],
      auditAlerts: emptyAlerts.items.map((a) => ({
        id: a.id,
        sku: a.sku,
        physicalCount: a.physicalCount,
        systemStock: a.systemStock,
        difference: a.difference,
        threshold: a.threshold,
        shiftName: a.shiftName,
        createdAt: a.createdAt,
      })),
    };
  }

  const skuFilter = { sku: { $in: clientSkus } };

  const [pickedToday, shippedToday, returnedWeek, damagedWeek, dailyAgg, skuAgg, workerLog] = await Promise.all([
    InventoryMovement.aggregate<{ total: number }>([
      { $match: { ...skuFilter, type: 'PICKED', created_at: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
    InventoryMovement.aggregate<{ total: number }>([
      { $match: { ...skuFilter, type: 'SHIPPED', created_at: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
    InventoryMovement.aggregate<{ total: number }>([
      { $match: { ...skuFilter, type: 'RETURNED', created_at: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
    InventoryMovement.aggregate<{ total: number }>([
      { $match: { ...skuFilter, type: 'DAMAGED', created_at: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]),
    InventoryMovement.aggregate<{ _id: string; STOCK_IN: number; PICKED: number; SHIPPED: number; RETURNED: number; DAMAGED: number; MANUAL_ADJUSTMENT: number }>([
      { $match: { ...skuFilter, created_at: { $gte: chartStart } } },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: TZ } },
          type: 1,
          quantity: 1,
        },
      },
      { $group: { _id: '$date', STOCK_IN: { $sum: { $cond: [{ $eq: ['$type', 'STOCK_IN'] }, '$quantity', 0] } }, PICKED: { $sum: { $cond: [{ $eq: ['$type', 'PICKED'] }, '$quantity', 0] } }, SHIPPED: { $sum: { $cond: [{ $eq: ['$type', 'SHIPPED'] }, '$quantity', 0] } }, RETURNED: { $sum: { $cond: [{ $eq: ['$type', 'RETURNED'] }, '$quantity', 0] } }, DAMAGED: { $sum: { $cond: [{ $eq: ['$type', 'DAMAGED'] }, '$quantity', 0] } }, MANUAL_ADJUSTMENT: { $sum: { $cond: [{ $eq: ['$type', 'MANUAL_ADJUSTMENT'] }, '$quantity', 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    InventoryMovement.aggregate<{ _id: string; total: number; in: number; out: number }>([
      { $match: skuFilter },
      {
        $group: {
          _id: '$sku',
          total: { $sum: { $abs: '$quantity' } },
          in: {
            $sum: {
              $cond: [
                { $in: ['$type', ['STOCK_IN', 'RETURNED']] },
                '$quantity',
                { $cond: [{ $and: [{ $eq: ['$type', 'MANUAL_ADJUSTMENT'] }, { $gte: ['$quantity', 0] }] }, '$quantity', 0] },
              ],
            },
          },
          out: {
            $sum: {
              $cond: [
                { $in: ['$type', ['PICKED', 'SHIPPED', 'DAMAGED']] },
                '$quantity',
                { $cond: [{ $and: [{ $eq: ['$type', 'MANUAL_ADJUSTMENT'] }, { $lt: ['$quantity', 0] }] }, { $abs: '$quantity' }, 0] },
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),
    InventoryMovement.find({ ...skuFilter, worker_id: { $exists: true, $ne: '' } })
      .sort({ created_at: -1 })
      .limit(50)
      .lean(),
  ]);

  const unitsPickedToday = pickedToday[0]?.total ?? 0;
  const unitsShippedToday = shippedToday[0]?.total ?? 0;
  const returnsThisWeek = returnedWeek[0]?.total ?? 0;
  const damagedThisWeek = damagedWeek[0]?.total ?? 0;
  const denominator = availableUnits + unitsShippedToday + damagedThisWeek || 1;
  const shrinkagePercentage = Math.round((damagedThisWeek / denominator) * 1000) / 10;

  const dailyMovementChart = dailyAgg.map((r) => ({
    date: r._id,
    STOCK_IN: r.STOCK_IN ?? 0,
    PICKED: r.PICKED ?? 0,
    SHIPPED: r.SHIPPED ?? 0,
    RETURNED: r.RETURNED ?? 0,
    DAMAGED: r.DAMAGED ?? 0,
    MANUAL_ADJUSTMENT: r.MANUAL_ADJUSTMENT ?? 0,
  }));

  const topMovingSkus = skuAgg.map((r) => ({
    sku: r._id,
    totalMovement: r.total ?? 0,
    in: r.in ?? 0,
    out: r.out ?? 0,
  }));

  const workerActivityLog = workerLog.map((r: Record<string, unknown>) => ({
    id: r.id,
    sku: r.sku,
    type: r.type,
    quantity: r.quantity,
    worker_id: r.worker_id,
    reference_id: r.reference_id,
    created_at: (r.created_at as Date)?.toISOString?.() ?? '',
  }));

  const { items: alertItems } = await listAlerts({ clientId, acknowledged: false, limit: 10 });
  const auditAlerts = alertItems.map((a) => ({
    id: a.id,
    sku: a.sku,
    physicalCount: a.physicalCount,
    systemStock: a.systemStock,
    difference: a.difference,
    threshold: a.threshold,
    shiftName: a.shiftName,
    createdAt: a.createdAt,
  }));

  return {
    totalStockValue,
    availableUnits,
    unitsPickedToday,
    unitsShippedToday,
    returnsThisWeek,
    damagedThisWeek,
    shrinkagePercentage,
    dailyMovementChart,
    topMovingSkus,
    workerActivityLog,
    auditAlerts,
  };
}
