/**
 * Restock session service — multi-user live barcode scanning for stock replenishment.
 * Follows the same pattern as Audit.service.ts but tailored for restock workflows.
 *
 * Key differences from audit:
 * - Each scan increments count (multiple items share the same barcode)
 * - On finish, stock is updated (not just compared)
 * - Unmatched barcodes are recorded but don't block scanning
 */
import { RestockSessionModel, IRestockSession } from '../models/RestockSession.model';
import { RestockScanModel } from '../models/RestockScan.model';
import { resolveBarcode } from '../../audit/services/Audit.service';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { StaffUser } from '../../../schemas/staff-user.schema';
import { RestockReport, IRestockItem } from '../../../schemas/restock-report.schema';
import { getIo } from '../../../realtime';

const ACTIVE_STATUSES = ['ACTIVE'] as const;

/** Same barcode by same worker within this window counts as one scan. */
const DEDUPE_MS = 600;

function randomJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------
export async function startRestock(
  clientId: string,
  createdBy: string,
): Promise<{ sessionId: string; joinCode: string }> {
  // Auto-close any stale ACTIVE sessions created by this user
  await RestockSessionModel.updateMany(
    { createdBy, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED' } },
  );

  let joinCode = randomJoinCode();
  let existing = await RestockSessionModel.findOne({ joinCode, status: 'ACTIVE' });
  while (existing) {
    joinCode = randomJoinCode();
    existing = await RestockSessionModel.findOne({ joinCode, status: 'ACTIVE' });
  }

  const doc = await RestockSessionModel.create({
    clientId,
    createdBy,
    joinCode,
    status: 'ACTIVE',
    participants: [createdBy],
    workerScanCounts: { [createdBy]: 0 },
    totalScans: 0,
    unmatchedScans: 0,
  });
  return { sessionId: doc._id.toString(), joinCode };
}

// ---------------------------------------------------------------------------
// JOIN
// ---------------------------------------------------------------------------
export async function joinRestock(
  joinCode: string,
  workerId: string,
): Promise<{ sessionId: string; clientId: string; clientName?: string; joinCode: string }> {
  const session = await RestockSessionModel.findOne({
    joinCode: String(joinCode).trim().toUpperCase(),
    status: 'ACTIVE',
  });
  if (!session) throw new Error('Restock session not found or already finished');

  const alreadyIn = session.participants?.some((id) => id === workerId);
  if (alreadyIn) {
    return {
      sessionId: session._id.toString(),
      clientId: session.clientId,
      joinCode: session.joinCode,
    };
  }

  // Auto-leave any other active sessions so the worker can join the new one
  await RestockSessionModel.updateMany(
    { status: 'ACTIVE', _id: { $ne: session._id }, participants: workerId },
    { $pull: { participants: workerId } },
  );

  if (!session.participants) session.participants = [];
  if (!session.participants.includes(workerId)) session.participants.push(workerId);
  if (!session.workerScanCounts) session.workerScanCounts = {};
  if (session.workerScanCounts[workerId] == null) session.workerScanCounts[workerId] = 0;
  await session.save();

  // Notify other workers via socket
  const io = getIo();
  if (io) {
    const staff = await StaffUser.findById(workerId).select('fullName').lean();
    const workerName = (staff as any)?.fullName || workerId.slice(-6);
    io.to(`restock:${session._id}`).emit('restock:worker_joined', {
      workerId,
      workerName,
      totalWorkers: session.participants.length,
    });
  }

  return {
    sessionId: session._id.toString(),
    clientId: session.clientId,
    joinCode: session.joinCode,
  };
}

// ---------------------------------------------------------------------------
// SCAN
// ---------------------------------------------------------------------------
export async function scanBarcode(
  sessionId: string,
  barcode: string,
  workerId: string,
): Promise<{ success: boolean; matched: boolean; product?: { id: string; name?: string; size?: string } }> {
  const session = await RestockSessionModel.findOne({
    _id: sessionId,
    status: 'ACTIVE',
  });
  if (!session) throw new Error('Active restock session not found');

  // Resolve barcode to product
  const resolved = await resolveBarcode(session.clientId, barcode);
  const matched = !!resolved;

  // Dedupe: same barcode by same worker within DEDUPE_MS
  const since = new Date(Date.now() - DEDUPE_MS);
  const dup = await RestockScanModel.findOne({
    restockSessionId: session._id,
    workerId,
    barcode: barcode.trim(),
    scannedAt: { $gte: since },
  });
  if (dup) {
    return {
      success: true,
      matched,
      product: resolved
        ? { id: resolved.productId, name: resolved.name, size: resolved.size }
        : undefined,
    };
  }

  // Record scan
  await RestockScanModel.create({
    restockSessionId: session._id,
    productId: resolved?.productId || '',
    barcode: barcode.trim(),
    workerId,
    scannedAt: new Date(),
    productName: resolved?.name,
    size: resolved?.size,
    matched,
  });

  // Dedupe concurrent scans (same as audit)
  const sameWindow = await RestockScanModel.find({
    restockSessionId: session._id,
    workerId,
    barcode: barcode.trim(),
    scannedAt: { $gte: since },
  })
    .sort({ scannedAt: 1 })
    .lean();
  if (sameWindow.length > 1) {
    const toDelete = sameWindow.slice(1).map((d) => (d as { _id: unknown })._id);
    await RestockScanModel.deleteMany({ _id: { $in: toDelete } });
  }

  // Recompute counts
  const allScans = await RestockScanModel.find({ restockSessionId: session._id }).lean();
  const workerCounts: Record<string, number> = {};
  let unmatched = 0;
  for (const s of allScans) {
    const w = (s as any).workerId;
    workerCounts[w] = (workerCounts[w] ?? 0) + 1;
    if (!(s as any).matched) unmatched++;
  }
  session.workerScanCounts = workerCounts;
  session.totalScans = allScans.length;
  session.unmatchedScans = unmatched;
  await session.save();

  // Build entries (grouped by product+size with counts)
  const entriesMap = new Map<string, { productId: string; productName: string; size: string; barcode: string; count: number }>();
  for (const s of allScans) {
    const scan = s as any;
    if (!scan.matched) continue;
    const key = `${scan.productId}::${scan.size || 'default'}`;
    const existing = entriesMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      entriesMap.set(key, {
        productId: scan.productId,
        productName: scan.productName || '',
        size: scan.size || 'default',
        barcode: scan.barcode,
        count: 1,
      });
    }
  }

  // Broadcast scan update via socket
  const recentScans = await RestockScanModel.find({ restockSessionId: session._id })
    .sort({ scannedAt: -1 })
    .limit(20)
    .lean();
  const last = recentScans[0] as any;

  const io = getIo();
  if (io) {
    io.to(`restock:${sessionId}`).emit('restock:scan_update', {
      totalScans: session.totalScans,
      workerScanCounts: session.workerScanCounts,
      lastScanned: last
        ? {
            productId: last.productId,
            barcode: last.barcode,
            workerId: last.workerId,
            scannedAt: last.scannedAt,
            productName: last.productName,
            size: last.size,
          }
        : null,
      recentScans: recentScans.map((r: any) => ({
        productId: r.productId,
        barcode: r.barcode,
        workerId: r.workerId,
        scannedAt: r.scannedAt,
        productName: r.productName,
        size: r.size,
        count: 1,
      })),
      entries: Array.from(entriesMap.values()),
    });
  }

  return {
    success: true,
    matched,
    product: resolved
      ? { id: resolved.productId, name: resolved.name, size: resolved.size }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// GET SESSION
// ---------------------------------------------------------------------------
export async function getSessionSummary(sessionId: string): Promise<Record<string, unknown> | null> {
  const session = await RestockSessionModel.findById(sessionId).lean();
  if (!session) return null;
  const s = session as any;

  // Fetch worker names
  const participantIds = [...new Set(s.participants || [])];
  const staffUsers = await StaffUser.find({ _id: { $in: participantIds } }).select('_id fullName email').lean();
  const nameById = new Map<string, { name: string; email?: string }>();
  for (const u of staffUsers) {
    const doc = u as any;
    nameById.set(doc._id.toString(), { name: doc.fullName || 'Unknown', email: doc.email });
  }

  const counts = s.workerScanCounts || {};
  const workers = (participantIds as string[]).map((userId: string) => ({
    userId,
    name: nameById.get(userId)?.name || userId.slice(-6),
    email: nameById.get(userId)?.email,
    scanCount: counts[userId] ?? 0,
  })).sort((a, b) => b.scanCount - a.scanCount);

  // Build entries
  const allScans = await RestockScanModel.find({ restockSessionId: s._id }).lean();
  const entriesMap = new Map<string, { productId: string; productName: string; size: string; barcode: string; count: number }>();
  for (const scan of allScans) {
    const sc = scan as any;
    if (!sc.matched) continue;
    const key = `${sc.productId}::${sc.size || 'default'}`;
    const existing = entriesMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      entriesMap.set(key, {
        productId: sc.productId,
        productName: sc.productName || '',
        size: sc.size || 'default',
        barcode: sc.barcode,
        count: 1,
      });
    }
  }

  const recentScans = await RestockScanModel.find({ restockSessionId: s._id })
    .sort({ scannedAt: -1 })
    .limit(20)
    .lean();
  const last = recentScans[0] as any;

  return {
    sessionId: s._id.toString(),
    clientId: s.clientId,
    status: s.status,
    joinCode: s.joinCode,
    createdBy: s.createdBy,
    totalScans: s.totalScans || 0,
    unmatchedScans: s.unmatchedScans || 0,
    workers,
    entries: Array.from(entriesMap.values()),
    lastScanned: last
      ? {
          productId: last.productId,
          barcode: last.barcode,
          workerId: last.workerId,
          scannedAt: last.scannedAt,
          productName: last.productName,
          size: last.size,
        }
      : null,
    recentScans: recentScans.map((r: any) => ({
      productId: r.productId,
      barcode: r.barcode,
      workerId: r.workerId,
      scannedAt: r.scannedAt,
      productName: r.productName,
      size: r.size,
    })),
  };
}

// ---------------------------------------------------------------------------
// RESTORE (after page refresh)
// ---------------------------------------------------------------------------
export async function getSessionForRestore(
  sessionId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const session = await RestockSessionModel.findById(sessionId).lean();
  if (!session) return null;
  const s = session as any;
  if (s.status !== 'ACTIVE') return null;
  const isParticipant = s.participants?.includes(userId) || s.createdBy === userId;
  if (!isParticipant) return null;
  const summary = await getSessionSummary(sessionId);
  if (!summary) return null;
  return { ...summary, joinCode: s.joinCode };
}

// ---------------------------------------------------------------------------
// FINISH — apply stock updates
// ---------------------------------------------------------------------------
export async function finishRestock(
  sessionId: string,
  requestedBy: string,
): Promise<{
  success: boolean;
  reportId?: string;
  totalItems: number;
  succeeded: number;
  failed: number;
  entries: Array<{ productId: string; productName: string; size: string; count: number }>;
  zeroedProducts: Array<{ id: string; name: string }>;
}> {
  const session = await RestockSessionModel.findOne({ _id: sessionId, status: 'ACTIVE' });
  if (!session) throw new Error('Active restock session not found');

  const canFinish = session.createdBy === requestedBy;
  if (!canFinish) throw new Error('Only the session creator can finish the restock');

  const clientId = session.clientId;

  // Aggregate scans into entries (product + size → count)
  const allScans = await RestockScanModel.find({ restockSessionId: session._id, matched: true }).lean();
  const entriesMap = new Map<string, { productId: string; productName: string; size: string; barcode: string; count: number }>();

  for (const scan of allScans) {
    const sc = scan as any;
    const key = `${sc.productId}::${sc.size || 'default'}`;
    const existing = entriesMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      entriesMap.set(key, {
        productId: sc.productId,
        productName: sc.productName || '',
        size: sc.size || 'default',
        barcode: sc.barcode,
        count: 1,
      });
    }
  }
  const entries = Array.from(entriesMap.values());

  // Apply stock updates to Firestore products
  let succeeded = 0;
  let failed = 0;
  const productUpdates = new Map<string, Record<string, number>>();

  for (const entry of entries) {
    const sizeMap = productUpdates.get(entry.productId) || {};
    sizeMap[entry.size] = (sizeMap[entry.size] || 0) + entry.count;
    productUpdates.set(entry.productId, sizeMap);
  }

  for (const [productId, sizes] of productUpdates) {
    try {
      const doc = await FirestoreDoc.findOne({ businessId: clientId, coll: 'products', docId: productId });
      if (!doc) { failed++; continue; }
      const data = (doc as any).data || {};
      const stock: Record<string, number> = (data.stock && typeof data.stock === 'object' && !Array.isArray(data.stock))
        ? { ...data.stock }
        : {};

      // Update stock per size
      for (const [size, count] of Object.entries(sizes)) {
        if (size === 'default' && Object.keys(stock).length === 0) {
          // Single-size product: set total stock
          stock['default'] = count;
        } else {
          stock[size] = count;
        }
      }

      // Calculate total
      const totalStock = Object.values(stock).reduce((sum: number, v: number) => sum + v, 0);
      (doc as any).data = { ...data, stock, totalStock };
      doc.markModified('data');
      await doc.save();
      succeeded++;
    } catch (err) {
      console.error(`[restock] Failed to update product ${productId}:`, err);
      failed++;
    }
  }

  // Save restock report
  const reportItems: IRestockItem[] = entries.map((e) => ({
    productId: e.productId,
    productName: e.productName,
    quantity: e.count,
  }));

  let reportId: string | undefined;
  try {
    const report = await RestockReport.create({
      clientId,
      staffId: session.createdBy,
      items: reportItems,
      totalItems: entries.reduce((sum, e) => sum + e.count, 0),
      sessionNote: `Live restock session ${session.joinCode}`,
      finishedAt: new Date(),
    });
    reportId = report._id.toString();
  } catch (err) {
    console.error('[restock] Failed to create report:', err);
  }

  // Mark session finished
  session.status = 'FINISHED';
  session.finishedAt = new Date();
  await session.save();

  // Notify via socket
  const io = getIo();
  if (io) {
    io.to(`restock:${sessionId}`).emit('restock:closed', { sessionId, reason: 'finished' });
  }

  return {
    success: true,
    reportId,
    totalItems: entries.reduce((sum, e) => sum + e.count, 0),
    succeeded,
    failed,
    entries: entries.map((e) => ({ productId: e.productId, productName: e.productName, size: e.size, count: e.count })),
    zeroedProducts: [],
  };
}

// ---------------------------------------------------------------------------
// CANCEL
// ---------------------------------------------------------------------------
export async function cancelRestock(sessionId: string): Promise<void> {
  const session = await RestockSessionModel.findOne({ _id: sessionId, status: 'ACTIVE' });
  if (!session) throw new Error('Active restock session not found');
  session.status = 'CANCELLED';
  session.finishedAt = new Date();
  await session.save();

  const io = getIo();
  if (io) {
    io.to(`restock:${sessionId}`).emit('restock:closed', { sessionId, reason: 'cancelled' });
  }
}
