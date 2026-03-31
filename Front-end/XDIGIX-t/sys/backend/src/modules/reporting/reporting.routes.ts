/**
 * Reporting API routes.
 *
 * All endpoints are read-only. Require admin auth (tenantId from JWT).
 * Super-admin (no tenantId) can query across all tenants.
 * Merchant-level requests are automatically scoped to their tenant.
 *
 * Query params shared across all reports:
 *   from, to     — ISO date strings for date range (default: last 30 days)
 *   groupBy      — 'day' | 'week' | 'month' (default: 'day')
 *   tenantId     — override tenant scope (super-admin only)
 *   businessId   — optional business filter
 *   limit        — max rows (default: 50, max: 200)
 *   page         — pagination page (default: 1)
 */

import { Router, Request, Response } from 'express';
import { revenueReports } from './revenue.reports';
import { orderReports } from './order.reports';
import { inventoryReports } from './inventory.reports';
import { fulfillmentReports } from './fulfillment.reports';
import { shippingReports } from './shipping.reports';
import { notificationReports } from './notification.reports';
import { tenantReports } from './tenant.reports';
import { parseFilters, ReportFilters } from './report-helpers';
import { createLogger } from '../../lib/logger';

const log = createLogger('reporting');
const router = Router();

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Resolve filters: merchant sees only own data; super-admin can query all. */
function resolveFilters(req: Request): ReportFilters {
  const filters = parseFilters(req.query as Record<string, unknown>);
  // Enforce tenant scoping for non-super-admin
  const reqTenantId = (req as Record<string, unknown>).tenantId as string | undefined;
  if (reqTenantId) {
    filters.tenantId = reqTenantId; // Override — merchants can only see own data
  }
  return filters;
}

/** Wrap handler with timing + error handling. */
function reportHandler(
  reportName: string,
  fn: (filters: ReportFilters, req: Request) => Promise<unknown>,
) {
  return async (req: Request, res: Response) => {
    const start = Date.now();
    const filters = resolveFilters(req);
    try {
      const data = await fn(filters, req);
      const durationMs = Date.now() - start;

      // Log slow reports
      if (durationMs > 3000) {
        log.warn(`Slow report: ${reportName}`, {
          durationMs: String(durationMs),
          tenantId: filters.tenantId,
        });
      }

      log.info(`Report generated: ${reportName}`, {
        durationMs: String(durationMs),
        tenantId: filters.tenantId || 'all',
      });

      res.json({ ok: true, report: reportName, durationMs, data });
    } catch (err) {
      log.error(`Report failed: ${reportName}`, { error: (err as Error).message });
      res.status(500).json({ ok: false, error: 'Report generation failed' });
    }
  };
}

/* ── Revenue ──────────────────────────────────────────────────────── */

router.get('/revenue', reportHandler('revenue.summary', (f) => revenueReports.summary(f)));
router.get('/revenue/by-tenant', reportHandler('revenue.byTenant', (f) => revenueReports.byTenant(f)));
router.get('/revenue/by-payment-method', reportHandler('revenue.byPaymentMethod', (f) => revenueReports.byPaymentMethod(f)));
router.get('/revenue/trend', reportHandler('revenue.trend', (f) => revenueReports.trend(f)));
router.get('/revenue/aging', reportHandler('revenue.aging', (f) => revenueReports.receivablesAging(f)));

/* ── Orders ───────────────────────────────────────────────────────── */

router.get('/orders', reportHandler('orders.summary', (f) => orderReports.summary(f)));
router.get('/orders/by-payment-method', reportHandler('orders.byPaymentMethod', (f) => orderReports.byPaymentMethod(f)));
router.get('/orders/by-tenant', reportHandler('orders.byTenant', (f) => orderReports.byTenant(f)));
router.get('/orders/trend', reportHandler('orders.trend', (f) => orderReports.trend(f)));
router.get('/orders/top-products', reportHandler('orders.topProducts', (f) => orderReports.topProducts(f)));

/* ── Inventory ────────────────────────────────────────────────────── */

router.get('/inventory', reportHandler('inventory.summary', (f) => inventoryReports.summary(f)));
router.get('/inventory/low-stock', reportHandler('inventory.lowStock', (f) => inventoryReports.lowStock(f)));
router.get('/inventory/movement-trend', reportHandler('inventory.movementTrend', (f) => inventoryReports.movementTrend(f)));
router.get('/inventory/most-reserved', reportHandler('inventory.mostReserved', (f) => inventoryReports.mostReserved(f)));
router.get('/inventory/fastest-moving', reportHandler('inventory.fastest', (f) => inventoryReports.productVelocity(f, 'fastest')));
router.get('/inventory/slowest-moving', reportHandler('inventory.slowest', (f) => inventoryReports.productVelocity(f, 'slowest')));

/* ── Fulfillment ──────────────────────────────────────────────────── */

router.get('/fulfillment', reportHandler('fulfillment.summary', (f) => fulfillmentReports.summary(f)));
router.get('/fulfillment/sla-breaches', reportHandler('fulfillment.slaBreaches', (f, req) => {
  const hours = Number(req.query.thresholdHours) || 24;
  return fulfillmentReports.slaBreaches(f, hours);
}));
router.get('/fulfillment/by-staff', reportHandler('fulfillment.byStaff', (f) => fulfillmentReports.byStaff(f)));
router.get('/fulfillment/trend', reportHandler('fulfillment.trend', (f) => fulfillmentReports.trend(f)));

/* ── Shipping ─────────────────────────────────────────────────────── */

router.get('/shipping', reportHandler('shipping.summary', (f) => shippingReports.summary(f)));
router.get('/shipping/carrier-performance', reportHandler('shipping.carrierPerformance', (f) => shippingReports.carrierPerformance(f)));
router.get('/shipping/failed-deliveries', reportHandler('shipping.failedDeliveries', (f) => shippingReports.failedDeliveries(f)));
router.get('/shipping/cod', reportHandler('shipping.cod', (f) => shippingReports.codCollection(f)));
router.get('/shipping/trend', reportHandler('shipping.trend', (f) => shippingReports.trend(f)));

/* ── Notifications ────────────────────────────────────────────────── */

router.get('/notifications', reportHandler('notifications.summary', (f) => notificationReports.summary(f)));
router.get('/notifications/by-channel', reportHandler('notifications.byChannel', (f) => notificationReports.byChannel(f)));
router.get('/notifications/trend', reportHandler('notifications.trend', (f) => notificationReports.trend(f)));
router.get('/notifications/failed', reportHandler('notifications.failed', (f) => notificationReports.failedDetails(f)));
router.get('/notifications/templates', reportHandler('notifications.templates', (f) => notificationReports.templateUsage(f)));

/* ── Tenants / SaaS ───────────────────────────────────────────────── */

router.get('/tenants', reportHandler('tenants.summary', (f) => tenantReports.summary(f)));
router.get('/tenants/grace', reportHandler('tenants.grace', () => tenantReports.graceReport()));
router.get('/tenants/churn', reportHandler('tenants.churn', (f) => tenantReports.churn(f)));
router.get('/tenants/plan-changes', reportHandler('tenants.planChanges', (f) => tenantReports.planChanges(f)));
router.get('/tenants/plan-distribution', reportHandler('tenants.planDistribution', () => tenantReports.planDistribution()));

/* ── Dashboard (aggregate summary) ────────────────────────────────── */

router.get('/dashboard', reportHandler('dashboard', async (filters) => {
  const [revenue, orders, inventory, fulfillment, shipping, notifications, tenants] =
    await Promise.all([
      revenueReports.summary(filters),
      orderReports.summary(filters),
      inventoryReports.summary(filters),
      fulfillmentReports.summary(filters),
      shippingReports.summary(filters),
      notificationReports.summary(filters),
      tenantReports.summary(filters),
    ]);

  return { revenue, orders, inventory, fulfillment, shipping, notifications, tenants };
}));

export default router;
