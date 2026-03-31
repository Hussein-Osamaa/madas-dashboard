/**
 * Export routes — create, list, process, download exports.
 *
 * Access control:
 *   - Merchant (req.tenantId set): merchant_self scope, own tenant only
 *   - Admin (no tenantId): admin_tenant scope, can target any tenant
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exportService } from './export.service';
import { EXPORT_RESOURCE_TYPES, EXPORT_FORMATS, ExportResourceType, ExportFormat } from './export-job.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('export-routes');
const router = Router();

/* ── Helpers ──────────────────────────────────────────────────────── */

function getTenantId(req: Request): string | undefined {
  return (req as Record<string, unknown>).tenantId as string | undefined;
}

function getActor(req: Request) {
  return {
    userId: ((req as Record<string, unknown>).userId as string) || 'unknown',
    email: ((req as Record<string, unknown>).userEmail as string) || 'unknown',
    type: getTenantId(req) ? 'merchant' as const : 'admin' as const,
  };
}

/* ── POST /exports — create export job ────────────────────────────── */

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantScope = getTenantId(req);
    const actor = getActor(req);
    const { resourceType, format, filters, tenantId: bodyTenantId } = req.body;

    if (!resourceType || !EXPORT_RESOURCE_TYPES.includes(resourceType)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid resourceType. Allowed: ${EXPORT_RESOURCE_TYPES.join(', ')}`,
      });
    }
    if (format && !EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid format. Allowed: ${EXPORT_FORMATS.join(', ')}`,
      });
    }

    const tenantId = tenantScope || bodyTenantId;
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'tenantId is required' });
    }

    const scope = tenantScope ? 'merchant_self' : 'admin_tenant';

    // Merchant restrictions
    if (scope === 'merchant_self' && resourceType === 'audit_logs') {
      return res.status(403).json({ ok: false, error: 'Merchants cannot export audit logs' });
    }

    const job = await exportService.createJob({
      tenantId,
      requestedBy: { userId: actor.userId, type: actor.type, email: actor.email },
      scope,
      resourceType: resourceType as ExportResourceType,
      format: (format as ExportFormat) || 'csv',
      filters,
    });

    // Process immediately (synchronous for now; can be made async with a queue later)
    const processed = await exportService.processJob(job.exportJobId);

    res.status(201).json({
      ok: true,
      export: processed || job,
    });
  } catch (err) {
    log.error('Create export failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: (err as Error).message || 'Failed to create export' });
  }
});

/* ── GET /exports — list export jobs ──────────────────────────────── */

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantScope = getTenantId(req);
    const tenantId = tenantScope || (req.query.tenantId as string);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'tenantId is required' });
    }

    // Enforce tenant scoping
    if (tenantScope && tenantId !== tenantScope) {
      return res.status(403).json({ ok: false, error: 'Cross-tenant access denied' });
    }

    const result = await exportService.listJobs(tenantId, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('List exports failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list exports' });
  }
});

/* ── GET /exports/:id — get export job details ────────────────────── */

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await exportService.getJob(req.params.id);
    if (!job) return res.status(404).json({ ok: false, error: 'Export job not found' });

    // Tenant scoping
    const tenantScope = getTenantId(req);
    if (tenantScope && job.tenantId !== tenantScope) {
      return res.status(404).json({ ok: false, error: 'Export job not found' });
    }

    res.json({ ok: true, export: job });
  } catch (err) {
    log.error('Get export failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get export' });
  }
});

/* ── GET /exports/:id/download — download the export file ─────────── */

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const tenantScope = getTenantId(req);
    const actor = getActor(req);

    const result = await exportService.getDownloadPath(
      req.params.id,
      tenantScope || null,
      actor.type,
    );

    if (!result) {
      return res.status(404).json({ ok: false, error: 'Export file not available' });
    }

    const stat = fs.statSync(result.filePath);
    if (stat.isDirectory()) {
      // For bundles, serve the manifest
      const manifestPath = path.join(result.filePath, 'tenant-metadata.json');
      if (fs.existsSync(manifestPath)) {
        return res.download(manifestPath, `${result.fileName}.json`);
      }
      return res.status(404).json({ ok: false, error: 'Bundle manifest not found' });
    }

    res.download(result.filePath, result.fileName);
  } catch (err) {
    log.error('Download export failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to download export' });
  }
});

/* ── Admin: GET /admin/tenants/:tenantId/exports ──────────────────── */

export const adminExportRouter = Router();

adminExportRouter.get('/tenants/:tenantId/exports', async (req: Request, res: Response) => {
  try {
    const result = await exportService.listJobs(req.params.tenantId, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('Admin list exports failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list exports' });
  }
});

export default router;
