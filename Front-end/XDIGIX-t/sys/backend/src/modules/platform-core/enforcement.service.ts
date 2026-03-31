/**
 * Plan enforcement service — centralized limit checking + usage counting.
 *
 * Single source of truth for "can this tenant do X?"
 * Called at write boundaries in owning module services.
 * Never mutates business data — only reads counts and compares to plan limits.
 */
import mongoose from 'mongoose';
import { Tenant, ITenant } from './tenant.schema';
import { Plan, IPlan, IPlanLimits } from './plan.schema';
import { featureFlagService } from './feature-flag.service';
import { auditService } from './audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('enforcement');

/* ── Error model ──────────────────────────────────────────────────── */

export class PlanLimitError extends Error {
  code = 'PLAN_LIMIT_EXCEEDED';
  statusCode = 403;
  resource: string;
  currentUsage: number;
  allowedLimit: number;
  plan: string;
  tenantId: string;

  constructor(opts: {
    resource: string;
    currentUsage: number;
    allowedLimit: number;
    plan: string;
    tenantId: string;
    message?: string;
  }) {
    super(
      opts.message ||
        `Plan limit exceeded: ${opts.resource} (${opts.currentUsage}/${opts.allowedLimit}) on plan "${opts.plan}"`,
    );
    this.resource = opts.resource;
    this.currentUsage = opts.currentUsage;
    this.allowedLimit = opts.allowedLimit;
    this.plan = opts.plan;
    this.tenantId = opts.tenantId;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      resource: this.resource,
      currentUsage: this.currentUsage,
      allowedLimit: this.allowedLimit,
      plan: this.plan,
    };
  }
}

/* ── Types ────────────────────────────────────────────────────────── */

export interface TenantUsage {
  products: number;
  staff: number;
  publishedSites: number;
  monthlyOrders: number;
  storageMB: number;
}

export interface TenantCapabilities {
  tenantId: string;
  plan: string;
  planActivation: string;
  status: string;
  limits: IPlanLimits;
  usage: TenantUsage;
  overLimit: Record<string, boolean>;
  features: Record<string, boolean>;
}

/* ── Service ──────────────────────────────────────────────────────── */

export const enforcementService = {

  /**
   * Get the full plan limits for a tenant. Returns null if tenant/plan not found.
   */
  async getLimits(tenantId: string): Promise<{ tenant: ITenant; plan: IPlan; limits: IPlanLimits } | null> {
    const tenant = await Tenant.findOne({ tenantId }).lean<ITenant>();
    if (!tenant) return null;

    const plan = await Plan.findOne({ planId: tenant.plan }).lean<IPlan>();
    if (!plan) {
      log.warn(`Plan not found for tenant ${tenantId}: ${tenant.plan}`);
      return null;
    }

    return { tenant, plan, limits: plan.limits };
  },

  /**
   * Count current resource usage across modules. All queries are read-only.
   */
  async getUsage(tenantId: string): Promise<TenantUsage> {
    const [products, staff, publishedSites, monthlyOrders] = await Promise.all([
      // Products: count non-deleted products
      (async () => {
        const Product = mongoose.models.Product;
        if (!Product) return 0;
        return Product.countDocuments({ tenantId, deleted: { $ne: true } });
      })(),

      // Staff: count active staff for this tenant
      // Staff schema uses createdBy (adminId) not tenantId — count all active staff
      (async () => {
        const StaffUser = mongoose.models.StaffUser;
        if (!StaffUser) return 0;
        return StaffUser.countDocuments({ active: true });
      })(),

      // Published sites: count sites with activeVersion > 0
      (async () => {
        const Site = mongoose.models.Site;
        if (!Site) return 0;
        return Site.countDocuments({ tenantId, activeVersion: { $gt: 0 } });
      })(),

      // Monthly orders: count orders created this calendar month
      (async () => {
        const Order = mongoose.models.StorefrontOrder;
        if (!Order) return 0;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return Order.countDocuments({
          tenantId,
          createdAt: { $gte: monthStart },
        });
      })(),
    ]);

    return {
      products,
      staff,
      publishedSites,
      monthlyOrders,
      storageMB: 0, // Storage tracking not yet implemented
    };
  },

  /**
   * Full capabilities view: limits + usage + over-limit flags + features.
   */
  async getCapabilities(tenantId: string): Promise<TenantCapabilities | null> {
    const info = await this.getLimits(tenantId);
    if (!info) return null;

    const [usage, flags] = await Promise.all([
      this.getUsage(tenantId),
      featureFlagService.listTenantFlags(tenantId),
    ]);

    const { limits } = info;
    const overLimit: Record<string, boolean> = {
      products: limits.products !== -1 && usage.products >= limits.products,
      staff: limits.staff !== -1 && usage.staff >= limits.staff,
      publishedSites: limits.sites !== -1 && usage.publishedSites >= limits.sites,
      monthlyOrders: limits.monthlyOrders !== -1 && usage.monthlyOrders >= limits.monthlyOrders,
      storageMB: limits.storageMB !== -1 && usage.storageMB >= limits.storageMB,
    };

    const features: Record<string, boolean> = {};
    for (const f of flags) {
      features[f.flagName] = f.enabled;
    }

    return {
      tenantId,
      plan: info.plan.planId,
      planActivation: info.tenant.planActivation,
      status: info.tenant.status,
      limits,
      usage,
      overLimit,
      features,
    };
  },

  /* ── Enforcement checks ─────────────────────────────────────────── */

  /**
   * Check if tenant can create a new product. Throws PlanLimitError if over limit.
   */
  async enforceProductLimit(tenantId: string): Promise<void> {
    const info = await this.getLimits(tenantId);
    if (!info) return; // No plan info — allow (defensive)

    const { limits, plan, tenant } = info;
    if (limits.products === -1) return; // Unlimited

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new PlanLimitError({
        resource: 'products',
        currentUsage: 0,
        allowedLimit: 0,
        plan: plan.planId,
        tenantId,
        message: `Tenant is ${tenant.status} — cannot create products`,
      });
    }

    const Product = mongoose.models.Product;
    const count = Product
      ? await Product.countDocuments({ tenantId, deleted: { $ne: true } })
      : 0;

    if (count >= limits.products) {
      await this._logViolation(tenantId, plan.planId, 'products', count, limits.products);
      throw new PlanLimitError({
        resource: 'products',
        currentUsage: count,
        allowedLimit: limits.products,
        plan: plan.planId,
        tenantId,
      });
    }
  },

  /**
   * Check if tenant can add more staff. Throws PlanLimitError if over limit.
   */
  async enforceStaffLimit(tenantId: string): Promise<void> {
    const info = await this.getLimits(tenantId);
    if (!info) return;

    const { limits, plan } = info;
    if (limits.staff === -1) return;

    const StaffUser = mongoose.models.StaffUser;
    const count = StaffUser ? await StaffUser.countDocuments({ active: true }) : 0;

    if (count >= limits.staff) {
      await this._logViolation(tenantId, plan.planId, 'staff', count, limits.staff);
      throw new PlanLimitError({
        resource: 'staff',
        currentUsage: count,
        allowedLimit: limits.staff,
        plan: plan.planId,
        tenantId,
      });
    }
  },

  /**
   * Check if tenant can publish another site. Throws PlanLimitError if over limit.
   */
  async enforceSiteLimit(tenantId: string): Promise<void> {
    const info = await this.getLimits(tenantId);
    if (!info) return;

    const { limits, plan } = info;
    if (limits.sites === -1) return;

    const Site = mongoose.models.Site;
    const count = Site ? await Site.countDocuments({ tenantId, activeVersion: { $gt: 0 } }) : 0;

    if (count >= limits.sites) {
      await this._logViolation(tenantId, plan.planId, 'sites', count, limits.sites);
      throw new PlanLimitError({
        resource: 'publishedSites',
        currentUsage: count,
        allowedLimit: limits.sites,
        plan: plan.planId,
        tenantId,
      });
    }
  },

  /**
   * Check if tenant can create another order this month.
   */
  async enforceOrderLimit(tenantId: string): Promise<void> {
    const info = await this.getLimits(tenantId);
    if (!info) return;

    const { limits, plan } = info;
    if (limits.monthlyOrders === -1) return;

    const Order = mongoose.models.StorefrontOrder;
    if (!Order) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await Order.countDocuments({
      tenantId,
      createdAt: { $gte: monthStart },
    });

    if (count >= limits.monthlyOrders) {
      await this._logViolation(tenantId, plan.planId, 'monthlyOrders', count, limits.monthlyOrders);
      throw new PlanLimitError({
        resource: 'monthlyOrders',
        currentUsage: count,
        allowedLimit: limits.monthlyOrders,
        plan: plan.planId,
        tenantId,
      });
    }
  },

  /**
   * Check a feature flag for a tenant.
   */
  async enforceFeature(tenantId: string, flagName: string): Promise<void> {
    const enabled = await featureFlagService.getFeatureFlag(tenantId, flagName);
    if (!enabled) {
      throw new PlanLimitError({
        resource: flagName,
        currentUsage: 0,
        allowedLimit: 0,
        plan: 'n/a',
        tenantId,
        message: `Feature "${flagName}" is not enabled for this tenant`,
      });
    }
  },

  /* ── Internal helpers ───────────────────────────────────────────── */

  async _logViolation(
    tenantId: string,
    plan: string,
    resource: string,
    current: number,
    limit: number,
  ): Promise<void> {
    log.warn(`Plan limit violation: ${resource}`, {
      tenantId,
      plan,
      current: String(current),
      limit: String(limit),
    });

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'enforcement',
      action: 'limit_violation',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
      details: { plan, resource, currentUsage: current, allowedLimit: limit },
    });
  },
};
