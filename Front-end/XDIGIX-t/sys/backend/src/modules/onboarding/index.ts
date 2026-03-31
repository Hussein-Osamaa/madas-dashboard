/**
 * Onboarding module — barrel export (Waves 1-6 + hardening).
 */
export { seedOnboardingTemplates, ONBOARDING_TEMPLATES } from './onboarding-templates';
export { verifyStripeSignature, verifyPaymobSignature } from './onboarding-webhook.routes';
export { onboardingService } from './onboarding.service';
export { default as onboardingRoutes } from './onboarding.routes';
export { default as onboardingAdminRoutes } from './onboarding-admin.routes';
export { default as onboardingWebhookRoutes } from './onboarding-webhook.routes';
export { registerOnboardingEventHandlers } from './onboarding.events';
export { onboardingMetrics } from './onboarding-metrics';
export { onboardingReporting } from './onboarding-reporting';
export { abandonStale, processExpiredTrials } from './onboarding.jobs';
export {
  OnboardingProgress,
  type IOnboardingProgress,
  type OnboardingStatus,
  type OnboardingStep,
  ONBOARDING_STATUSES,
  ONBOARDING_STEPS,
  VALID_TRANSITIONS,
  canTransitionOnboarding,
  validateOnboardingTransition,
} from './onboarding-progress.schema';
export {
  EmailVerificationToken,
  type IEmailVerificationToken,
  generateVerificationToken,
  tokenExpiresAt,
} from './email-verification-token.schema';
