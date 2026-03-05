import { AuditSessionModel } from '../models/AuditSession.model';
import { AuditScanModel } from '../models/AuditScan.model';
import { recordTransaction, getAvailableStock } from '../../inventory/services/Inventory.service';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { StaffUser } from '../../../schemas/staff-user.schema';
import { getIo, emitWarehouseUpdate } from '../../../realtime';
import { StockTransactionModel } from '../../inventory/models/StockTransaction.model';
import { recordBulkPhysicalCount } from './AuditComparison.service';

const ACTIVE_STATUSES = ['ACTIVE', 'in_progress'] as const;

function randomJoinCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Start a new audit session (admin). Returns sessionId and 6-digit joinCode. */
export async function startAudit(clientId: string, createdBy: string): Promise<{ sessionId: string; joinCode: string }> {
  let joinCode = randomJoinCode();
  let existing = await AuditSessionModel.findOne({ joinCode, status: { $in: ACTIVE_STATUSES } });
  while (existing) {
    joinCode = randomJoinCode();
    existing = await AuditSessionModel.findOne({ joinCode, status: { $in: ACTIVE_STATUSES } });
  }
  const doc = await AuditSessionModel.create({
    clientId,
    createdBy,
    joinCode,
    status: 'ACTIVE',
    participants: [createdBy],
    scannedBarcodes: [],
    workerScanCounts: { [createdBy]: 0 },
    scans: [],
  });
  return { sessionId: doc._id.toString(), joinCode };
}

/** Join an existing audit by 6-digit code. Fails if worker is already in another active session. */
export async function joinAudit(
  joinCode: string,
  workerId: string
): Promise<{ sessionId: string; clientId: string; createdBy: string; joinCode?: string }> {
  const session = await AuditSessionModel.findOne({
    joinCode: String(joinCode).trim(),
    status: { $in: ACTIVE_STATUSES },
  });
  if (!session) throw new Error('Audit session not found or already finished');
  const alreadyIn = session.participants?.some((id) => id === workerId);
  if (alreadyIn) {
    return {
      sessionId: session._id.toString(),
      clientId: session.clientId,
      createdBy: session.createdBy,
      joinCode: session.joinCode,
    };
  }
  const inOther = await AuditSessionModel.findOne({
    status: { $in: ACTIVE_STATUSES },
    _id: { $ne: session._id },
    participants: workerId,
  });
  if (inOther) throw new Error('You are already in another active audit');
  if (!session.participants) session.participants = [];
  if (!session.participants.includes(workerId)) session.participants.push(workerId);
  if (!session.workerScanCounts) session.workerScanCounts = {};
  if (session.workerScanCounts[workerId] == null) session.workerScanCounts[workerId] = 0;
  await session.save();
  return { sessionId: session._id.toString(), clientId: session.clientId, createdBy: session.createdBy, joinCode: session.joinCode };
}

function normalizeBarcode(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

/** Resolve barcode to product for a client. Returns { productId, name, sku, size } or null. */
export async function resolveBarcode(
  clientId: string,
  barcode: string
): Promise<{ productId: string; name?: string; sku?: string; size?: string } | null> {
  const docs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' }).select('docId data').lean();
  const trimmed = barcode.trim().toLowerCase();
  const normalized = normalizeBarcode(trimmed);
  for (const d of docs) {
    const data = (d as { data?: Record<string, unknown> }).data || {};
    const pb = String(data.barcode || '').toLowerCase();
    const pmain = String(data.mainBarcode || '').toLowerCase();
    const psku = String(data.sku || '').toLowerCase();
    if (
      (pb && (pb === trimmed || normalizeBarcode(pb) === normalized)) ||
      (pmain && (pmain === trimmed || normalizeBarcode(pmain) === normalized)) ||
      (psku && (psku === trimmed || normalizeBarcode(psku) === normalized))
    ) {
      return {
        productId: d.docId,
        name: (data.name as string) || undefined,
        sku: (data.sku as string) || undefined,
      };
    }
    const sizeBarcodes = (data.sizeBarcodes as Record<string, string>) || {};
    for (const [size, sb] of Object.entries(sizeBarcodes)) {
      const s = String(sb || '').toLowerCase();
      if (s === trimmed || normalizeBarcode(s) === normalized)
        return { productId: d.docId, name: (data.name as string) || undefined, sku: (data.sku as string) || undefined, size };
    }
    const sizeVariants = (data.sizeVariants as Record<string, { barcode?: string }>) || {};
    for (const [size, v] of Object.entries(sizeVariants)) {
      const vb = String((v as { barcode?: string })?.barcode || '').toLowerCase();
      if (vb === trimmed || normalizeBarcode(vb) === normalized)
        return { productId: d.docId, name: (data.name as string) || undefined, sku: (data.sku as string) || undefined, size };
    }
  }
  return null;
}

/** Scan by barcode only: resolve then record. Returns product info or throws UNKNOWN_BARCODE. */
export async function scanBarcodeByCode(
  sessionId: string,
  barcode: string
): Promise<{ productId: string; name?: string; sku?: string; size?: string }> {
  const session = await AuditSessionModel.findOne({ _id: sessionId, status: { $in: ACTIVE_STATUSES } });
  if (!session) throw new Error('Active audit session not found');
  const resolved = await resolveBarcode(session.clientId, barcode);
  if (!resolved) {
    const err = new Error('Unknown barcode') as Error & { code?: string };
    err.code = 'UNKNOWN_BARCODE';
    throw err;
  }
  await scanBarcode(sessionId, barcode, resolved.productId, 1);
  return { productId: resolved.productId, name: resolved.name, sku: resolved.sku, size: resolved.size };
}

export async function scanBarcode(
  sessionId: string,
  barcode: string,
  productId: string,
  quantity: number
): Promise<void> {
  const session = await AuditSessionModel.findOne({ _id: sessionId, status: { $in: ACTIVE_STATUSES } });
  if (!session) throw new Error('Active audit session not found');
  session.scans.push({ barcode, productId, quantity: quantity || 1 });
  await session.save();
}

/** Same barcode by same worker within this window counts as one scan. Shorter = can scan same item again sooner. */
const DEDUPE_MS = 800;

/**
 * Multi-worker scan: identify worker from auth, create AuditScan, update session.
 * Ignores same barcode by same worker within 2 seconds.
 * Emits scan_update to audit room.
 */
export async function scanBarcodeMultiWorker(
  auditSessionId: string,
  barcode: string,
  workerId: string
): Promise<{ productId: string; name?: string; sku?: string; size?: string }> {
  const session = await AuditSessionModel.findOne({
    _id: auditSessionId,
    status: { $in: ACTIVE_STATUSES },
  });
  if (!session) throw new Error('Active audit session not found or already finished');
  const resolved = await resolveBarcode(session.clientId, barcode);
  if (!resolved) {
    const err = new Error('Unknown barcode') as Error & { code?: string };
    err.code = 'UNKNOWN_BARCODE';
    throw err;
  }
  const since = new Date(Date.now() - DEDUPE_MS);
  const dup = await AuditScanModel.findOne({
    auditSessionId: session._id,
    workerId,
    barcode: barcode.trim(),
    scannedAt: { $gte: since },
  });
  if (dup) {
    return { productId: resolved.productId, name: resolved.name, sku: resolved.sku, size: resolved.size };
  }
  await AuditScanModel.create({
    auditSessionId: session._id,
    productId: resolved.productId,
    barcode: barcode.trim(),
    workerId,
    scannedAt: new Date(),
    productName: resolved.name,
    productSku: resolved.sku,
    size: resolved.size,
  });

  // If two requests ran concurrently, we may have created a duplicate; keep only the first in the dedupe window
  const sameWindow = await AuditScanModel.find({
    auditSessionId: session._id,
    workerId,
    barcode: barcode.trim(),
    scannedAt: { $gte: since },
  })
    .sort({ scannedAt: 1 })
    .lean();
  if (sameWindow.length > 1) {
    const toDelete = sameWindow.slice(1).map((d) => (d as { _id: unknown })._id);
    await AuditScanModel.deleteMany({ _id: { $in: toDelete } });
  }

  // Recompute session counts from AuditScan so they stay correct even when we removed a duplicate
  const allScans = await AuditScanModel.find({ auditSessionId: session._id }).lean();
  const barcodes = allScans.map((s) => (s as { barcode: string }).barcode);
  const workerCounts: Record<string, number> = {};
  for (const s of allScans) {
    const w = (s as { workerId: string }).workerId;
    workerCounts[w] = (workerCounts[w] ?? 0) + 1;
  }
  session.scannedBarcodes = barcodes;
  session.workerScanCounts = workerCounts;
  await session.save();

  const recentScans = await AuditScanModel.find({ auditSessionId: session._id })
    .sort({ scannedAt: -1 })
    .limit(20)
    .lean();
  const last = recentScans[0];
  const serverIo = getIo();
  if (serverIo) {
    const toItem = (s: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string; size?: string }) => ({
      productId: s.productId,
      barcode: s.barcode,
      workerId: s.workerId,
      scannedAt: s.scannedAt,
      productName: s.productName,
      productSku: s.productSku,
      size: s.size,
    });
    serverIo.to(`audit:${auditSessionId}`).emit('scan_update', {
      totalScans: session.scannedBarcodes.length,
      workerScanCounts: session.workerScanCounts,
      lastScanned: last ? toItem(last as any) : null,
      recentScans: recentScans.map((s) => toItem(s as any)),
    });
  }
  return { productId: resolved.productId, name: resolved.name, sku: resolved.sku, size: resolved.size };
}

/** Get session summary for UI (workers with names, counts, recent scans). */
export async function getSessionSummary(auditSessionId: string): Promise<{
  clientId: string;
  status: string;
  createdBy: string;
  participants: string[];
  workerScanCounts: Record<string, number>;
  workers: Array<{ userId: string; name: string; scanCount: number }>;
  totalScans: number;
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string; size?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string; size?: string }>;
} | null> {
  const session = await AuditSessionModel.findById(auditSessionId).lean();
  if (!session) return null;
  const sessionIdObj = (session as { _id: unknown })._id;
  const recentScans = await AuditScanModel.find({ auditSessionId: sessionIdObj })
    .sort({ scannedAt: -1 })
    .limit(20)
    .lean();
  const last = recentScans[0];
  const s = session as {
    clientId: string;
    status: string;
    createdBy: string;
    participants: string[];
    workerScanCounts: Record<string, number>;
    scannedBarcodes: string[];
  };
  const counts = s.workerScanCounts || {};
  const participantIds = [...new Set(s.participants || [])];
  const staffUsers = await StaffUser.find({ _id: { $in: participantIds } }).select('_id fullName').lean();
  const nameById = new Map<string, string>();
  for (const u of staffUsers) {
    const doc = u as { _id: { toString(): string }; fullName?: string };
    nameById.set(doc._id.toString(), doc.fullName || 'Unknown');
  }
  const workers = participantIds
    .map((userId) => ({
      userId,
      name: nameById.get(userId) || userId.slice(-6),
      scanCount: counts[userId] ?? 0,
    }))
    .sort((a, b) => b.scanCount - a.scanCount);

  return {
    clientId: s.clientId,
    status: s.status,
    createdBy: s.createdBy,
    participants: s.participants || [],
    workerScanCounts: counts,
    workers,
    totalScans: (s.scannedBarcodes || []).length,
    lastScanned: last
      ? {
          productId: (last as any).productId,
          barcode: (last as any).barcode,
          workerId: (last as any).workerId,
          scannedAt: (last as any).scannedAt,
          productName: (last as any).productName,
          productSku: (last as any).productSku,
          size: (last as any).size,
        }
      : null,
    recentScans: recentScans.map((r: any) => ({
      productId: r.productId,
      barcode: r.barcode,
      workerId: r.workerId,
      scannedAt: r.scannedAt,
      productName: r.productName,
      productSku: r.productSku,
      size: r.size,
    })),
  };
}

/** Restore an active session for a user who was already in it (e.g. after refresh). Returns summary + joinCode or null. */
export async function getSessionForRestore(
  auditSessionId: string,
  userId: string
): Promise<{
  clientId: string;
  status: string;
  createdBy: string;
  joinCode: string;
  participants: string[];
  workerScanCounts: Record<string, number>;
  workers: Array<{ userId: string; name: string; scanCount: number }>;
  totalScans: number;
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string; size?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string; size?: string }>;
} | null> {
  const session = await AuditSessionModel.findById(auditSessionId).lean();
  if (!session) return null;
  const s = session as { status: string; createdBy: string; participants: string[]; joinCode: string };
  if (!ACTIVE_STATUSES.includes(s.status as any)) return null;
  const isParticipant = s.participants?.includes(userId) || s.createdBy === userId;
  if (!isParticipant) return null;
  const summary = await getSessionSummary(auditSessionId);
  if (!summary) return null;
  return { ...summary, joinCode: s.joinCode };
}

/** Per-product, per-size audit detail used in reports. */
export interface ProductAuditDetail {
  productId: string;
  name: string;
  sku: string;
  mainBarcode: string;
  expectedTotal: number;
  actualTotal: number;
  type: string; // MISSING | ADJUSTMENT | AUDIT
  sizeBreakdown: Array<{
    size: string;
    expectedCount: number;
    scannedCount: number;
    sizeBarcode?: string;
    difference: number;
    status: string;
  }>;
}

export async function finishAudit(
  sessionId: string,
  requestedBy: string,
  options?: { allowAnyAdmin?: boolean }
): Promise<{ adjustments: Array<{ productId: string; expected: number; actual: number; type: string }>; detailedBreakdown: ProductAuditDetail[]; clientId: string }> {
  const session = await AuditSessionModel.findOne({ _id: sessionId, status: { $in: ACTIVE_STATUSES } });
  if (!session) throw new Error('Active audit session not found');
  const canFinish = session.createdBy === requestedBy || options?.allowAnyAdmin === true;
  if (!canFinish) {
    throw new Error('Only the person who started the audit (or a platform admin) can finish it');
  }
  const clientId = session.clientId;
  const performedByStaffId = session.createdBy || (session as { workerId?: string }).workerId;
  const auditRef = `audit:${sessionId}`;

  // Scanned count per product from this session (AuditScan records only)
  const scans = await AuditScanModel.find({ auditSessionId: session._id }).lean();
  const scannedByProduct = new Map<string, number>();
  for (const s of scans) {
    const pid = (s as { productId: string }).productId;
    scannedByProduct.set(pid, (scannedByProduct.get(pid) ?? 0) + 1);
  }
  if (scannedByProduct.size === 0 && session.scans?.length) {
    for (const s of session.scans) {
      scannedByProduct.set(s.productId, (scannedByProduct.get(s.productId) ?? 0) + (s.quantity || 1));
    }
  }

  // Build per-product, per-size scan counts
  const scansByProductAndSize = new Map<string, Map<string, number>>();
  for (const s of scans) {
    const scan = s as { productId: string; size?: string };
    const pid = scan.productId;
    const size = scan.size || '__unknown__';
    if (!scansByProductAndSize.has(pid)) scansByProductAndSize.set(pid, new Map());
    const sizeMap = scansByProductAndSize.get(pid)!;
    sizeMap.set(size, (sizeMap.get(size) ?? 0) + 1);
  }

  // Fetch all product Firestore docs with data for detailed info + audit comparison
  const productDocsWithData = await FirestoreDoc.find({ businessId: clientId, coll: 'products' }).select('docId data').lean();
  const productDataMap = new Map<string, Record<string, unknown>>();
  for (const d of productDocsWithData) {
    productDataMap.set(d.docId, (d as { data?: Record<string, unknown> }).data || {});
  }

  // Build SKU+size counts for audit comparison (physical vs system by size)
  const sizeCountKey = (sku: string, size?: string) => (size ? `${sku}::${size}` : sku);
  const sizeCounts = new Map<string, { sku: string; size?: string; count: number }>();
  for (const s of scans as Array<{ productId: string; productSku?: string; size?: string }>) {
    const data = productDataMap.get(s.productId) || {};
    const sku = (s.productSku?.trim() || (data.sku as string)?.trim() || s.productId).trim();
    const size = s.size?.trim() || undefined;
    const key = sizeCountKey(sku, size);
    const existing = sizeCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      sizeCounts.set(key, { sku, size, count: 1 });
    }
  }

  const sizeStockMap: Record<string, Record<string, number>> = {};
  for (const [, data] of productDataMap) {
    const sku = ((data.sku as string) ?? '').trim();
    if (!sku) continue;
    const stock = (data.stock as Record<string, number>) || {};
    if (Object.keys(stock).length > 0) {
      sizeStockMap[sku] = { ...(sizeStockMap[sku] || {}), ...stock };
    }
  }

  const auditComparisonCounts = Array.from(sizeCounts.values()).map(({ sku, size, count }) => ({
    sku,
    size,
    physicalCount: count,
  }));

  // Only reconcile products that exist as Firestore docs (recordTransaction requires it).
  // Products that only exist in the ledger (deleted docs) are skipped to avoid 400 errors.
  const productIdsFromDocs = new Set(productDocsWithData.map((d: { docId: string }) => d.docId));
  const productIdsFromLedger = await StockTransactionModel.distinct('productId', { clientId });
  const allProductIds = [...new Set([...productIdsFromDocs, ...productIdsFromLedger])].filter(
    (id) => productIdsFromDocs.has(id)
  );

  const adjustments: Array<{ productId: string; expected: number; actual: number; type: string }> = [];
  const detailedBreakdown: ProductAuditDetail[] = [];

  // Reconciliation: for each product, expectedPhysical from ledger; create exactly one StockTransaction (MISSING / ADJUSTMENT / AUDIT)
  for (const productId of allProductIds) {
    const expectedPhysical = await getAvailableStock(productId, clientId);
    const scannedCount = scannedByProduct.get(productId) ?? 0;
    const difference = scannedCount - expectedPhysical;

    // Product data for detailed breakdown
    const data = productDataMap.get(productId) || {};
    const name = (data.name as string) || 'Unknown Product';
    const sku = (data.sku as string) || '';
    const mainBarcode = (data.barcode as string) || (data.mainBarcode as string) || '';
    const stock = (data.stock as Record<string, number>) || {};
    const sizeBarcodes = (data.sizeBarcodes as Record<string, string>) || {};

    // Build per-size breakdown
    const sizeScans = scansByProductAndSize.get(productId) || new Map<string, number>();
    const allSizes = new Set([
      ...Object.keys(stock),
      ...Array.from(sizeScans.keys()).filter((k) => k !== '__unknown__'),
    ]);

    const sizeBreakdown: ProductAuditDetail['sizeBreakdown'] = [];
    for (const size of allSizes) {
      const expectedForSize = stock[size] ?? 0;
      const scannedForSize = sizeScans.get(size) ?? 0;
      const diff = scannedForSize - expectedForSize;
      let sizeStatus: string;
      if (expectedForSize === 0 && scannedForSize === 0) sizeStatus = 'Out of Stock';
      else if (scannedForSize === 0 && expectedForSize > 0) sizeStatus = 'Lost';
      else if (diff < 0) sizeStatus = 'Missing';
      else if (diff > 0) sizeStatus = 'Surplus';
      else sizeStatus = 'In Stock';
      sizeBreakdown.push({
        size,
        expectedCount: expectedForSize,
        scannedCount: scannedForSize,
        sizeBarcode: sizeBarcodes[size] || undefined,
        difference: diff,
        status: sizeStatus,
      });
    }

    // Handle unknown-size scans (main barcode scanned, size not determined)
    const unknownSizeScans = sizeScans.get('__unknown__') ?? 0;
    if (unknownSizeScans > 0) {
      sizeBreakdown.push({
        size: 'Unknown (main barcode)',
        expectedCount: 0,
        scannedCount: unknownSizeScans,
        sizeBarcode: mainBarcode,
        difference: unknownSizeScans,
        status: 'Surplus',
      });
    }

    let type: string;
    if (difference < 0) {
      await recordTransaction({
        productId,
        clientId,
        type: 'MISSING',
        quantity: Math.abs(difference),
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      type = 'MISSING';
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type });
    } else if (difference > 0) {
      await recordTransaction({
        productId,
        clientId,
        type: 'ADJUSTMENT',
        quantity: difference,
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      type = 'ADJUSTMENT';
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type });
    } else {
      await recordTransaction({
        productId,
        clientId,
        type: 'AUDIT',
        quantity: 0,
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      type = 'AUDIT';
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type });
    }

    detailedBreakdown.push({
      productId,
      name,
      sku,
      mainBarcode,
      expectedTotal: expectedPhysical,
      actualTotal: scannedCount,
      type,
      sizeBreakdown,
    });
  }

  session.status = 'FINISHED';
  session.finishedAt = new Date();
  await session.save();

  // Auto-generate audit comparison (physical vs system from movements) for dashboard/alerts
  if (auditComparisonCounts.length > 0) {
    try {
      const result = await recordBulkPhysicalCount({
        clientId,
        counts: auditComparisonCounts,
        shiftName: `Audit ${session.joinCode}`,
        performedBy: session.createdBy,
        sizeStockMap,
      });
      const anyAlert = result.comparisons?.some((c) => (c as { alertTriggered?: boolean }).alertTriggered);
      if (anyAlert) {
        const serverIo = getIo();
        if (serverIo) emitWarehouseUpdate(serverIo, { type: 'audit_alert', clientId: String(clientId) });
      }
    } catch (e) {
      // Don't fail finish; comparison is supplementary
      console.error('[finishAudit] audit comparison error:', e);
    }
  }

  const serverIo = getIo();
  if (serverIo) {
    serverIo.to(`audit:${sessionId}`).emit('audit_closed', { sessionId, adjustments });
  }

  return { adjustments, detailedBreakdown, clientId: String(clientId) };
}

/** Cancel session without reconciliation (admin only). */
export async function cancelAudit(sessionId: string): Promise<void> {
  const session = await AuditSessionModel.findOne({ _id: sessionId, status: { $in: ACTIVE_STATUSES } });
  if (!session) throw new Error('Active audit session not found');
  session.status = 'cancelled';
  session.finishedAt = new Date();
  await session.save();
  const serverIo = getIo();
  if (serverIo) {
    serverIo.to(`audit:${sessionId}`).emit('audit_closed', { sessionId, reason: 'cancelled' });
  }
}
