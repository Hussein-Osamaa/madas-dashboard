/**
 * Onboarding notification template seeds — atomic upsert, safe to call repeatedly.
 */
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-templates');

const ONBOARDING_TEMPLATES = [
  {
    templateId: 'onboarding-started-email',
    channel: 'email',
    eventType: 'onboarding.started',
    locale: 'en',
    subject: 'Welcome to XDIGIX — Let\'s get started!',
    body: 'Welcome to XDIGIX!\n\nYour account has been created. Please verify your email to continue setting up your store.\n\nOnboarding ID: {{onboardingId}}',
    variables: ['onboardingId'],
    active: true,
  },
  {
    templateId: 'onboarding-email-verified-email',
    channel: 'email',
    eventType: 'onboarding.email_verified',
    locale: 'en',
    subject: 'Email verified — XDIGIX',
    body: 'Great news! Your email has been verified.\n\nYou can now select a plan and set up your business profile.\n\nOnboarding ID: {{onboardingId}}',
    variables: ['onboardingId'],
    active: true,
  },
  {
    templateId: 'onboarding-completed-email',
    channel: 'email',
    eventType: 'onboarding.completed',
    locale: 'en',
    subject: 'You\'re all set — XDIGIX',
    body: 'Congratulations! Your store is ready.\n\nPlan: {{planId}}\nOnboarding ID: {{onboardingId}}\n\nYou can now start adding products and publishing your store.',
    variables: ['onboardingId', 'planId'],
    active: true,
  },
  {
    templateId: 'onboarding-trial-started-email',
    channel: 'email',
    eventType: 'onboarding.trial_started',
    locale: 'en',
    subject: 'Your trial has started — XDIGIX',
    body: 'Your {{planId}} trial is now active!\n\nTrial ends: {{trialEndsAt}}\n\nMake the most of your trial by setting up your store and adding products.',
    variables: ['planId', 'trialEndsAt'],
    active: true,
  },
  {
    templateId: 'onboarding-grace-started-email',
    channel: 'email',
    eventType: 'onboarding.grace_started',
    locale: 'en',
    subject: 'Grace period activated — XDIGIX',
    body: 'A grace period has been activated for your account.\n\nOnboarding ID: {{onboardingId}}\n\nPlease complete your setup during this period.',
    variables: ['onboardingId'],
    active: true,
  },
  {
    templateId: 'onboarding-abandoned-email',
    channel: 'email',
    eventType: 'onboarding.abandoned',
    locale: 'en',
    subject: 'We miss you — XDIGIX',
    body: 'It looks like you haven\'t finished setting up your store.\n\nOnboarding ID: {{onboardingId}}\n\nLog in anytime to pick up where you left off.',
    variables: ['onboardingId'],
    active: true,
  },
  {
    templateId: 'onboarding-payment-succeeded-email',
    channel: 'email',
    eventType: 'onboarding.payment_succeeded',
    locale: 'en',
    subject: 'Payment confirmed — XDIGIX',
    body: 'Your payment of {{amount}} {{currency}} has been confirmed.\n\nPlan: {{planId}}\nOnboarding ID: {{onboardingId}}\n\nYour plan is now active.',
    variables: ['onboardingId', 'planId', 'amount', 'currency'],
    active: true,
  },
];

/**
 * Seed onboarding notification templates. Idempotent via $setOnInsert upsert.
 */
export async function seedOnboardingTemplates(): Promise<void> {
  try {
    const { NotificationTemplate } = await import('../notifications/template.schema');

    for (const tmpl of ONBOARDING_TEMPLATES) {
      const res = await NotificationTemplate.updateOne(
        { templateId: tmpl.templateId },
        { $setOnInsert: tmpl },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        log.info(`Seeded onboarding template: ${tmpl.templateId}`);
      }
    }
    log.info(`Onboarding template seeding complete (${ONBOARDING_TEMPLATES.length} templates)`);
  } catch (err) {
    log.warn('Failed to seed onboarding templates (notifications module may not be ready)', {
      error: (err as Error).message,
    });
  }
}

export { ONBOARDING_TEMPLATES };
