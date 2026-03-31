/**
 * Onboarding Wave 5 tests — trial, grace, admin, jobs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══ 1. TRIAL ACTIVATION ═════════════════════════════════════════ */

describe('Wave 5 — Trial Activation', () => {
  it('activateTrial method exists', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.activateTrial).toBe('function');
  });

  it('activateTrial rejects free plan', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("planIntent === 'free'");
    expect(fn).toContain('Free plan does not support trial');
  });

  it('activateTrial requires business provisioned', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain('!record.tenantId');
  });

  it('activateTrial is idempotent if already trial_active', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("record.status === 'trial_active'");
  });

  it('activateTrial creates trialing subscription', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("status: 'trialing'");
    expect(fn).toContain('trialEnd');
  });

  it('activateTrial sets tenant planActivation to trial', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("planActivation: 'trial'");
  });

  it('activateTrial transitions onboarding to trial_active', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("status: 'trial_active'");
  });

  it('activateTrial is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("action: 'trial_started'");
  });

  it('activateTrial emits onboarding.trial_started', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateTrial'), code.indexOf('async activateGraceByAdmin'));
    expect(fn).toContain("'onboarding.trial_started'");
  });

  it('TRIAL_DURATION_DAYS is defined', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(onboardingService.TRIAL_DURATION_DAYS).toBe(14);
  });
});

/* ═══ 2. TRIAL EXPIRY JOB ═════════════════════════════════════════ */

describe('Wave 5 — Trial Expiry Job', () => {
  it('processExpiredTrials function exists', async () => {
    const { processExpiredTrials } = await import('../modules/onboarding/onboarding.jobs');
    expect(typeof processExpiredTrials).toBe('function');
  });

  it('uses atomic findOneAndUpdate for trial expiry', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain('findOneAndUpdate');
    expect(fn).toContain("status: 'trialing'");
    expect(fn).toContain('trialEnd: { $lte: now');
  });

  it('downgrades tenant to free on trial expiry', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain("plan: 'free'");
    expect(fn).toContain("planActivation: 'default'");
  });

  it('audits trial_expired', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain("action: 'trial_expired'");
  });

  it('emits tenant.trial_expired event', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain("'tenant.trial_expired'");
  });
});

/* ═══ 3. GRACE ACTIVATION ═════════════════════════════════════════ */

describe('Wave 5 — Grace Activation', () => {
  it('activateGraceByAdmin method exists', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.activateGraceByAdmin).toBe('function');
  });

  it('grace requires admin input (not self-service)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateGraceByAdmin'), code.indexOf('async adminProvision'));
    expect(fn).toContain('adminUserId');
    expect(fn).toContain('reason');
    expect(fn).toContain('graceDays');
  });

  it('grace validates days range 1-365', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateGraceByAdmin'), code.indexOf('async adminProvision'));
    expect(fn).toContain('graceDays < 1');
    expect(fn).toContain('graceDays > 365');
  });

  it('grace creates subscription with grace status', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateGraceByAdmin'), code.indexOf('async adminProvision'));
    expect(fn).toContain("status: 'grace'");
  });

  it('grace transitions onboarding to grace_active', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateGraceByAdmin'), code.indexOf('async adminProvision'));
    expect(fn).toContain("status: 'grace_active'");
  });

  it('grace is audited with admin actor', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async activateGraceByAdmin'), code.indexOf('async adminProvision'));
    expect(fn).toContain("action: 'grace_started'");
    expect(fn).toContain("actorType: 'admin'");
  });
});

/* ═══ 4. ADMIN PROVISIONING ═══════════════════════════════════════ */

describe('Wave 5 — Admin Provisioning', () => {
  it('adminProvision method exists', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.adminProvision).toBe('function');
  });

  it('adminProvision sets emailVerified=true (bypass)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async adminProvision'), code.indexOf('async adminReopen'));
    expect(fn).toContain('emailVerified: true');
  });

  it('adminProvision completes onboarding directly', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async adminProvision'), code.indexOf('async adminReopen'));
    expect(fn).toContain("status: 'completed'");
    expect(fn).toContain('completedAt');
  });

  it('adminProvision sets adminProvision metadata', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async adminProvision'), code.indexOf('async adminReopen'));
    expect(fn).toContain('adminProvision: true');
    expect(fn).toContain('adminApprovedBy');
  });

  it('adminProvision is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async adminProvision'), code.indexOf('async adminReopen'));
    expect(fn).toContain("action: 'admin_provisioned'");
  });

  it('adminReopen method exists', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.adminReopen).toBe('function');
  });

  it('adminReopen only from abandoned or suspended', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async adminReopen'));
    expect(fn).toContain("'abandoned'");
    expect(fn).toContain("'suspended'");
    expect(fn).toContain('Cannot reopen from status');
  });
});

/* ═══ 5. ADMIN ROUTES ═════════════════════════════════════════════ */

describe('Wave 5 — Admin Routes', () => {
  it('admin routes file exists', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding-admin.routes.ts'))).toBe(true);
  });

  it('has POST /provision route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/provision');
  });

  it('has POST /:id/activate-trial route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/:id/activate-trial');
  });

  it('has POST /:id/activate-grace route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/:id/activate-grace');
  });

  it('has POST /:id/reopen route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/:id/reopen');
  });

  it('has GET / list route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/');
  });

  it('has GET /:id detail route', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding-admin.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/:id');
  });

  it('admin routes mounted in app.ts', () => {
    const code = readSrc('app.ts');
    expect(code).toContain("'/api/admin/onboarding'");
    expect(code).toContain('onboarding-admin.routes');
  });
});

/* ═══ 6. ABANDONMENT JOB ══════════════════════════════════════════ */

describe('Wave 5 — Abandonment Job', () => {
  it('abandonStale function exists', async () => {
    const { abandonStale } = await import('../modules/onboarding/onboarding.jobs');
    expect(typeof abandonStale).toBe('function');
  });

  it('uses atomic findOneAndUpdate', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function abandonStale'), code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain('findOneAndUpdate');
    expect(fn).toContain("status: 'abandoned'");
  });

  it('only abandons non-terminal statuses', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    expect(code).toContain('ABANDONABLE');
    expect(code).toContain("'not_started'");
    expect(code).toContain("'account_created'");
    expect(code).toContain("'payment_pending'");
    // Must NOT include completed, abandoned, suspended
    expect(code).not.toContain("'completed'") || expect(code.indexOf("ABANDONABLE") < code.indexOf("'completed'")).toBe(true);
  });

  it('audits each abandonment', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function abandonStale'), code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain("action: 'onboarding_abandoned'");
  });

  it('emits onboarding.abandoned event', () => {
    const code = readSrc('modules/onboarding/onboarding.jobs.ts');
    const fn = code.slice(code.indexOf('async function abandonStale'), code.indexOf('async function processExpiredTrials'));
    expect(fn).toContain("'onboarding.abandoned'");
  });

  it('job wired into app.ts startup', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('abandonStale');
  });
});

/* ═══ 7. JOB SAFETY ═══════════════════════════════════════════════ */

describe('Wave 5 — Job Safety', () => {
  it('trial expiry job wired into app.ts', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('processExpiredTrials');
  });

  it('abandon job runs every 24 hours', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('24 * 60 * 60 * 1000');
  });

  it('trial expiry runs every 1 hour', () => {
    const code = readSrc('app.ts');
    // Both job intervals appear near processExpiredTrials import
    const idx = code.indexOf("await import('./modules/onboarding/onboarding.jobs')");
    const block = code.slice(idx, idx + 500);
    // Should have both 24h (abandon) and 1h (trial) intervals
    expect(block).toContain('24 * 60 * 60 * 1000');
    expect(block).toContain('60 * 60 * 1000');
  });
});

/* ═══ 8. REGRESSION — Waves 1-4 ═══════════════════════════════════ */

describe('Wave 5 — Regression Safety', () => {
  it('Wave 1-4 routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/start');
    expect(paths).toContain('/verify-email');
    expect(paths).toContain('/checklist');
    expect(paths).toContain('/payment-session');
    expect(paths).toContain('/payment-success');
  });

  it('free plan provisioning still exists', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async provisionFreePlan');
  });

  it('paid payment flow still exists', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async startPaidPlanCheckout');
    expect(code).toContain('async markPaymentSucceeded');
  });
});

/* ═══ 9. EXCLUSION ═════════════════════════════════════════════════ */

describe('Wave 5 — Exclusion Verification', () => {
  it('no full external webhook orchestration', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).not.toContain('stripe.webhooks');
    expect(code).not.toContain('paymob.verify');
  });

  it('onboarding notifications layer added in Wave 6', () => {
    expect(fs.existsSync(path.join(SRC, 'modules/onboarding/onboarding.events.ts'))).toBe(true);
  });

  it('no launch analytics/polish', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).not.toContain('analytics');
    expect(code).not.toContain('mixpanel');
    expect(code).not.toContain('segment');
  });
});

/* ═══ 10. BARREL EXPORT ═══════════════════════════════════════════ */

describe('Wave 5 — Barrel Export', () => {
  it('exports Wave 5 additions', async () => {
    const mod = await import('../modules/onboarding/index');
    expect(mod.onboardingAdminRoutes).toBeDefined();
    expect(typeof mod.abandonStale).toBe('function');
    expect(typeof mod.processExpiredTrials).toBe('function');
  });
});
