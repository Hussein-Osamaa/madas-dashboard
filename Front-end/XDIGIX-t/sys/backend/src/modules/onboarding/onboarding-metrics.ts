/**
 * Onboarding metrics — lightweight in-memory counters for onboarding funnel visibility.
 *
 * These are operational counters since process start. For historical analytics,
 * use the audit log or reporting module aggregations.
 *
 * Reset on restart. For persistence, query OnboardingProgress collection directly.
 */
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-metrics');

export type OnboardingMetricKey =
  | 'started'
  | 'verification_sent'
  | 'email_verified'
  | 'plan_selected'
  | 'free_completed'
  | 'paid_checkout_started'
  | 'paid_checkout_success'
  | 'completed'
  | 'abandoned'
  | 'trial_activated'
  | 'grace_activated';

const counters: Record<OnboardingMetricKey, number> = {
  started: 0,
  verification_sent: 0,
  email_verified: 0,
  plan_selected: 0,
  free_completed: 0,
  paid_checkout_started: 0,
  paid_checkout_success: 0,
  completed: 0,
  abandoned: 0,
  trial_activated: 0,
  grace_activated: 0,
};

export const onboardingMetrics = {
  increment(key: OnboardingMetricKey, amount = 1): void {
    counters[key] = (counters[key] || 0) + amount;
  },

  get(key: OnboardingMetricKey): number {
    return counters[key] || 0;
  },

  getAll(): Record<OnboardingMetricKey, number> {
    return { ...counters };
  },

  reset(): void {
    for (const key of Object.keys(counters) as OnboardingMetricKey[]) {
      counters[key] = 0;
    }
  },
};
