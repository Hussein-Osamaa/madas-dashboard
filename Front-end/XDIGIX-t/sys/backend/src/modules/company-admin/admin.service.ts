import { Tenant } from '../platform-core/tenant.schema';
import { tenantService } from '../platform-core/tenant.service';
import { featureFlagService } from '../platform-core/feature-flag.service';
import { healthService } from '../platform-core/health.service';
import { auditService } from '../platform-core/audit.service';
import { AdminPreferences, IAdminPreferences } from './admin-preferences.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('company-admin');

// ---------------------------------------------------------------------------
// Company Admin Service
//
// CONTROL LAYER — owns no business data except AdminPreferences.
// All reads aggregate from existing module collections via lazy imports.
// All writes delegate to the owning module's service.
// ---------------------------------------------------------------------------

export const adminService = {
  // ── Tenant Overview (read-only) ──────────────────────────────────

  async getTenantOverview() {
    const [total, active, suspended, cancelled, byPlan, recentGrace] =
      await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        Tenant.countDocuments({ status: 'suspended' }),
        Tenant.countDocuments({ status: 'cancelled' }),
        Tenant.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
        Tenant.find({ planActivation: 'grace' })
          .sort({ graceExpiresAt: 1 })
          .limit(10)
          .lean(),
      ]);
    return { total, active, suspended, cancelled, byPlan, recentGrace };
  },

  // ── Order Pipeline (read-only) ───────────────────────────────────

  async getOrderPipeline(filters?: {
    tenantId?: string;
    from?: Date;
    to?: Date;
  }) {
    const { StorefrontOrder } = await import(
      '../../schemas/storefront-order.schema'
    );
    const match: Record<string, unknown> = {};
    if (filters?.tenantId) match.tenantId = filters.tenantId;
    if (filters?.from || filters?.to) {
      const dateFilter: Record<string, Date> = {};
      if (filters!.from) dateFilter.$gte = filters!.from;
      if (filters!.to) dateFilter.$lte = filters!.to;
      match.createdAt = dateFilter;
    }

    const [statusCounts, recentProblematic] = await Promise.all([
      StorefrontOrder.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      StorefrontOrder.find({
        ...match,
        status: { $in: ['failed', 'expired'] },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return {
      statusCounts: statusCounts.reduce(
        (acc: Record<string, number>, r: { _id: string; count: number }) => {
          acc[r._id] = r.count;
          return acc;
        },
        {},
      ),
      recentProblematic,
    };
  },

  // ── Fulfillment Monitor (read-only) ──────────────────────────────

  async getFulfillmentMonitor(filters?: { tenantId?: string }) {
    const { FulfillmentJob } = await import(
      '../fulfillment/fulfillment-job.schema'
    );
    const match: Record<string, unknown> = {};
    if (filters?.tenantId) match.tenantId = filters.tenantId;

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const [statusCounts, overdueJobs, urgentJobs] = await Promise.all([
      FulfillmentJob.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FulfillmentJob.find({
        ...match,
        status: { $in: ['created', 'picking', 'packing'] },
        createdAt: { $lt: fourHoursAgo },
      })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean(),
      FulfillmentJob.find({
        ...match,
        priority: 'urgent',
        status: { $nin: ['handed_to_shipping', 'cancelled'] },
      })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean(),
    ]);

    return {
      statusCounts: statusCounts.reduce(
        (acc: Record<string, number>, r: { _id: string; count: number }) => {
          acc[r._id] = r.count;
          return acc;
        },
        {},
      ),
      overdueJobs,
      urgentJobs,
    };
  },

  // ── Shipping Tracker (read-only) ─────────────────────────────────

  async getShippingTracker(filters?: { tenantId?: string }) {
    const { Shipment } = await import(
      '../shipping-module/shipment.schema'
    );
    const match: Record<string, unknown> = {};
    if (filters?.tenantId) match.tenantId = filters.tenantId;

    const [statusCounts, recentFailed, recentCod] = await Promise.all([
      Shipment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Shipment.find({ ...match, status: 'failed_delivery' })
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      Shipment.find({ ...match, codAmount: { $gt: 0 } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return {
      statusCounts: statusCounts.reduce(
        (acc: Record<string, number>, r: { _id: string; count: number }) => {
          acc[r._id] = r.count;
          return acc;
        },
        {},
      ),
      recentFailed,
      recentCod,
    };
  },

  // ── Revenue Overview (read-only) ─────────────────────────────────

  async getRevenueOverview(filters?: { tenantId?: string }) {
    const { LedgerEntry } = await import('../finance/ledger-entry.schema');
    const { Invoice } = await import('../finance/invoice.schema');
    const match: Record<string, unknown> = {};
    if (filters?.tenantId) match.tenantId = filters.tenantId;

    const [receivables, recognized, overdueInvoices] = await Promise.all([
      LedgerEntry.aggregate([
        {
          $match: {
            ...match,
            type: 'revenue_receivable',
            status: { $in: ['pending', 'accrued'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { ...match, type: 'revenue_recognized' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Invoice.find({ ...match, status: 'overdue' })
        .sort({ dueDate: 1 })
        .limit(10)
        .lean(),
    ]);

    return {
      receivables: receivables[0] ?? { total: 0, count: 0 },
      recognized: recognized[0] ?? { total: 0, count: 0 },
      overdueInvoices,
    };
  },

  // ── Audit Trail (read-only) ──────────────────────────────────────

  async getAuditTrail(filters?: {
    tenantId?: string;
    module?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    return auditService.query({
      tenantId: filters?.tenantId,
      module: filters?.module,
      from: filters?.from,
      to: filters?.to,
      limit: filters?.limit ?? 50,
    });
  },

  // ── Feature Flags ────────────────────────────────────────────────

  async getFeatureFlags(tenantId: string) {
    return featureFlagService.listTenantFlags(tenantId);
  },

  async setFeatureFlag(
    tenantId: string,
    flagName: string,
    enabled: boolean,
    actor: string,
  ) {
    await featureFlagService.setFeatureFlag(tenantId, flagName, enabled, actor);
    log.info('Feature flag updated via admin', {
      tenantId,
      flagName,
      enabled,
      actor,
    });
  },

  // ── System Health ────────────────────────────────────────────────

  async getSystemHealth() {
    return healthService.checkHealth();
  },

  // ── Admin Preferences (only owned data) ──────────────────────────

  async getPreferences(adminUserId: string) {
    const prefs = await AdminPreferences.findOne({ adminUserId }).lean();
    if (!prefs) {
      const created = await AdminPreferences.create({ adminUserId });
      return created.toObject() as ReturnType<typeof AdminPreferences.prototype.toObject>;
    }
    return prefs;
  },

  async updatePreferences(
    adminUserId: string,
    updates: Partial<Pick<IAdminPreferences, 'dashboardLayout' | 'savedViews' | 'notificationPrefs'>>,
  ) {
    return AdminPreferences.findOneAndUpdate(
      { adminUserId },
      { $set: updates },
      { new: true, upsert: true },
    ).lean();
  },

  // ── Control Actions (writes through module services) ─────────────

  async suspendTenant(tenantId: string, reason: string, actor: string) {
    await tenantService.suspendTenant(tenantId, reason, actor);
    log.info('Tenant suspended via admin', { tenantId, actor, reason });
  },

  async activateTenant(tenantId: string, actor: string) {
    await tenantService.activateTenant(tenantId, actor);
    log.info('Tenant activated via admin', { tenantId, actor });
  },

  async changePlan(tenantId: string, planId: string, actor: string) {
    await tenantService.changePlan(tenantId, planId, actor);
    log.info('Tenant plan changed via admin', { tenantId, planId, actor });
  },

  async activateWithGrace(
    tenantId: string,
    planId: string,
    graceDays: number,
    reason: string,
    category: string,
    actor: string,
  ) {
    await tenantService.activateWithGrace(
      tenantId,
      planId,
      graceDays,
      reason,
      category,
      actor,
    );
    log.info('Tenant activated with grace via admin', {
      tenantId,
      planId,
      graceDays,
      actor,
    });
  },

  async unpublishSite(siteId: string, reason: string, actor: string) {
    const { builderService } = await import('../builder/builder.service');
    await builderService.unpublishSite(siteId, reason, actor);
    log.info('Site unpublished via admin', { siteId, actor, reason });
  },

  async cancelOrder(orderId: string, reason: string, actor: string) {
    const { ordersService } = await import('../orders/orders.service');
    await ordersService.cancelOrder(orderId, reason, actor);
    log.info('Order cancelled via admin', { orderId, actor, reason });
  },

  async escalateFulfillment(
    jobId: string,
    priority: string,
    reason: string,
    actor: string,
  ) {
    const { fulfillmentService } = await import(
      '../fulfillment/fulfillment.service'
    );
    await fulfillmentService.escalate(
      jobId,
      priority as 'normal' | 'high' | 'urgent',
      reason,
      actor,
    );
    log.info('Fulfillment job escalated via admin', {
      jobId,
      priority,
      actor,
      reason,
    });
  },

  async manualShipmentTracking(
    shipmentId: string,
    status: string,
    actor: string,
  ) {
    const { shippingService } = await import(
      '../shipping-module/shipping.service'
    );
    await shippingService.manualTracking(shipmentId, status as any, actor);
    log.info('Shipment tracking updated via admin', {
      shipmentId,
      status,
      actor,
    });
  },
};
