/**
 * Reporting module P2 tests.
 *
 * Unit tests for report-helpers + integration structure tests.
 * Service-level tests verify aggregation pipeline construction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── report-helpers tests ────────────────────────────────────────── */

describe('Reporting — report-helpers', () => {
  it('parseFilters extracts query params correctly', async () => {
    const { parseFilters } = await import('../modules/reporting/report-helpers');
    const filters = parseFilters({
      tenantId: 't1',
      businessId: 'b1',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'month',
      limit: '25',
      page: '2',
    });

    expect(filters.tenantId).toBe('t1');
    expect(filters.businessId).toBe('b1');
    expect(filters.groupBy).toBe('month');
    expect(filters.limit).toBe(25);
    expect(filters.page).toBe(2);
    expect(filters.dateRange?.from).toBeInstanceOf(Date);
    expect(filters.dateRange?.to).toBeInstanceOf(Date);
  });

  it('buildMatch creates correct filter with tenant + date range', async () => {
    const { buildMatch } = await import('../modules/reporting/report-helpers');
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');
    const match = buildMatch({ tenantId: 't1', dateRange: { from, to } });

    expect(match.tenantId).toBe('t1');
    expect((match.createdAt as Record<string, Date>).$gte).toEqual(from);
    expect((match.createdAt as Record<string, Date>).$lte).toEqual(to);
  });

  it('buildMatch omits undefined fields', async () => {
    const { buildMatch } = await import('../modules/reporting/report-helpers');
    const match = buildMatch({});
    expect(Object.keys(match)).toHaveLength(0);
  });

  it('dateGroupExpr produces correct grouping for day/week/month', async () => {
    const { dateGroupExpr } = await import('../modules/reporting/report-helpers');

    const day = dateGroupExpr('createdAt', 'day');
    expect(day).toHaveProperty('year');
    expect(day).toHaveProperty('month');
    expect(day).toHaveProperty('day');

    const week = dateGroupExpr('createdAt', 'week');
    expect(week).toHaveProperty('year');
    expect(week).toHaveProperty('week');
    expect(week).not.toHaveProperty('day');

    const month = dateGroupExpr('createdAt', 'month');
    expect(month).toHaveProperty('year');
    expect(month).toHaveProperty('month');
    expect(month).not.toHaveProperty('day');
  });

  it('defaultDateRange returns 30-day window', async () => {
    const { defaultDateRange } = await import('../modules/reporting/report-helpers');
    const { from, to } = defaultDateRange();
    const diff = to.getTime() - from.getTime();
    expect(Math.abs(diff - 30 * 86400000)).toBeLessThan(1000);
  });

  it('parseDateRange returns undefined when no dates given', async () => {
    const { parseDateRange } = await import('../modules/reporting/report-helpers');
    expect(parseDateRange()).toBeUndefined();
  });

  it('parseDateRange defaults from to 30 days ago when only to given', async () => {
    const { parseDateRange } = await import('../modules/reporting/report-helpers');
    const dr = parseDateRange(undefined, '2026-06-01');
    expect(dr).toBeDefined();
    expect(dr!.to.toISOString().startsWith('2026-06-01')).toBe(true);
  });

  it('buildMatch supports custom dateField', async () => {
    const { buildMatch } = await import('../modules/reporting/report-helpers');
    const dr = { from: new Date('2026-01-01'), to: new Date('2026-12-31') };
    const match = buildMatch({ dateRange: dr }, 'timestamp');
    expect(match.timestamp).toBeDefined();
    expect(match.createdAt).toBeUndefined();
  });

  it('paginationStages enforces min/max limits', async () => {
    const { paginationStages } = await import('../modules/reporting/report-helpers');

    const stages = paginationStages({ limit: 500, page: 3 });
    expect(stages).toHaveLength(2);
    // $skip = (3-1) * 200 (capped)
    expect((stages[0] as Record<string, number>).$skip).toBe(400);
    // $limit capped at 200
    expect((stages[1] as Record<string, number>).$limit).toBe(200);
  });

  it('parseFilters defaults to day groupBy', async () => {
    const { parseFilters } = await import('../modules/reporting/report-helpers');
    const f = parseFilters({});
    expect(f.groupBy).toBe('day');
    expect(f.limit).toBe(50);
    expect(f.page).toBe(1);
  });
});

/* ── Revenue report structure ────────────────────────────────────── */

describe('Reporting — Revenue (structure)', () => {
  it('revenueReports exports expected methods', async () => {
    const { revenueReports } = await import('../modules/reporting/revenue.reports');
    expect(typeof revenueReports.summary).toBe('function');
    expect(typeof revenueReports.byTenant).toBe('function');
    expect(typeof revenueReports.byPaymentMethod).toBe('function');
    expect(typeof revenueReports.trend).toBe('function');
    expect(typeof revenueReports.receivablesAging).toBe('function');
  });
});

/* ── Order report structure ──────────────────────────────────────── */

describe('Reporting — Orders (structure)', () => {
  it('orderReports exports expected methods', async () => {
    const { orderReports } = await import('../modules/reporting/order.reports');
    expect(typeof orderReports.summary).toBe('function');
    expect(typeof orderReports.byPaymentMethod).toBe('function');
    expect(typeof orderReports.byTenant).toBe('function');
    expect(typeof orderReports.trend).toBe('function');
    expect(typeof orderReports.topProducts).toBe('function');
  });
});

/* ── Inventory report structure ──────────────────────────────────── */

describe('Reporting — Inventory (structure)', () => {
  it('inventoryReports exports expected methods', async () => {
    const { inventoryReports } = await import('../modules/reporting/inventory.reports');
    expect(typeof inventoryReports.summary).toBe('function');
    expect(typeof inventoryReports.lowStock).toBe('function');
    expect(typeof inventoryReports.movementTrend).toBe('function');
    expect(typeof inventoryReports.mostReserved).toBe('function');
    expect(typeof inventoryReports.productVelocity).toBe('function');
  });
});

/* ── Fulfillment report structure ────────────────────────────────── */

describe('Reporting — Fulfillment (structure)', () => {
  it('fulfillmentReports exports expected methods', async () => {
    const { fulfillmentReports } = await import('../modules/reporting/fulfillment.reports');
    expect(typeof fulfillmentReports.summary).toBe('function');
    expect(typeof fulfillmentReports.slaBreaches).toBe('function');
    expect(typeof fulfillmentReports.byStaff).toBe('function');
    expect(typeof fulfillmentReports.trend).toBe('function');
  });
});

/* ── Shipping report structure ───────────────────────────────────── */

describe('Reporting — Shipping (structure)', () => {
  it('shippingReports exports expected methods', async () => {
    const { shippingReports } = await import('../modules/reporting/shipping.reports');
    expect(typeof shippingReports.summary).toBe('function');
    expect(typeof shippingReports.carrierPerformance).toBe('function');
    expect(typeof shippingReports.failedDeliveries).toBe('function');
    expect(typeof shippingReports.codCollection).toBe('function');
    expect(typeof shippingReports.trend).toBe('function');
  });
});

/* ── Notification report structure ───────────────────────────────── */

describe('Reporting — Notifications (structure)', () => {
  it('notificationReports exports expected methods', async () => {
    const { notificationReports } = await import('../modules/reporting/notification.reports');
    expect(typeof notificationReports.summary).toBe('function');
    expect(typeof notificationReports.byChannel).toBe('function');
    expect(typeof notificationReports.trend).toBe('function');
    expect(typeof notificationReports.failedDetails).toBe('function');
    expect(typeof notificationReports.templateUsage).toBe('function');
  });
});

/* ── Tenant report structure ─────────────────────────────────────── */

describe('Reporting — Tenants (structure)', () => {
  it('tenantReports exports expected methods', async () => {
    const { tenantReports } = await import('../modules/reporting/tenant.reports');
    expect(typeof tenantReports.summary).toBe('function');
    expect(typeof tenantReports.graceReport).toBe('function');
    expect(typeof tenantReports.churn).toBe('function');
    expect(typeof tenantReports.planChanges).toBe('function');
    expect(typeof tenantReports.planDistribution).toBe('function');
  });
});

/* ── Dashboard / barrel export ───────────────────────────────────── */

describe('Reporting — Dashboard & Barrel Export', () => {
  it('barrel export includes all report modules', async () => {
    const mod = await import('../modules/reporting/index');
    expect(mod.revenueReports).toBeDefined();
    expect(mod.orderReports).toBeDefined();
    expect(mod.inventoryReports).toBeDefined();
    expect(mod.fulfillmentReports).toBeDefined();
    expect(mod.shippingReports).toBeDefined();
    expect(mod.notificationReports).toBeDefined();
    expect(mod.tenantReports).toBeDefined();
    expect(mod.reportingRoutes).toBeDefined();
  });

  it('barrel export includes helper functions', async () => {
    const mod = await import('../modules/reporting/index');
    expect(typeof mod.parseFilters).toBe('function');
    expect(typeof mod.buildMatch).toBe('function');
    expect(typeof mod.dateGroupExpr).toBe('function');
    expect(typeof mod.defaultDateRange).toBe('function');
    expect(typeof mod.parseDateRange).toBe('function');
  });
});

/* ── Route structure ─────────────────────────────────────────────── */

describe('Reporting — Routes', () => {
  it('reporting router has expected route paths', async () => {
    const { default: router } = await import('../modules/reporting/reporting.routes');
    // Express Router stores routes in router.stack
    const routes = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route!.path,
        method: Object.keys(layer.route!.methods)[0],
      }));

    // Verify key routes exist
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/revenue');
    expect(paths).toContain('/revenue/aging');
    expect(paths).toContain('/orders');
    expect(paths).toContain('/orders/top-products');
    expect(paths).toContain('/inventory');
    expect(paths).toContain('/inventory/low-stock');
    expect(paths).toContain('/fulfillment');
    expect(paths).toContain('/fulfillment/sla-breaches');
    expect(paths).toContain('/shipping');
    expect(paths).toContain('/shipping/carrier-performance');
    expect(paths).toContain('/shipping/cod');
    expect(paths).toContain('/notifications');
    expect(paths).toContain('/notifications/by-channel');
    expect(paths).toContain('/tenants');
    expect(paths).toContain('/tenants/churn');
    expect(paths).toContain('/tenants/plan-distribution');
    expect(paths).toContain('/dashboard');

    // All routes are GET
    expect(routes.every((r) => r.method === 'get')).toBe(true);
  });

  it('has at least 30 report routes', async () => {
    const { default: router } = await import('../modules/reporting/reporting.routes');
    const routes = (router as unknown as { stack: Array<{ route?: unknown }> }).stack
      .filter((layer) => layer.route);
    // 30 GET routes defined; Express may add more for HEAD
    expect(routes.length).toBeGreaterThanOrEqual(30);
  });
});
