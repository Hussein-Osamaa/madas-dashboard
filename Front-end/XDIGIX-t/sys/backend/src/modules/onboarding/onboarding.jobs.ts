/**
 * Onboarding background jobs — Wave 5.
 *
 * 1. abandonStale — marks stale non-terminal onboardings as abandoned
 * 2. processExpiredTrials — expires trial subscriptions past trialEnd
 */
import mongoose from 'mongoose';
import { OnboardingProgress, OnboardingStatus } from './onboarding-progress.schema';
import { auditService } from '../platform-core/audit.service';
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-jobs');

/** Inactivity threshold: 30 days */
const STALE_THRESHOLD_DAYS = 30;

/** Non-terminal statuses eligible for abandonment */
const ABANDONABLE: OnboardingStatus[] = [
  'not_started', 'account_created', 'email_verified',
  'plan_selected', 'business_created', 'payment_pending',
];

/**
 * Mark stale onboardings as abandoned. Atomic per-record.
 */
export async function abandonStale(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_DAYS * 86400000);
  let abandoned = 0;
  let done = false;

  while (!done) {
    const record = await OnboardingProgress.findOneAndUpdate(
      { status: { $in: ABANDONABLE }, updatedAt: { $lt: cutoff } },
      { $set: { status: 'abandoned', abandonedAt: new Date() } },
      { new: false },
    );
    if (!record) { done = true; break; }

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'onboarding',
      action: 'onboarding_abandoned',
      entityType: 'onboarding',
      entityId: record.onboardingId,
      details: { previousStatus: record.status, userId: record.userId, inactiveDays: STALE_THRESHOLD_DAYS },
    });

    await eventBus.safePublish('onboarding.abandoned', {
      onboardingId: record.onboardingId,
      userId: record.userId,
      lastStatus: record.status,
      abandonedAt: new Date(),
    });

    abandoned++;
  }

  if (abandoned > 0) {
    log.info(`Abandoned ${abandoned} stale onboardings`);
  }
  return abandoned;
}

/**
 * Process expired trial subscriptions. Revokes trial plan, downgrades to free.
 * Uses atomic findOneAndUpdate to prevent double-processing.
 */
export async function processExpiredTrials(): Promise<number> {
  const { Subscription } = await import('../finance/subscription.schema');
  const Tenant = mongoose.models.Tenant;
  const now = new Date();
  let processed = 0;
  let done = false;

  while (!done) {
    // Atomic claim: find trialing subscription past trialEnd
    const sub = await Subscription.findOneAndUpdate(
      { status: 'trialing', trialEnd: { $lte: now, $ne: null } },
      { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
      { new: false },
    );
    if (!sub) { done = true; break; }

    const tenantId = (sub as Record<string, unknown>).tenantId as string;

    // Downgrade tenant to free
    if (Tenant) {
      await Tenant.updateOne(
        { tenantId },
        { $set: { plan: 'free', planActivation: 'default' } },
      );
    }

    // Update onboarding progress if exists
    await OnboardingProgress.updateOne(
      { tenantId, status: 'trial_active' },
      { $set: { status: 'suspended' } },
    );

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'onboarding',
      action: 'trial_expired',
      entityType: 'subscription',
      entityId: tenantId,
      tenantId,
      details: { previousPlan: (sub as Record<string, unknown>).planId, trialEnd: (sub as Record<string, unknown>).trialEnd },
    });

    await eventBus.safePublish('tenant.trial_expired', {
      tenantId,
      previousPlan: (sub as Record<string, unknown>).planId,
    });

    processed++;
  }

  if (processed > 0) {
    log.info(`Processed ${processed} expired trials`);
  }
  return processed;
}
