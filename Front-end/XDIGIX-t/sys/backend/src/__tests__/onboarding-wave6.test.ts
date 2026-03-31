/**
 * Onboarding Wave 6 tests — events, webhooks, metrics, reporting.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══ 1. EVENT HANDLERS ═══════════════════════════════════════════ */

describe('Wave 6 — Event Handlers', () => {
  it('onboarding.events.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding.events.ts'))).toBe(true);
  });

  it('registerOnboardingEventHandlers is exported', async () => {
    const { registerOnboardingEventHandlers } = await import('../modules/onboarding/onboarding.events');
    expect(typeof registerOnboardingEventHandlers).toBe('function');
  });

  it('subscribes to onboarding.started', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.started'");
  });

  it('subscribes to onboarding.email_verified', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.email_verified'");
  });

  it('subscribes to onboarding.completed', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.completed'");
  });

  it('subscribes to onboarding.payment_succeeded', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.payment_succeeded'");
  });

  it('subscribes to onboarding.trial_started', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.trial_started'");
  });

  it('subscribes to onboarding.grace_started', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.grace_started'");
  });

  it('subscribes to onboarding.abandoned', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("'onboarding.abandoned'");
  });

  it('each handler uses notificationService.send', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain('notificationService.send');
    // Count notification sends — should be at least 7
    const sendCount = (code.match(/notificationService\.send/g) || []).length;
    expect(sendCount).toBeGreaterThanOrEqual(7);
  });

  it('each handler has try-catch (notification failures do not crash)', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    const catchCount = (code.match(/catch \(err\)/g) || []).length;
    expect(catchCount).toBeGreaterThanOrEqual(7);
  });

  it('event handlers registered in app.ts startup', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('registerOnboardingEventHandlers');
  });
});

/* ═══ 2. METRICS ══════════════════════════════════════════════════ */

describe('Wave 6 — Metrics', () => {
  it('onboarding-metrics.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding-metrics.ts'))).toBe(true);
  });

  it('exports increment, get, getAll, reset', async () => {
    const { onboardingMetrics } = await import('../modules/onboarding/onboarding-metrics');
    expect(typeof onboardingMetrics.increment).toBe('function');
    expect(typeof onboardingMetrics.get).toBe('function');
    expect(typeof onboardingMetrics.getAll).toBe('function');
    expect(typeof onboardingMetrics.reset).toBe('function');
  });

  it('increment and get work correctly', async () => {
    const { onboardingMetrics } = await import('../modules/onboarding/onboarding-metrics');
    onboardingMetrics.reset();
    onboardingMetrics.increment('started');
    onboardingMetrics.increment('started');
    onboardingMetrics.increment('completed');
    expect(onboardingMetrics.get('started')).toBe(2);
    expect(onboardingMetrics.get('completed')).toBe(1);
    onboardingMetrics.reset();
  });

  it('getAll returns all metric keys', async () => {
    const { onboardingMetrics } = await import('../modules/onboarding/onboarding-metrics');
    const all = onboardingMetrics.getAll();
    expect(all).toHaveProperty('started');
    expect(all).toHaveProperty('email_verified');
    expect(all).toHaveProperty('plan_selected');
    expect(all).toHaveProperty('completed');
    expect(all).toHaveProperty('abandoned');
    expect(all).toHaveProperty('trial_activated');
    expect(all).toHaveProperty('grace_activated');
    expect(all).toHaveProperty('paid_checkout_started');
    expect(all).toHaveProperty('paid_checkout_success');
  });

  it('event handlers increment metrics', () => {
    const code = readSrc('modules/onboarding/onboarding.events.ts');
    expect(code).toContain("onboardingMetrics.increment('started')");
    expect(code).toContain("onboardingMetrics.increment('email_verified')");
    expect(code).toContain("onboardingMetrics.increment('completed')");
    expect(code).toContain("onboardingMetrics.increment('abandoned')");
    expect(code).toContain("onboardingMetrics.increment('trial_activated')");
    expect(code).toContain("onboardingMetrics.increment('grace_activated')");
  });
});

/* ═══ 3. WEBHOOK ORCHESTRATION ════════════════════════════════════ */

describe('Wave 6 — Webhook Orchestration', () => {
  it('webhook routes file exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding-webhook.routes.ts'))).toBe(true);
  });

  it('has POST /stripe route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-webhook.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/stripe');
  });

  it('has POST /paymob route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-webhook.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/paymob');
  });

  it('has POST /generic route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-webhook.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/generic');
  });

  it('stripe handler dispatches to markPaymentSucceeded', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/stripe'"), code.indexOf("'/paymob'"));
    expect(handler).toContain('markPaymentSucceeded');
    expect(handler).toContain('checkout.session.completed');
  });

  it('stripe handler dispatches to markPaymentFailed on expiry', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/stripe'"), code.indexOf("'/paymob'"));
    expect(handler).toContain('markPaymentFailed');
    expect(handler).toContain('checkout.session.expired');
  });

  it('paymob handler dispatches based on success field', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/paymob'"), code.indexOf("'/generic'"));
    expect(handler).toContain('data.success');
    expect(handler).toContain('markPaymentSucceeded');
    expect(handler).toContain('markPaymentFailed');
  });

  it('generic handler validates paymentSessionId + status', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/generic'"));
    expect(handler).toContain('paymentSessionId');
    expect(handler).toContain("status === 'success'");
    expect(handler).toContain("status === 'failed'");
  });

  it('webhook routes mounted in app.ts', () => {
    const code = readSrc('app.ts');
    expect(code).toContain("'/api/onboarding/webhooks'");
    expect(code).toContain('onboarding-webhook.routes');
  });

  it('webhook signature verification is implemented (hardening pass)', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    expect(code).toContain('verifyStripeSignature');
    expect(code).toContain('verifyPaymobSignature');
    expect(code).toContain('STRIPE_WEBHOOK_SECRET');
    expect(code).toContain('PAYMOB_HMAC_SECRET');
  });
});

/* ═══ 4. REPORTING / FUNNEL VISIBILITY ════════════════════════════ */

describe('Wave 6 — Onboarding Reporting', () => {
  it('onboarding-reporting.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding-reporting.ts'))).toBe(true);
  });

  it('exports funnelSummary, funnelByPlan, operational lists', async () => {
    const { onboardingReporting } = await import('../modules/onboarding/onboarding-reporting');
    expect(typeof onboardingReporting.funnelSummary).toBe('function');
    expect(typeof onboardingReporting.funnelByPlan).toBe('function');
    expect(typeof onboardingReporting.abandonedList).toBe('function');
    expect(typeof onboardingReporting.paymentPendingList).toBe('function');
    expect(typeof onboardingReporting.trialActiveList).toBe('function');
    expect(typeof onboardingReporting.liveMetrics).toBe('function');
  });

  it('admin routes include funnel endpoint', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/funnel');
  });

  it('admin routes include metrics endpoint', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/metrics');
  });

  it('admin routes include abandoned list', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/abandoned');
  });

  it('admin routes include payment-pending list', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/payment-pending');
  });

  it('admin routes include trials list', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/trials');
  });
});

/* ═══ 5. REGRESSION — Waves 1-5 ═══════════════════════════════════ */

describe('Wave 6 — Regression Safety', () => {
  it('all prior onboarding routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/start');
    expect(paths).toContain('/verify-email');
    expect(paths).toContain('/checklist');
    expect(paths).toContain('/complete');
    expect(paths).toContain('/payment-session');
    expect(paths).toContain('/payment-success');
    expect(paths).toContain('/payment-failed');
  });

  it('Wave 5 admin routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/provision');
    expect(paths).toContain('/:id/activate-trial');
    expect(paths).toContain('/:id/activate-grace');
    expect(paths).toContain('/:id/reopen');
  });

  it('all service methods from Waves 1-5 exist', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    // Wave 1
    expect(typeof onboardingService.start).toBe('function');
    expect(typeof onboardingService.provisionFreePlan).toBe('function');
    // Wave 2
    expect(typeof onboardingService.verifyEmailToken).toBe('function');
    // Wave 3
    expect(typeof onboardingService.completeOnboarding).toBe('function');
    // Wave 4
    expect(typeof onboardingService.markPaymentSucceeded).toBe('function');
    // Wave 5
    expect(typeof onboardingService.activateTrial).toBe('function');
    expect(typeof onboardingService.activateGraceByAdmin).toBe('function');
    expect(typeof onboardingService.adminProvision).toBe('function');
  });
});

/* ═══ 6. BARREL EXPORT ════════════════════════════════════════════ */

describe('Wave 6 — Barrel Export', () => {
  it('exports Wave 6 additions', async () => {
    const mod = await import('../modules/onboarding/index');
    expect(mod.onboardingWebhookRoutes).toBeDefined();
    expect(typeof mod.registerOnboardingEventHandlers).toBe('function');
    expect(mod.onboardingMetrics).toBeDefined();
    expect(mod.onboardingReporting).toBeDefined();
  });
});
