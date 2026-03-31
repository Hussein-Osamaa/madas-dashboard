/**
 * Export service — job lifecycle, file generation, packaging, retention.
 *
 * Owns: ExportJob collection + generated export files.
 * Reads: all module collections (orders, products, tickets, etc.) via export-generators.
 * Never mutates business data.
 */
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  ExportJob, IExportJob, ExportScope, ExportResourceType, ExportFormat,
  EXPORT_RESOURCE_TYPES, EXPORT_RETENTION_DAYS, IExportFilters, IExportRequestor,
} from './export-job.schema';
import {
  exportOrders, exportProducts, exportCustomers, exportTickets,
  exportFinance, exportInventory, exportAuditLogs, ExportData,
} from './export-generators';
import { auditService } from '../platform-core/audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('exports');

/* ── CSV serializer ───────────────────────────────────────────────── */

function toCsv(data: ExportData): string {
  if (data.rows.length === 0) return data.columns.join(',') + '\n';
  const header = data.columns.join(',');
  const rows = data.rows.map((row) =>
    data.columns.map((col) => {
      const val = row[col];
      if (val == null) return '';
      const str = val instanceof Date ? (val as Date).toISOString() : String(val);
      // Escape CSV: quotes, commas, newlines
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}

/* ── Export directory ──────────────────────────────────────────────── */

function getExportDir(): string {
  const dir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/* ── Generator dispatch ───────────────────────────────────────────── */

const GENERATORS: Record<string, (opts: {
  tenantId: string; scope: ExportScope; filters?: IExportFilters | null;
}) => Promise<ExportData>> = {
  orders: exportOrders,
  products: exportProducts,
  customers: exportCustomers,
  tickets: exportTickets,
  finance: exportFinance,
  inventory: exportInventory,
  audit_logs: exportAuditLogs,
};

/* ── Service ──────────────────────────────────────────────────────── */

export const exportService = {

  /**
   * Create a new export job (queued). Does not process immediately.
   */
  async createJob(input: {
    tenantId: string;
    requestedBy: IExportRequestor;
    scope: ExportScope;
    resourceType: ExportResourceType;
    format?: ExportFormat;
    filters?: IExportFilters;
  }): Promise<IExportJob> {
    // Validate resource type
    if (!EXPORT_RESOURCE_TYPES.includes(input.resourceType)) {
      throw new Error(`Invalid resource type: ${input.resourceType}`);
    }

    // Merchant scope restrictions
    if (input.scope === 'merchant_self' && input.resourceType === 'audit_logs') {
      throw new Error('Merchants cannot export audit logs');
    }

    const exportJobId = `EXP-${uuidv4().slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const job = await ExportJob.create({
      exportJobId,
      tenantId: input.tenantId,
      requestedBy: input.requestedBy,
      scope: input.scope,
      resourceType: input.resourceType,
      format: input.format || 'csv',
      status: 'queued',
      filters: input.filters || null,
      expiresAt,
    });

    await auditService.log({
      actor: input.requestedBy.email || input.requestedBy.userId,
      actorType: input.requestedBy.type === 'admin' ? 'admin' : 'user',
      module: 'exports',
      action: 'export_requested',
      entityType: 'export_job',
      entityId: exportJobId,
      tenantId: input.tenantId,
      details: {
        resourceType: input.resourceType,
        scope: input.scope,
        format: input.format || 'csv',
      },
    });

    log.info(`Export job created: ${exportJobId}`, {
      tenantId: input.tenantId,
      resourceType: input.resourceType,
    });

    return job;
  },

  /**
   * Process a queued export job — generates the file.
   */
  async processJob(exportJobId: string): Promise<IExportJob | null> {
    // Atomic claim
    const job = await ExportJob.findOneAndUpdate(
      { exportJobId, status: 'queued' },
      { $set: { status: 'processing' } },
      { new: true },
    );
    if (!job) return null;

    try {
      let filePath: string;
      let fileSize: number;
      let rowCount: number;

      if (job.resourceType === 'full_tenant_bundle') {
        const result = await this._generateBundle(job);
        filePath = result.filePath;
        fileSize = result.fileSize;
        rowCount = result.rowCount;
      } else {
        const result = await this._generateSingle(job);
        filePath = result.filePath;
        fileSize = result.fileSize;
        rowCount = result.rowCount;
      }

      const updated = await ExportJob.findOneAndUpdate(
        { exportJobId },
        {
          $set: {
            status: 'completed',
            filePath,
            fileSize,
            rowCount,
            completedAt: new Date(),
          },
        },
        { new: true },
      );

      await auditService.log({
        actor: job.requestedBy.email || job.requestedBy.userId,
        actorType: job.requestedBy.type === 'admin' ? 'admin' : 'user',
        module: 'exports',
        action: 'export_completed',
        entityType: 'export_job',
        entityId: exportJobId,
        tenantId: job.tenantId,
        details: { resourceType: job.resourceType, rowCount, fileSize },
      });

      log.info(`Export completed: ${exportJobId}`, {
        tenantId: job.tenantId,
        rowCount: String(rowCount),
      });

      return updated;
    } catch (err) {
      await ExportJob.updateOne(
        { exportJobId },
        { $set: { status: 'failed', error: (err as Error).message } },
      );

      await auditService.log({
        actor: 'system',
        actorType: 'system',
        module: 'exports',
        action: 'export_failed',
        entityType: 'export_job',
        entityId: exportJobId,
        tenantId: job.tenantId,
        details: { error: (err as Error).message },
      });

      log.error(`Export failed: ${exportJobId}`, { error: (err as Error).message });
      return null;
    }
  },

  /**
   * Generate a single-resource export file.
   */
  async _generateSingle(job: IExportJob): Promise<{ filePath: string; fileSize: number; rowCount: number }> {
    const generator = GENERATORS[job.resourceType];
    if (!generator) throw new Error(`No generator for: ${job.resourceType}`);

    const data = await generator({
      tenantId: job.tenantId,
      scope: job.scope,
      filters: job.filters,
    });

    const dir = getExportDir();
    const ext = job.format === 'json' ? 'json' : 'csv';
    const fileName = `${job.exportJobId}-${job.resourceType}.${ext}`;
    const filePath = path.join(dir, fileName);

    let content: string;
    if (job.format === 'json') {
      content = JSON.stringify(data.rows, null, 2);
    } else {
      content = toCsv(data);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    const stat = fs.statSync(filePath);

    return { filePath, fileSize: stat.size, rowCount: data.rows.length };
  },

  /**
   * Generate a full tenant bundle (multiple files in a directory).
   * For simplicity, generates individual files and returns a JSON manifest.
   */
  async _generateBundle(job: IExportJob): Promise<{ filePath: string; fileSize: number; rowCount: number }> {
    const dir = getExportDir();
    const bundleDir = path.join(dir, job.exportJobId);
    if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir, { recursive: true });

    const types: Array<keyof typeof GENERATORS> = [
      'orders', 'products', 'customers', 'tickets', 'finance', 'inventory',
    ];
    // Include audit_logs only for admin exports
    if (job.scope === 'admin_tenant') types.push('audit_logs');

    let totalRows = 0;
    const manifest: Record<string, { file: string; rows: number }> = {};

    for (const type of types) {
      const generator = GENERATORS[type];
      if (!generator) continue;

      const data = await generator({
        tenantId: job.tenantId,
        scope: job.scope,
        filters: job.filters,
      });

      const fileName = `${type}.csv`;
      const filePath = path.join(bundleDir, fileName);
      fs.writeFileSync(filePath, toCsv(data), 'utf-8');

      manifest[type] = { file: fileName, rows: data.rows.length };
      totalRows += data.rows.length;
    }

    // Write tenant metadata
    const Tenant = (await import('mongoose')).default.models.Tenant;
    let tenantMeta = {};
    if (Tenant) {
      const t = await Tenant.findOne({ tenantId: job.tenantId })
        .select('tenantId plan status planActivation createdAt')
        .lean();
      tenantMeta = t || {};
    }

    const metaFile = path.join(bundleDir, 'tenant-metadata.json');
    fs.writeFileSync(metaFile, JSON.stringify({ tenant: tenantMeta, manifest, exportedAt: new Date().toISOString() }, null, 2));

    // Calculate total size
    const files = fs.readdirSync(bundleDir);
    const totalSize = files.reduce((s, f) => s + fs.statSync(path.join(bundleDir, f)).size, 0);

    return { filePath: bundleDir, fileSize: totalSize, rowCount: totalRows };
  },

  /**
   * Get a specific export job.
   */
  async getJob(exportJobId: string): Promise<IExportJob | null> {
    return ExportJob.findOne({ exportJobId }).lean<IExportJob>();
  },

  /**
   * List export jobs for a tenant.
   */
  async listJobs(tenantId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(Math.max(1, opts?.limit || 20), 100);

    const [jobs, total] = await Promise.all([
      ExportJob.find({ tenantId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IExportJob[]>(),
      ExportJob.countDocuments({ tenantId }),
    ]);

    return { jobs, total, page, limit };
  },

  /**
   * Get the file path for downloading. Returns null if not available.
   */
  async getDownloadPath(
    exportJobId: string,
    requestorTenantId: string | null,
    requestorType: 'merchant' | 'admin',
  ): Promise<{ filePath: string; fileName: string } | null> {
    const job = await ExportJob.findOne({ exportJobId }).lean<IExportJob>();
    if (!job) return null;

    // Access control
    if (requestorType === 'merchant' && job.tenantId !== requestorTenantId) {
      return null; // Cross-tenant blocked
    }
    if (job.status !== 'completed' || !job.filePath) return null;
    if (job.expiresAt && new Date() > new Date(job.expiresAt)) return null;

    // Check file exists
    if (!fs.existsSync(job.filePath)) return null;

    const isDir = fs.statSync(job.filePath).isDirectory();
    const fileName = isDir
      ? `${job.exportJobId}-bundle`
      : path.basename(job.filePath);

    // Audit download
    await auditService.log({
      actor: requestorTenantId || 'admin',
      actorType: requestorType === 'admin' ? 'admin' : 'user',
      module: 'exports',
      action: 'export_downloaded',
      entityType: 'export_job',
      entityId: exportJobId,
      tenantId: job.tenantId,
    });

    return { filePath: job.filePath, fileName };
  },

  /**
   * Expire old completed exports. Called periodically.
   */
  async expireOldExports(): Promise<number> {
    const now = new Date();
    const expired = await ExportJob.find({
      status: 'completed',
      expiresAt: { $lte: now },
    }).lean<IExportJob[]>();

    let cleaned = 0;
    for (const job of expired) {
      if (job.filePath) {
        try {
          if (fs.existsSync(job.filePath)) {
            const stat = fs.statSync(job.filePath);
            if (stat.isDirectory()) {
              fs.rmSync(job.filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(job.filePath);
            }
          }
        } catch (err) {
          log.error(`Failed to delete export file: ${job.filePath}`, { error: (err as Error).message });
        }
      }
      await ExportJob.updateOne({ exportJobId: job.exportJobId }, { $set: { status: 'expired', filePath: null } });
      cleaned++;
    }

    if (cleaned > 0) {
      log.info(`Expired ${cleaned} old export jobs`);
    }
    return cleaned;
  },
};
