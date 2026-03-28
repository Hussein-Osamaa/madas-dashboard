/**
 * Zammit integration API routes.
 * Allows clients to configure their Zammit credentials, trigger syncs, and view status/logs.
 * All endpoints require JWT auth + tenant context (businessId, tenantId on req).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { ZammitIntegration } from '../schemas/zammit-integration.schema';
import { encrypt, decrypt } from '../utils/encryption';
import { ZammitApiClient, syncZammitOrders } from '../modules/zammit-sync';
import { logger } from '../utils/logger';

const router = Router();
router.use(jwtMiddleware);
router.use(tenantMiddleware);

// ── Validation Schemas ──────────────────────────────────────────

const saveConfigSchema = z.object({
  zammitEmail: z.string().email('Valid email required'),
  zammitPassword: z.string().min(1, 'Password is required'),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  enabled: z.boolean().optional(),
});

const testCredentialsSchema = z.object({
  zammitEmail: z.string().email(),
  zammitPassword: z.string().min(1),
});

// ── GET /api/zammit/config ──────────────────────────────────────

router.get('/config', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const integration = await ZammitIntegration.findOne({ businessId }).lean();
    if (!integration) {
      res.json({ configured: false });
      return;
    }

    // Return config WITHOUT password — only show masked email
    let emailDecrypted = '';
    try {
      emailDecrypted = decrypt(integration.zammitEmail);
    } catch {
      emailDecrypted = '(decryption failed)';
    }

    res.json({
      configured: true,
      zammitEmail: emailDecrypted,
      enabled: integration.enabled,
      syncIntervalMinutes: integration.syncIntervalMinutes,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncError: integration.lastSyncError,
      lastSyncOrderCount: integration.lastSyncOrderCount,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    });
  } catch (err) {
    logger.error('Zammit config: fetch failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch Zammit config' });
  }
});

// ── POST /api/zammit/config ─────────────────────────────────────

router.post('/config', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  const tenantId = req.tenantId;
  if (!businessId || !tenantId) {
    res.status(400).json({ error: 'businessId and tenantId are required' });
    return;
  }

  const parsed = saveConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { zammitEmail, zammitPassword, syncIntervalMinutes, enabled } = parsed.data;

  try {
    // Encrypt credentials before storing
    const encryptedEmail = encrypt(zammitEmail);
    const encryptedPassword = encrypt(zammitPassword);

    await ZammitIntegration.findOneAndUpdate(
      { businessId },
      {
        $set: {
          businessId,
          tenantId,
          zammitEmail: encryptedEmail,
          zammitPassword: encryptedPassword,
          ...(syncIntervalMinutes !== undefined && { syncIntervalMinutes }),
          ...(enabled !== undefined && { enabled }),
        },
      },
      { upsert: true, new: true }
    );

    logger.info('Zammit config: saved', { businessId, tenantId });
    res.json({ success: true, message: 'Zammit integration configured successfully' });
  } catch (err) {
    logger.error('Zammit config: save failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to save Zammit config' });
  }
});

// ── DELETE /api/zammit/config ───────────────────────────────────

router.delete('/config', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    await ZammitIntegration.deleteOne({ businessId });
    logger.info('Zammit config: deleted', { businessId });
    res.json({ success: true, message: 'Zammit integration removed' });
  } catch (err) {
    logger.error('Zammit config: delete failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete Zammit config' });
  }
});

// ── POST /api/zammit/config/test ────────────────────────────────

router.post('/config/test', async (req: Request, res: Response) => {
  const parsed = testCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const result = await ZammitApiClient.testCredentials(
      parsed.data.zammitEmail,
      parsed.data.zammitPassword
    );
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// ── POST /api/zammit/sync/trigger ───────────────────────────────

router.post('/sync/trigger', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const integration = await ZammitIntegration.findOne({ businessId });
    if (!integration) {
      res.status(404).json({ error: 'Zammit integration not configured' });
      return;
    }

    if (integration.lastSyncStatus === 'running') {
      res.status(409).json({ error: 'Sync is already running' });
      return;
    }

    // Run sync (this may take a while — respond with 202 Accepted)
    // For production, consider running in background and returning immediately
    const result = await syncZammitOrders(integration);
    res.json(result);
  } catch (err) {
    logger.error('Zammit sync trigger: failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Sync trigger failed' });
  }
});

// ── GET /api/zammit/sync/status ─────────────────────────────────

router.get('/sync/status', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const integration = await ZammitIntegration.findOne(
      { businessId },
      { lastSyncAt: 1, lastSyncStatus: 1, lastSyncError: 1, lastSyncOrderCount: 1, enabled: 1 }
    ).lean();

    if (!integration) {
      res.json({ configured: false });
      return;
    }

    res.json({
      configured: true,
      enabled: integration.enabled,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncError: integration.lastSyncError,
      lastSyncOrderCount: integration.lastSyncOrderCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// ── GET /api/zammit/sync/logs ───────────────────────────────────

router.get('/sync/logs', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const integration = await ZammitIntegration.findOne(
      { businessId },
      { syncLogs: 1 }
    ).lean();

    if (!integration) {
      res.json({ logs: [] });
      return;
    }

    // Return logs newest first
    const logs = (integration.syncLogs || []).reverse();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// ── POST /api/zammit/sync/reset ──────────────────────────────────
// Clears syncedOrderIds so the next sync retries all Zammit orders.
// Use this when failed orders were incorrectly marked as synced.

router.post('/sync/reset', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const result = await ZammitIntegration.findOneAndUpdate(
      { businessId },
      { $set: { syncedOrderIds: [], lastSyncStatus: 'idle', lastSyncError: '' } },
      { new: true }
    );

    if (!result) {
      res.status(404).json({ error: 'Zammit integration not configured' });
      return;
    }

    logger.info('Zammit sync: reset syncedOrderIds', { businessId });
    res.json({ success: true, message: 'Sync state reset. Next sync will re-check all Zammit orders.' });
  } catch (err) {
    logger.error('Zammit sync reset: failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to reset sync state' });
  }
});

// ── POST /api/zammit/sync/dedup ──────────────────────────────────
// Removes duplicate Zammit orders, keeping the oldest one per zammitPurchaseId.

router.post('/sync/dedup', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  try {
    const { FirestoreDoc } = await import('../schemas/document.schema');

    // Find all zammit orders
    const zammitOrders = await FirestoreDoc.find(
      { businessId, coll: 'orders', 'data.zammitPurchaseId': { $exists: true } },
      { docId: 1, 'data.zammitPurchaseId': 1, 'data.createdAt': 1, createdAt: 1 },
    ).sort({ createdAt: 1 }).lean();

    // Group by zammitPurchaseId
    const groups = new Map<string, Array<{ _id: unknown; docId: string }>>();
    for (const order of zammitOrders) {
      const data = (order as Record<string, unknown>).data as Record<string, unknown> | undefined;
      const zammitId = String(data?.zammitPurchaseId || '');
      if (!zammitId) continue;

      if (!groups.has(zammitId)) groups.set(zammitId, []);
      groups.get(zammitId)!.push({
        _id: (order as Record<string, unknown>)._id,
        docId: (order as { docId: string }).docId,
      });
    }

    // Delete duplicates (keep first = oldest)
    let deletedCount = 0;
    const deletedIds: string[] = [];
    for (const [zammitId, docs] of groups) {
      if (docs.length <= 1) continue;
      // Keep the first (oldest), delete the rest
      const toDelete = docs.slice(1);
      for (const dup of toDelete) {
        await FirestoreDoc.deleteOne({ _id: dup._id });
        deletedIds.push(dup.docId);
        deletedCount++;
      }
      logger.info('Zammit dedup: removed duplicates', {
        businessId,
        zammitPurchaseId: zammitId,
        kept: docs[0].docId,
        removed: toDelete.map((d) => d.docId).join(', '),
      });
    }

    // Rebuild syncedOrderIds from remaining orders
    const remaining = await FirestoreDoc.find(
      { businessId, coll: 'orders', 'data.zammitPurchaseId': { $exists: true } },
      { 'data.zammitPurchaseId': 1 },
    ).lean();
    const validIds = remaining.map((d: Record<string, unknown>) =>
      String(((d as { data?: Record<string, unknown> }).data?.zammitPurchaseId) || '')
    ).filter(Boolean);

    await ZammitIntegration.updateOne(
      { businessId },
      { $set: { syncedOrderIds: validIds } }
    );

    logger.info('Zammit dedup: complete', { businessId, deletedCount: String(deletedCount), rebuiltSyncedIds: String(validIds.length) });
    res.json({
      success: true,
      deletedCount,
      remainingOrders: remaining.length,
      message: `Removed ${deletedCount} duplicate order(s). Sync state rebuilt with ${validIds.length} synced IDs.`,
    });
  } catch (err) {
    logger.error('Zammit dedup: failed', { businessId, error: (err as Error).message });
    res.status(500).json({ error: 'Dedup failed: ' + (err as Error).message });
  }
});

// ── PATCH /api/zammit/config/toggle ─────────────────────────────

router.patch('/config/toggle', async (req: Request, res: Response) => {
  const businessId = req.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'businessId is required' });
    return;
  }

  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) is required' });
    return;
  }

  try {
    const result = await ZammitIntegration.findOneAndUpdate(
      { businessId },
      { $set: { enabled } },
      { new: true }
    );

    if (!result) {
      res.status(404).json({ error: 'Zammit integration not configured' });
      return;
    }

    res.json({ success: true, enabled: result.enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle integration' });
  }
});

export default router;
