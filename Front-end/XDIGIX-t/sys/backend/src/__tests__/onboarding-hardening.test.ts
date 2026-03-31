/**
 * Onboarding hardening tests — templates, webhook verification, persistent metrics, sandbox.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SRC = path.resolve(__dirname, '..');
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══ 1. NOTIFICATION TEMPLATES ═══════════════════════════════════ */

describe('Hardening — Notification Templates', () => {
  it('onboarding-templates.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding-templates.ts'))).toBe(true);
  });

  it('exports seedOnboardingTemplates function', async () => {
    const { seedOnboardingTemplates } = await import('../modules/onboarding/onboarding-templates');
    expect(typeof seedOnboardingTemplates).toBe('function');
  });

  it('defines 7 onboarding templates', async () => {
    const { ONBOARDING_TEMPLATES } = await import('../modules/onboarding/onboarding-templates');
    expect(ONBOARDING_TEMPLATES).toHaveLength(7);
  });

  it('all templates have required fields', async () => {
    const { ONBOARDING_TEMPLATES } = await import('../modules/onboarding/onboarding-templates');
    for (const tmpl of ONBOARDING_TEMPLATES) {
      expect(tmpl.templateId).toBeTruthy();
      expect(tmpl.channel).toBe('email');
      expect(tmpl.eventType).toBeTruthy();
      expect(tmpl.subject).toBeTruthy();
      expect(tmpl.body).toBeTruthy();
      expect(tmpl.active).toBe(true);
      expect(Array.isArray(tmpl.variables)).toBe(true);
    }
  });

  it('covers all required event types', async () => {
    const { ONBOARDING_TEMPLATES } = await import('../modules/onboarding/onboarding-templates');
    const eventTypes = ONBOARDING_TEMPLATES.map((t) => t.eventType);
    expect(eventTypes).toContain('onboarding.started');
    expect(eventTypes).toContain('onboarding.email_verified');
    expect(eventTypes).toContain('onboarding.completed');
    expect(eventTypes).toContain('onboarding.trial_started');
    expect(eventTypes).toContain('onboarding.grace_started');
    expect(eventTypes).toContain('onboarding.abandoned');
    expect(eventTypes).toContain('onboarding.payment_succeeded');
  });

  it('uses atomic upsert ($setOnInsert)', () => {
    const code = readSrc('modules/onboarding/onboarding-templates.ts');
    expect(code).toContain('$setOnInsert');
    expect(code).toContain('upsert: true');
  });

  it('template seeding wired into app.ts startup', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('seedOnboardingTemplates');
  });

  it('template variables are explicit in body', async () => {
    const { ONBOARDING_TEMPLATES } = await import('../modules/onboarding/onboarding-templates');
    for (const tmpl of ONBOARDING_TEMPLATES) {
      // Each declared variable should appear as {{var}} in body
      for (const v of tmpl.variables) {
        expect(tmpl.body).toContain(`{{${v}}}`);
      }
    }
  });
});

/* ═══ 2. STRIPE SIGNATURE VERIFICATION ════════════════════════════ */

describe('Hardening — Stripe Webhook Verification', () => {
  it('verifyStripeSignature function exists', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    expect(typeof verifyStripeSignature).toBe('function');
  });

  it('rejects null signature', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const result = verifyStripeSignature('{}', undefined, 'secret');
    expect(result).toBeNull();
  });

  it('rejects empty secret', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const result = verifyStripeSignature('{}', 't=123,v1=abc', '');
    expect(result).toBeNull();
  });

  it('rejects invalid signature format', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const result = verifyStripeSignature('{}', 'invalid', 'secret');
    expect(result).toBeNull();
  });

  it('accepts valid signature', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const secret = 'whsec_test_secret_123';
    const body = '{"type":"checkout.session.completed"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}.${body}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const header = `t=${timestamp},v1=${sig}`;

    const result = verifyStripeSignature(body, header, secret);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('checkout.session.completed');
  });

  it('rejects tampered body', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const secret = 'whsec_test_secret_123';
    const body = '{"type":"checkout.session.completed"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}.${body}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const header = `t=${timestamp},v1=${sig}`;

    // Tamper with body
    const result = verifyStripeSignature('{"type":"TAMPERED"}', header, secret);
    expect(result).toBeNull();
  });

  it('rejects stale timestamp (>5 min)', async () => {
    const { verifyStripeSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const secret = 'whsec_test';
    const body = '{"type":"test"}';
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const payload = `${staleTimestamp}.${body}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const header = `t=${staleTimestamp},v1=${sig}`;

    const result = verifyStripeSignature(body, header, secret);
    expect(result).toBeNull();
  });

  it('stripe route returns 401 on invalid signature when secret configured', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/stripe'"), code.indexOf("'/paymob'"));
    expect(handler).toContain('401');
    expect(handler).toContain('Invalid signature');
  });
});

/* ═══ 3. PAYMOB SIGNATURE VERIFICATION ════════════════════════════ */

describe('Hardening — Paymob Webhook Verification', () => {
  it('verifyPaymobSignature function exists', async () => {
    const { verifyPaymobSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    expect(typeof verifyPaymobSignature).toBe('function');
  });

  it('rejects null hmac header', async () => {
    const { verifyPaymobSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const result = verifyPaymobSignature({}, undefined, 'secret');
    expect(result).toBe(false);
  });

  it('rejects empty secret', async () => {
    const { verifyPaymobSignature } = await import('../modules/onboarding/onboarding-webhook.routes');
    const result = verifyPaymobSignature({}, 'abc', '');
    expect(result).toBe(false);
  });

  it('paymob route returns 401 on invalid signature when secret configured', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    const handler = code.slice(code.indexOf("'/paymob'"), code.indexOf("'/generic'"));
    expect(handler).toContain('401');
    expect(handler).toContain('Invalid signature');
  });

  it('paymob route checks PAYMOB_HMAC_SECRET env', () => {
    const code = readSrc('modules/onboarding/onboarding-webhook.routes.ts');
    expect(code).toContain('PAYMOB_HMAC_SECRET');
  });
});

/* ═══ 4. PERSISTENT METRICS ═══════════════════════════════════════ */

describe('Hardening — Persistent Metrics', () => {
  it('onboarding reporting has persistentMetrics method', async () => {
    const { onboardingReporting } = await import('../modules/onboarding/onboarding-reporting');
    expect(typeof onboardingReporting.persistentMetrics).toBe('function');
  });

  it('onboarding reporting has combinedMetrics method', async () => {
    const { onboardingReporting } = await import('../modules/onboarding/onboarding-reporting');
    expect(typeof onboardingReporting.combinedMetrics).toBe('function');
  });

  it('persistentMetrics aggregates from audit log', () => {
    const code = readSrc('modules/onboarding/onboarding-reporting.ts');
    expect(code).toContain("module: 'onboarding'");
    expect(code).toContain("$group: { _id: '$action'");
  });

  it('admin metrics endpoint returns combined metrics', () => {
    const code = readSrc('modules/onboarding/onboarding-admin.routes.ts');
    expect(code).toContain('combinedMetrics');
  });
});

/* ═══ 5. SANDBOX HELPERS ══════════════════════════════════════════ */

describe('Hardening — Sandbox Verification', () => {
  const LOADTEST = path.resolve(SRC, '../loadtest');

  it('sandbox script exists', () => {
    expect(fs.existsSync(path.join(LOADTEST, 'onboarding-sandbox.ts'))).toBe(true);
  });

  it('sandbox covers payment success scenario', () => {
    const code = fs.readFileSync(path.join(LOADTEST, 'onboarding-sandbox.ts'), 'utf-8');
    expect(code).toContain('Payment Success');
    expect(code).toContain("status: 'success'");
  });

  it('sandbox covers payment failure scenario', () => {
    const code = fs.readFileSync(path.join(LOADTEST, 'onboarding-sandbox.ts'), 'utf-8');
    expect(code).toContain('Payment Failure');
    expect(code).toContain("status: 'failed'");
  });

  it('sandbox covers expired scenario', () => {
    const code = fs.readFileSync(path.join(LOADTEST, 'onboarding-sandbox.ts'), 'utf-8');
    expect(code).toContain('Payment Expired');
    expect(code).toContain("status: 'expired'");
  });

  it('sandbox covers duplicate webhook idempotency', () => {
    const code = fs.readFileSync(path.join(LOADTEST, 'onboarding-sandbox.ts'), 'utf-8');
    expect(code).toContain('Duplicate');
    expect(code).toContain('idempotent');
  });

  it('sandbox covers Stripe webhook dev mode', () => {
    const code = fs.readFileSync(path.join(LOADTEST, 'onboarding-sandbox.ts'), 'utf-8');
    expect(code).toContain('Stripe webhook');
    expect(code).toContain('checkout.session.completed');
  });
});

/* ═══ 6. REGRESSION — Waves 1-6 ═══════════════════════════════════ */

describe('Hardening — Regression Safety', () => {
  it('all onboarding routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/start');
    expect(paths).toContain('/verify-email');
    expect(paths).toContain('/checklist');
    expect(paths).toContain('/complete');
    expect(paths).toContain('/payment-session');
  });

  it('webhook routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-webhook.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/stripe');
    expect(paths).toContain('/paymob');
    expect(paths).toContain('/generic');
  });

  it('admin routes still include Wave 5+6 endpoints', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/provision');
    expect(paths).toContain('/funnel');
    expect(paths).toContain('/metrics');
    expect(paths).toContain('/abandoned');
  });

  it('barrel export includes hardening additions', async () => {
    const mod = await import('../modules/onboarding/index');
    expect(typeof mod.seedOnboardingTemplates).toBe('function');
    expect(typeof mod.verifyStripeSignature).toBe('function');
    expect(typeof mod.verifyPaymobSignature).toBe('function');
    expect(mod.ONBOARDING_TEMPLATES).toBeDefined();
  });
});
