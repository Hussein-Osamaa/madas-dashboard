import { Tenant, ITenant } from './tenant.schema';
import { Plan, IPlanLimits } from './plan.schema';
import { auditService } from './audit.service';
import { eventBus } from './event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('tenant-service');

export const tenantService = {
  /**
   * Create a new tenant with defaults.
   */
  async createTenant(tenantId: string, plan = 'free'): Promise<ITenant> {
    const tenant = await Tenant.create({ tenantId, plan, status: 'active', planActivation: 'default' });

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'tenant',
      action: 'tenant_created',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
      details: { plan },
    });

    await eventBus.publish('tenant.created', { tenantId, plan }, { tenantId });

    log.info(`Tenant created: ${tenantId}`, { tenantId, plan });
    return tenant;
  },

  /**
   * Suspend a tenant.
   */
  async suspendTenant(tenantId: string, reason: string, actor: string): Promise<ITenant | null> {
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: { status: 'suspended' } },
      { new: true }
    );
    if (!tenant) return null;

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'tenant',
      action: 'tenant_suspended',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
      details: { reason },
    });

    await eventBus.publish('tenant.suspended', { tenantId, reason }, { tenantId });

    log.info(`Tenant suspended: ${tenantId}`, { tenantId, actor });
    return tenant;
  },

  /**
   * Activate a tenant (re-enable from suspended/cancelled).
   */
  async activateTenant(tenantId: string, actor: string): Promise<ITenant | null> {
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (!tenant) return null;

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'tenant',
      action: 'tenant_activated',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
    });

    await eventBus.publish('tenant.activated', { tenantId }, { tenantId });

    log.info(`Tenant activated: ${tenantId}`, { tenantId, actor });
    return tenant;
  },

  /**
   * Cancel a tenant.
   */
  async cancelTenant(tenantId: string, actor: string): Promise<ITenant | null> {
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: { status: 'cancelled' } },
      { new: true }
    );
    if (!tenant) return null;

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'tenant',
      action: 'tenant_cancelled',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
    });

    await eventBus.publish('tenant.cancelled', { tenantId }, { tenantId });

    log.info(`Tenant cancelled: ${tenantId}`, { tenantId, actor });
    return tenant;
  },

  /**
   * Change a tenant's plan. Validates that the target plan exists.
   */
  async changePlan(tenantId: string, planId: string, actor: string): Promise<ITenant | null> {
    const plan = await Plan.findOne({ planId, isActive: true });
    if (!plan) {
      log.warn(`Plan not found or inactive: ${planId}`, { tenantId, actor });
      throw new Error(`Plan not found or inactive: ${planId}`);
    }

    const current = await Tenant.findOne({ tenantId });
    if (!current) return null;

    const previousPlan = current.plan;
    const previousPlanActivation = current.planActivation;

    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          plan: planId,
          planActivation: 'paid',
          previousPlan,
          previousPlanActivation,
          // Clear grace fields on plan change
          graceExpiresAt: null,
          graceReason: null,
          graceApprovedBy: null,
          graceApprovedAt: null,
        },
      },
      { new: true }
    );

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'tenant',
      action: 'plan_changed',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
      details: { previousPlan, newPlan: planId },
    });

    await eventBus.publish(
      'tenant.plan_changed',
      { tenantId, previousPlan, newPlan: planId },
      { tenantId }
    );

    log.info(`Tenant plan changed: ${tenantId} ${previousPlan} -> ${planId}`, { tenantId, actor });
    return tenant;
  },

  /**
   * Activate a tenant on a plan with a grace period.
   */
  async activateWithGrace(
    tenantId: string,
    planId: string,
    graceDays: number,
    reason: string,
    category: string,
    actor: string
  ): Promise<ITenant | null> {
    const plan = await Plan.findOne({ planId, isActive: true });
    if (!plan) {
      throw new Error(`Plan not found or inactive: ${planId}`);
    }

    const current = await Tenant.findOne({ tenantId });
    if (!current) return null;

    const graceExpiresAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          plan: planId,
          planActivation: 'grace',
          previousPlan: current.plan,
          previousPlanActivation: current.planActivation,
          graceExpiresAt,
          graceReason: reason,
          graceApprovedBy: actor,
          graceApprovedAt: new Date(),
        },
      },
      { new: true }
    );

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'tenant',
      action: 'grace_activated',
      entityType: 'tenant',
      entityId: tenantId,
      tenantId,
      details: { planId, graceDays, reason, category, graceExpiresAt: graceExpiresAt.toISOString() },
    });

    await eventBus.publish(
      'tenant.grace_activated',
      { tenantId, planId, graceDays, reason, category },
      { tenantId }
    );

    log.info(`Grace period activated for tenant: ${tenantId}, plan: ${planId}, days: ${graceDays}`, {
      tenantId,
      actor,
    });
    return tenant;
  },

  /**
   * Get the limits for a tenant's current plan.
   */
  async getTenantLimits(tenantId: string): Promise<IPlanLimits | null> {
    const tenant = await Tenant.findOne({ tenantId }).lean<ITenant>();
    if (!tenant) return null;

    const plan = await Plan.findOne({ planId: tenant.plan }).lean();
    if (!plan) {
      log.warn(`Plan not found for tenant: ${tenantId}, plan: ${tenant.plan}`);
      return null;
    }

    return plan.limits;
  },

  /**
   * Get a tenant by ID.
   */
  async getTenant(tenantId: string): Promise<ITenant | null> {
    return Tenant.findOne({ tenantId }).lean<ITenant>();
  },
};
