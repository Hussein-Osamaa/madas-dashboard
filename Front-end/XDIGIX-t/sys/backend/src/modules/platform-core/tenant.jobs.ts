/**
 * Tenant background jobs.
 *
 * Processes grace period expiry — downgrades tenants whose grace
 * period has lapsed and emits tenant.grace_expired for notifications.
 */

import { Tenant } from './tenant.schema';
import { auditService } from './audit.service';
import { eventBus } from './event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('tenant-jobs');

/**
 * Find tenants whose grace period has expired and revert them to
 * their previous plan (or 'free' if none). Uses atomic updates
 * to prevent duplicate processing.
 */
export async function processExpiredGrace(): Promise<number> {
  const now = new Date();
  let processed = 0;
  let done = false;

  while (!done) {
    // Atomic claim: only one worker processes each expired grace tenant
    const tenant = await Tenant.findOneAndUpdate(
      {
        planActivation: 'grace',
        graceExpiresAt: { $lte: now, $ne: null },
      },
      {
        $set: {
          planActivation: 'default',
          plan: 'free', // Fallback — overridden below if previousPlan exists
          graceExpiresAt: null,
          graceReason: null,
          graceApprovedBy: null,
          graceApprovedAt: null,
        },
      },
      { new: false }, // return pre-update doc to read previousPlan
    );
    if (!tenant) { done = true; break; }

    // If the tenant had a previousPlan, revert to that instead of 'free'
    const revertPlan = tenant.previousPlan || 'free';
    if (revertPlan !== 'free') {
      await Tenant.updateOne(
        { tenantId: tenant.tenantId },
        { $set: { plan: revertPlan } },
      );
    }

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'tenant',
      action: 'grace_expired',
      entityType: 'tenant',
      entityId: tenant.tenantId,
      tenantId: tenant.tenantId,
      details: {
        expiredPlan: tenant.plan,
        revertedTo: revertPlan,
        graceExpiresAt: tenant.graceExpiresAt?.toISOString(),
      },
    });

    await eventBus.safePublish(
      'tenant.grace_expired',
      { tenantId: tenant.tenantId, expiredPlan: tenant.plan, revertedTo: revertPlan },
      { tenantId: tenant.tenantId },
    );

    log.info(`Grace expired for tenant ${tenant.tenantId}: ${tenant.plan} → ${revertPlan}`, {
      tenantId: tenant.tenantId,
    });
    processed++;
  }

  return processed;
}
