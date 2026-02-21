import { AuditSessionModel } from '../models/AuditSession.model';
import { AuditScanModel } from '../models/AuditScan.model';
import { recordTransaction, getAvailableStock } from '../../inventory/services/Inventory.service';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { StaffUser } from '../../../schemas/staff-user.schema';
import { getIo } from '../../../realtime';
import { StockTransactionModel } from '../../inventory/models/StockTransaction.model';

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
): Promise<{ sessionId: string; clientId: string; createdBy: string }> {
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

/** Resolve barcode to product for a client. Returns { productId, name, sku } or null. */
export async function resolveBarcode(
  clientId: string,
  barcode: string
): Promise<{ productId: string; name?: string; sku?: string } | null> {
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
    for (const sb of Object.values(sizeBarcodes)) {
      const s = String(sb || '').toLowerCase();
      if (s === trimmed || normalizeBarcode(s) === normalized)
        return { productId: d.docId, name: (data.name as string) || undefined, sku: (data.sku as string) || undefined };
    }
    const sizeVariants = (data.sizeVariants as Record<string, { barcode?: string }>) || {};
    for (const v of Object.values(sizeVariants)) {
      const vb = String((v as { barcode?: string })?.barcode || '').toLowerCase();
      if (vb === trimmed || normalizeBarcode(vb) === normalized)
        return { productId: d.docId, name: (data.name as string) || undefined, sku: (data.sku as string) || undefined };
    }
  }
  return null;
}

/** Scan by barcode only: resolve then record. Returns product info or throws UNKNOWN_BARCODE. */
export async function scanBarcodeByCode(
  sessionId: string,
  barcode: string
): Promise<{ productId: string; name?: string; sku?: string }> {
  const session = await AuditSessionModel.findOne({ _id: sessionId, status: { $in: ACTIVE_STATUSES } });
  if (!session) throw new Error('Active audit session not found');
  const resolved = await resolveBarcode(session.clientId, barcode);
  if (!resolved) {
    const err = new Error('Unknown barcode') as Error & { code?: string };
    err.code = 'UNKNOWN_BARCODE';
    throw err;
  }
  await scanBarcode(sessionId, barcode, resolved.productId, 1);
  return { productId: resolved.productId, name: resolved.name, sku: resolved.sku };
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
): Promise<{ productId: string; name?: string; sku?: string }> {
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
    return { productId: resolved.productId, name: resolved.name, sku: resolved.sku };
  }
  await AuditScanModel.create({
    auditSessionId: session._id,
    productId: resolved.productId,
    barcode: barcode.trim(),
    workerId,
    scannedAt: new Date(),
    productName: resolved.name,
    productSku: resolved.sku,
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
    const toItem = (s: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string }) => ({
      productId: s.productId,
      barcode: s.barcode,
      workerId: s.workerId,
      scannedAt: s.scannedAt,
      productName: s.productName,
      productSku: s.productSku,
    });
    serverIo.to(`audit:${auditSessionId}`).emit('scan_update', {
      totalScans: session.scannedBarcodes.length,
      workerScanCounts: session.workerScanCounts,
      lastScanned: last ? toItem(last as any) : null,
      recentScans: recentScans.map((s) => toItem(s as any)),
    });
  }
  return { productId: resolved.productId, name: resolved.name, sku: resolved.sku };
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
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string }>;
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
        }
      : null,
    recentScans: recentScans.map((r: any) => ({
      productId: r.productId,
      barcode: r.barcode,
      workerId: r.workerId,
      scannedAt: r.scannedAt,
      productName: r.productName,
      productSku: r.productSku,
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
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: Date; productName?: string; productSku?: string }>;
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

export async function finishAudit(
  sessionId: string,
  requestedBy: string,
  options?: { allowAnyAdmin?: boolean }
): Promise<{ adjustments: Array<{ productId: string; expected: number; actual: number; type: string }>; clientId: string }> {
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

  // All products for this client: Firestore products + any in ledger
  const productDocs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' }).select('docId').lean();
  const productIdsFromDocs = productDocs.map((d: { docId: string }) => d.docId);
  const productIdsFromLedger = await StockTransactionModel.distinct('productId', { clientId });
  const allProductIds = [...new Set([...productIdsFromDocs, ...productIdsFromLedger])];

  const adjustments: Array<{ productId: string; expected: number; actual: number; type: string }> = [];

  // Reconciliation: for each product, expectedPhysical from ledger; create exactly one StockTransaction (MISSING / ADJUSTMENT / AUDIT)
  for (const productId of allProductIds) {
    const expectedPhysical = await getAvailableStock(productId, clientId);
    const scannedCount = scannedByProduct.get(productId) ?? 0;
    const difference = scannedCount - expectedPhysical;

    if (difference < 0) {
      await recordTransaction({
        productId,
        clientId,
        type: 'MISSING',
        quantity: Math.abs(difference),
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type: 'MISSING' });
    } else if (difference > 0) {
      await recordTransaction({
        productId,
        clientId,
        type: 'ADJUSTMENT',
        quantity: difference,
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type: 'ADJUSTMENT' });
    } else {
      await recordTransaction({
        productId,
        clientId,
        type: 'AUDIT',
        quantity: 0,
        referenceId: auditRef,
        performedByStaffId: performedByStaffId || requestedBy,
      });
      adjustments.push({ productId, expected: expectedPhysical, actual: scannedCount, type: 'AUDIT' });
    }
  }

  session.status = 'FINISHED';
  session.finishedAt = new Date();
  await session.save();

  const serverIo = getIo();
  if (serverIo) {
    serverIo.to(`audit:${sessionId}`).emit('audit_closed', { sessionId, adjustments });
  }

  return { adjustments, clientId: String(clientId) };
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
