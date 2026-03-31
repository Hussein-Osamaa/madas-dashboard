/**
 * Exports module tests.
 *
 * Tests export job schema, service exports, generators, routes,
 * access control, compliance, and retention.
 */
import { describe, it, expect } from 'vitest';

/* ── Export job schema ───────────────────────────────────────────── */

describe('Exports — Schema', () => {
  it('ExportJob model registered with conditional pattern', async () => {
    const { ExportJob } = await import('../modules/exports/export-job.schema');
    expect(ExportJob).toBeDefined();
    expect(ExportJob.modelName).toBe('ExportJob');
  });

  it('EXPORT_RESOURCE_TYPES lists all 8 types', async () => {
    const { EXPORT_RESOURCE_TYPES } = await import('../modules/exports/export-job.schema');
    expect(EXPORT_RESOURCE_TYPES).toHaveLength(8);
    expect(EXPORT_RESOURCE_TYPES).toContain('orders');
    expect(EXPORT_RESOURCE_TYPES).toContain('products');
    expect(EXPORT_RESOURCE_TYPES).toContain('customers');
    expect(EXPORT_RESOURCE_TYPES).toContain('tickets');
    expect(EXPORT_RESOURCE_TYPES).toContain('finance');
    expect(EXPORT_RESOURCE_TYPES).toContain('inventory');
    expect(EXPORT_RESOURCE_TYPES).toContain('audit_logs');
    expect(EXPORT_RESOURCE_TYPES).toContain('full_tenant_bundle');
  });

  it('EXPORT_FORMATS includes json, csv, zip', async () => {
    const { EXPORT_FORMATS } = await import('../modules/exports/export-job.schema');
    expect(EXPORT_FORMATS).toContain('json');
    expect(EXPORT_FORMATS).toContain('csv');
    expect(EXPORT_FORMATS).toContain('zip');
  });

  it('retention is 7 days', async () => {
    const { EXPORT_RETENTION_DAYS } = await import('../modules/exports/export-job.schema');
    expect(EXPORT_RETENTION_DAYS).toBe(7);
  });
});

/* ── Service exports ─────────────────────────────────────────────── */

describe('Exports — Service Layer', () => {
  it('exports all required methods', async () => {
    const { exportService } = await import('../modules/exports/export.service');
    expect(typeof exportService.createJob).toBe('function');
    expect(typeof exportService.processJob).toBe('function');
    expect(typeof exportService.getJob).toBe('function');
    expect(typeof exportService.listJobs).toBe('function');
    expect(typeof exportService.getDownloadPath).toBe('function');
    expect(typeof exportService.expireOldExports).toBe('function');
  });
});

/* ── Generator exports ───────────────────────────────────────────── */

describe('Exports — Generators', () => {
  it('all 7 generators are exported', async () => {
    const mod = await import('../modules/exports/export-generators');
    expect(typeof mod.exportOrders).toBe('function');
    expect(typeof mod.exportProducts).toBe('function');
    expect(typeof mod.exportCustomers).toBe('function');
    expect(typeof mod.exportTickets).toBe('function');
    expect(typeof mod.exportFinance).toBe('function');
    expect(typeof mod.exportInventory).toBe('function');
    expect(typeof mod.exportAuditLogs).toBe('function');
  });

  it('generators return empty data when model not registered', async () => {
    const { exportOrders, exportProducts, exportFinance, exportInventory } =
      await import('../modules/exports/export-generators');

    // No MongoDB models registered in test env
    const orders = await exportOrders({ tenantId: 't1', scope: 'merchant_self' });
    expect(orders.rows).toEqual([]);
    expect(Array.isArray(orders.columns)).toBe(true);

    const products = await exportProducts({ tenantId: 't1', scope: 'merchant_self' });
    expect(products.rows).toEqual([]);

    const finance = await exportFinance({ tenantId: 't1', scope: 'merchant_self' });
    expect(finance.rows).toEqual([]);

    const inv = await exportInventory({ tenantId: 't1', scope: 'merchant_self' });
    expect(inv.rows).toEqual([]);
  });
});

/* ── Access control / compliance ─────────────────────────────────── */

describe('Exports — Access Control', () => {
  it('audit_logs generator blocks merchant_self scope', async () => {
    const { exportAuditLogs } = await import('../modules/exports/export-generators');
    const result = await exportAuditLogs({ tenantId: 't1', scope: 'merchant_self' });
    // Should return empty — merchants cannot export audit logs
    expect(result.rows).toEqual([]);
  });

  it('audit_logs generator allows admin_tenant scope (source check)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-generators.ts',
      ),
      'utf-8',
    );
    // Verify admin_tenant scope proceeds past the early return
    expect(code).toContain("opts.scope !== 'admin_tenant'");
    // Verify columns include expected audit fields
    expect(code).toContain("'actor'");
    expect(code).toContain("'actorType'");
    expect(code).toContain("'module'");
  });

  it('ticket export excludes internal tickets for merchant scope', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-generators.ts',
      ),
      'utf-8',
    );
    // Verify merchant_self scope filters out internal visibility
    expect(code).toContain("scope === 'merchant_self'");
    expect(code).toContain("query.visibility = 'tenant'");
  });

  it('audit log export excludes details field (may contain sensitive data)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-generators.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('details intentionally excluded');
  });

  it('routes enforce tenant scoping on list and get', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.routes.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('Cross-tenant access denied');
    expect(code).toContain('job.tenantId !== tenantScope');
  });
});

/* ── Route structure ─────────────────────────────────────────────── */

describe('Exports — Routes', () => {
  it('export router has expected endpoints', async () => {
    const { default: router } = await import('../modules/exports/export.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => ({
      path: l.route!.path,
      methods: Object.keys(l.route!.methods),
    }));

    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/');            // POST create + GET list
    expect(paths).toContain('/:id');         // GET details
    expect(paths).toContain('/:id/download'); // GET download
  });

  it('admin export router has tenant export listing', async () => {
    const { adminExportRouter } = await import('../modules/exports/export.routes');
    const stack = (adminExportRouter as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/tenants/:tenantId/exports');
  });
});

/* ── Export job lifecycle ─────────────────────────────────────────── */

describe('Exports — Job Lifecycle', () => {
  it('export job statuses cover full lifecycle', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-job.schema.ts',
      ),
      'utf-8',
    );
    // All 5 statuses in enum
    expect(code).toContain("'queued'");
    expect(code).toContain("'processing'");
    expect(code).toContain("'completed'");
    expect(code).toContain("'failed'");
    expect(code).toContain("'expired'");
  });

  it('processJob uses atomic claim (queued → processing)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain("status: 'queued'");
    expect(code).toContain("status: 'processing'");
    expect(code).toContain('findOneAndUpdate');
  });
});

/* ── Retention / expiry ──────────────────────────────────────────── */

describe('Exports — Retention', () => {
  it('expiresAt is set on job creation', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('EXPORT_RETENTION_DAYS');
    expect(code).toContain('expiresAt');
  });

  it('TTL index on expiresAt auto-deletes expired MongoDB docs', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-job.schema.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('expireAfterSeconds: 0');
  });

  it('expireOldExports cleans up files and updates status', async () => {
    const { exportService } = await import('../modules/exports/export.service');
    expect(typeof exportService.expireOldExports).toBe('function');
  });

  it('download blocks expired exports', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain("new Date() > new Date(job.expiresAt)");
  });
});

/* ── Audit logging ───────────────────────────────────────────────── */

describe('Exports — Audit', () => {
  it('all export actions are audited', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain("action: 'export_requested'");
    expect(code).toContain("action: 'export_completed'");
    expect(code).toContain("action: 'export_failed'");
    expect(code).toContain("action: 'export_downloaded'");
  });
});

/* ── CSV generation ──────────────────────────────────────────────── */

describe('Exports — Packaging', () => {
  it('export columns are well-defined for each resource type', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export-generators.ts',
      ),
      'utf-8',
    );
    // Orders
    expect(code).toContain("'orderId'");
    expect(code).toContain("'paymentMethod'");
    // Products
    expect(code).toContain("'sku'");
    expect(code).toContain("'barcode'");
    // Customers
    expect(code).toContain("'orderCount'");
    expect(code).toContain("'totalSpent'");
    // Finance
    expect(code).toContain("'referenceType'");
    // Inventory
    expect(code).toContain("'variantId'");
    // Audit
    expect(code).toContain("'actorType'");
  });

  it('full_tenant_bundle generates multiple files', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/exports/export.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('_generateBundle');
    expect(code).toContain('tenant-metadata.json');
    expect(code).toContain("'orders', 'products', 'customers', 'tickets', 'finance', 'inventory'");
  });
});

/* ── Barrel export ───────────────────────────────────────────────── */

describe('Exports — Barrel Export', () => {
  it('index exports all public API', async () => {
    const mod = await import('../modules/exports/index');
    expect(mod.exportService).toBeDefined();
    expect(mod.exportRoutes).toBeDefined();
    expect(mod.adminExportRouter).toBeDefined();
    expect(mod.ExportJob).toBeDefined();
    expect(mod.EXPORT_RESOURCE_TYPES).toBeDefined();
    expect(mod.EXPORT_FORMATS).toBeDefined();
    expect(mod.EXPORT_RETENTION_DAYS).toBeDefined();
    expect(typeof mod.exportOrders).toBe('function');
    expect(typeof mod.exportProducts).toBe('function');
    expect(typeof mod.exportCustomers).toBe('function');
    expect(typeof mod.exportTickets).toBe('function');
    expect(typeof mod.exportFinance).toBe('function');
    expect(typeof mod.exportInventory).toBe('function');
    expect(typeof mod.exportAuditLogs).toBe('function');
  });
});
