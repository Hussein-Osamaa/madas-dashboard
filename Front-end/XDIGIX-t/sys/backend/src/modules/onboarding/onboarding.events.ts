/**
 * Onboarding event handlers — Wave 6.
 *
 * Subscribes to onboarding lifecycle events and triggers notifications
 * through the existing notifications module. Also increments metrics counters.
 */
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';
import { onboardingMetrics } from './onboarding-metrics';

const log = createLogger('onboarding-events');

export function registerOnboardingEventHandlers(): void {

  eventBus.subscribe('onboarding.started', async (event) => {
    const { onboardingId, userId, email } = event.payload;
    onboardingMetrics.increment('started');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', email || '', 'onboarding.started', { onboardingId }, { correlationId: onboardingId });
    } catch (err) {
      log.warn('onboarding.started notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.email_verified', async (event) => {
    const { onboardingId, userId } = event.payload;
    onboardingMetrics.increment('email_verified');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.email_verified', { onboardingId }, { correlationId: onboardingId });
    } catch (err) {
      log.warn('onboarding.email_verified notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.plan_selected', async (event) => {
    onboardingMetrics.increment('plan_selected');
  });

  eventBus.subscribe('onboarding.payment_pending', async (event) => {
    onboardingMetrics.increment('paid_checkout_started');
  });

  eventBus.subscribe('onboarding.payment_succeeded', async (event) => {
    const { onboardingId, tenantId, planId, amount, currency } = event.payload;
    onboardingMetrics.increment('paid_checkout_success');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.payment_succeeded', { onboardingId, planId, amount: String(amount), currency }, { tenantId, correlationId: onboardingId });
    } catch (err) {
      log.warn('payment_succeeded notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.completed', async (event) => {
    const { onboardingId, tenantId, planId } = event.payload;
    onboardingMetrics.increment('completed');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.completed', { onboardingId, planId: planId || 'free' }, { tenantId, correlationId: onboardingId });
    } catch (err) {
      log.warn('onboarding.completed notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.trial_started', async (event) => {
    const { onboardingId, tenantId, planId, trialEndsAt } = event.payload;
    onboardingMetrics.increment('trial_activated');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.trial_started', { onboardingId, planId, trialEndsAt: String(trialEndsAt) }, { tenantId, correlationId: onboardingId });
    } catch (err) {
      log.warn('trial_started notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.grace_started', async (event) => {
    const { onboardingId, tenantId } = event.payload;
    onboardingMetrics.increment('grace_activated');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.grace_started', { onboardingId }, { tenantId, correlationId: onboardingId });
    } catch (err) {
      log.warn('grace_started notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  eventBus.subscribe('onboarding.abandoned', async (event) => {
    const { onboardingId, userId } = event.payload;
    onboardingMetrics.increment('abandoned');
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send('email', '', 'onboarding.abandoned', { onboardingId }, { correlationId: onboardingId });
    } catch (err) {
      log.warn('abandoned notification failed', { onboardingId, error: (err as Error).message });
    }
  });

  log.info('Onboarding event handlers registered');
}
