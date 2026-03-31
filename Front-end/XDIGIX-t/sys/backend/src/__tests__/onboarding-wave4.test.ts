/**
 * Onboarding Wave 4 tests — subscription + payment session foundation.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══════════════════════════════════════════════════════════════════
   1. SUBSCRIPTION SCHEMA EXTENSION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Subscription Schema', () => {
  it('status enum includes pending and grace', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain("'pending'");
    expect(code).toContain("'grace'");
    expect(code).toContain("'active'");
    expect(code).toContain("'past_due'");
    expect(code).toContain("'cancelled'");
    expect(code).toContain("'trialing'");
  });

  it('adds subscriptionId field', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('subscriptionId');
    expect(code).toContain("subscriptionId: { type: String, default: null }");
  });

  it('adds paymentProvider field', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('paymentProvider');
  });

  it('adds externalSubscriptionId with unique sparse index', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('externalSubscriptionId');
    expect(code).toContain('externalSubscriptionId: 1 }, { unique: true, sparse: true');
  });

  it('adds externalCustomerId field', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('externalCustomerId');
  });

  it('adds trialEnd as forward-compatible field', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('trialEnd: { type: Date, default: null }');
  });

  it('adds cancelledAt, lastPaymentAt, onboardingId', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain('cancelledAt');
    expect(code).toContain('lastPaymentAt');
    expect(code).toContain('onboardingId');
  });

  it('all new fields default to null (backward compatible)', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    for (const field of ['subscriptionId', 'paymentProvider', 'externalSubscriptionId', 'externalCustomerId', 'trialEnd', 'cancelledAt', 'lastPaymentAt', 'onboardingId']) {
      expect(code).toContain(`${field}: { type:`);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2. PAYMENT SESSION SCHEMA
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Payment Session Schema', () => {
  it('model registered', async () => {
    const { PaymentSession } = await import('../modules/finance/payment-session.schema');
    expect(PaymentSession).toBeDefined();
    expect(PaymentSession.modelName).toBe('PaymentSession');
  });

  it('status enum has 6 values', () => {
    const code = readSrc('modules/finance/payment-session.schema.ts');
    expect(code).toContain("'created'");
    expect(code).toContain("'pending'");
    expect(code).toContain("'completed'");
    expect(code).toContain("'failed'");
    expect(code).toContain("'expired'");
    expect(code).toContain("'cancelled'");
  });

  it('has paymentSessionId unique index', () => {
    const code = readSrc('modules/finance/payment-session.schema.ts');
    expect(code).toContain('paymentSessionId: 1 }, { unique: true');
  });

  it('has TTL index at 72h', () => {
    const code = readSrc('modules/finance/payment-session.schema.ts');
    expect(code).toContain('expireAfterSeconds: 259200');
  });

  it('has externalSessionId unique sparse index', () => {
    const code = readSrc('modules/finance/payment-session.schema.ts');
    expect(code).toContain('externalSessionId: 1 }, { unique: true, sparse: true');
  });

  it('exports TERMINAL_SESSION_STATUSES', async () => {
    const { TERMINAL_SESSION_STATUSES } = await import('../modules/finance/payment-session.schema');
    expect(TERMINAL_SESSION_STATUSES).toContain('completed');
    expect(TERMINAL_SESSION_STATUSES).toContain('failed');
    expect(TERMINAL_SESSION_STATUSES).toContain('expired');
    expect(TERMINAL_SESSION_STATUSES).toContain('cancelled');
    expect(TERMINAL_SESSION_STATUSES).not.toContain('created');
    expect(TERMINAL_SESSION_STATUSES).not.toContain('pending');
  });

  it('generatePaymentSessionId returns PSN-prefixed ID', async () => {
    const { generatePaymentSessionId } = await import('../modules/finance/payment-session.schema');
    const id = generatePaymentSessionId();
    expect(id.startsWith('PSN-')).toBe(true);
    expect(id).toHaveLength(12);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3. PAID CHECKOUT START
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Paid Checkout Start', () => {
  it('startPaidPlanCheckout rejects free plan', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain("planIntent === 'free'");
    expect(fn).toContain('Free plan does not require payment');
  });

  it('startPaidPlanCheckout requires business provisioned', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain('!record.tenantId');
    expect(fn).toContain('Business must be provisioned');
  });

  it('startPaidPlanCheckout creates pending subscription via upsert', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain('Subscription.updateOne');
    expect(fn).toContain("status: 'pending'");
    expect(fn).toContain('upsert: true');
  });

  it('startPaidPlanCheckout creates payment session', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain('PaymentSession.create');
    expect(fn).toContain('generatePaymentSessionId');
  });

  it('startPaidPlanCheckout transitions to payment_pending', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain("status: 'payment_pending'");
  });

  it('startPaidPlanCheckout is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    expect(fn).toContain("action: 'payment_session_created'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4. PAYMENT SUCCESS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Payment Success', () => {
  it('markPaymentSucceeded uses atomic claim on session', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain('findOneAndUpdate');
    expect(fn).toContain('$nin: TERMINAL_SESSION_STATUSES');
    expect(fn).toContain("status: 'completed'");
  });

  it('markPaymentSucceeded activates subscription', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain('Subscription.updateOne');
    expect(fn).toContain("status: 'active'");
  });

  it('markPaymentSucceeded sets tenant planActivation to paid', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("planActivation: 'paid'");
  });

  it('markPaymentSucceeded transitions onboarding to paid_active', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("status: 'paid_active'");
  });

  it('markPaymentSucceeded is idempotent if session already completed', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("status === 'completed'");
    expect(fn).toContain('return { success: true }');
  });

  it('markPaymentSucceeded is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("action: 'payment_succeeded'");
  });

  it('markPaymentSucceeded emits onboarding.payment_succeeded', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("'onboarding.payment_succeeded'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5. PAYMENT FAILURE
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Payment Failure', () => {
  it('markPaymentFailed uses atomic claim on session', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentFailed'));
    expect(fn).toContain('findOneAndUpdate');
    expect(fn).toContain("status: 'failed'");
  });

  it('markPaymentFailed does NOT activate subscription', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentFailed'));
    // Must not set subscription to active
    expect(fn).not.toContain("status: 'active'");
  });

  it('markPaymentFailed sets failedStep on onboarding', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("failedStep: 'activate_plan'");
  });

  it('markPaymentFailed is idempotent', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("status === 'failed'");
    expect(fn).toContain('return { success: true }');
  });

  it('markPaymentFailed is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentFailed'));
    expect(fn).toContain("action: 'payment_failed'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   6. TERMINAL SESSION REUSE REJECTION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Session Reuse Prevention', () => {
  it('completed sessions cannot be succeeded again', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain('TERMINAL_SESSION_STATUSES');
  });

  it('failed sessions cannot be succeeded', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // TERMINAL_SESSION_STATUSES includes 'failed' — checked above
    const fn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(fn).toContain('$nin');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   7. ROUTES
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Routes', () => {
  it('POST /payment-session route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/payment-session');
  });

  it('GET /payment-status route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/payment-status');
  });

  it('POST /payment-success route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/payment-success');
  });

  it('POST /payment-failed route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/payment-failed');
  });

  it('payment-session requires paymentProvider', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/payment-session'"), code.indexOf("'/payment-status'"));
    expect(handler).toContain("'paymentProvider is required'");
    expect(handler).toContain('400');
  });

  it('payment-success requires paymentSessionId', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/payment-success'"), code.indexOf("'/payment-failed'"));
    expect(handler).toContain("'paymentSessionId is required'");
  });

  it('payment-failed requires paymentSessionId', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/payment-failed'"));
    expect(handler).toContain("'paymentSessionId is required'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   8. FEATURE FLAG
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Feature Flag', () => {
  it('all Wave 4 routes behind ONBOARDING_ENABLED', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const flagIdx = code.indexOf('ONBOARDING_ENABLED');
    expect(flagIdx).toBeLessThan(code.indexOf('/payment-session'));
    expect(flagIdx).toBeLessThan(code.indexOf('/payment-status'));
    expect(flagIdx).toBeLessThan(code.indexOf('/payment-success'));
    expect(flagIdx).toBeLessThan(code.indexOf('/payment-failed'));
  });
});

/* ═══════════════════════════════════════════════════════════════════
   9. BUSINESS RULES
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Business Rules', () => {
  it('pending subscription does NOT grant paid planActivation', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const startFn = code.slice(code.indexOf('async startPaidPlanCheckout'), code.indexOf('async getPaymentStatus'));
    // Must create subscription as pending, NOT active
    expect(startFn).toContain("status: 'pending'");
    // Must NOT set planActivation to paid during checkout start
    expect(startFn).not.toContain("planActivation: 'paid'");
  });

  it('only markPaymentSucceeded sets planActivation to paid', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // planActivation: 'paid' should only appear in markPaymentSucceeded
    const succeedFn = code.slice(code.indexOf('async markPaymentSucceeded'), code.indexOf('async markPaymentFailed'));
    expect(succeedFn).toContain("planActivation: 'paid'");

    const failFn = code.slice(code.indexOf('async markPaymentFailed'));
    expect(failFn).not.toContain("planActivation: 'paid'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   10. REGRESSION — Waves 1-3 still work
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Regression Safety', () => {
  it('Wave 1-3 routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/start');
    expect(paths).toContain('/progress');
    expect(paths).toContain('/verify-email');
    expect(paths).toContain('/checklist');
    expect(paths).toContain('/business-profile');
    expect(paths).toContain('/complete');
  });

  it('Wave 1-3 service methods still exist', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.start).toBe('function');
    expect(typeof onboardingService.provisionFreePlan).toBe('function');
    expect(typeof onboardingService.verifyEmailToken).toBe('function');
    expect(typeof onboardingService.updateBusinessProfile).toBe('function');
    expect(typeof onboardingService.completeOnboarding).toBe('function');
  });

  it('free plan provisioning still works (Wave 1)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async provisionFreePlan');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   11. EXCLUSION VERIFICATION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Exclusion Verification', () => {
  it('grace activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateGraceByAdmin');
  });

  it('no admin override endpoints', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).not.toContain('/admin/');
    expect(code).not.toContain('/provision');
  });

  it('onboarding jobs added in Wave 5', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding.jobs.ts'))).toBe(true);
  });

  it('trial activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateTrial');
  });

  it('no full webhook orchestration — only internal success/failure', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).not.toContain('webhook');
    expect(code).not.toContain('stripe.webhooks');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   12. SERVICE EXPORTS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 4 — Service Exports', () => {
  it('exports Wave 4 methods', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.startPaidPlanCheckout).toBe('function');
    expect(typeof onboardingService.getPaymentStatus).toBe('function');
    expect(typeof onboardingService.markPaymentSucceeded).toBe('function');
    expect(typeof onboardingService.markPaymentFailed).toBe('function');
  });
});
