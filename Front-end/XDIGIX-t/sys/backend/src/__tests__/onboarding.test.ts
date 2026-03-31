/**
 * Onboarding module tests — Wave 1.
 *
 * Tests schema, state machine, service exports, route structure,
 * idempotency, transition validation, and completion criteria.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ── Schema & State Machine ──────────────────────────────────────── */

describe('Onboarding — Schema & State Machine', () => {
  it('OnboardingProgress model registered with conditional pattern', async () => {
    const { OnboardingProgress } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(OnboardingProgress).toBeDefined();
    expect(OnboardingProgress.modelName).toBe('OnboardingProgress');
  });

  it('all 13 onboarding statuses are defined', async () => {
    const { ONBOARDING_STATUSES } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(ONBOARDING_STATUSES).toHaveLength(13);
    expect(ONBOARDING_STATUSES).toContain('not_started');
    expect(ONBOARDING_STATUSES).toContain('account_created');
    expect(ONBOARDING_STATUSES).toContain('email_verified');
    expect(ONBOARDING_STATUSES).toContain('plan_selected');
    expect(ONBOARDING_STATUSES).toContain('business_created');
    expect(ONBOARDING_STATUSES).toContain('payment_pending');
    expect(ONBOARDING_STATUSES).toContain('trial_active');
    expect(ONBOARDING_STATUSES).toContain('grace_active');
    expect(ONBOARDING_STATUSES).toContain('paid_active');
    expect(ONBOARDING_STATUSES).toContain('store_initialized');
    expect(ONBOARDING_STATUSES).toContain('completed');
    expect(ONBOARDING_STATUSES).toContain('abandoned');
    expect(ONBOARDING_STATUSES).toContain('suspended');
  });

  it('all 7 onboarding steps are defined', async () => {
    const { ONBOARDING_STEPS } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(ONBOARDING_STEPS).toHaveLength(7);
    expect(ONBOARDING_STEPS).toContain('signup');
    expect(ONBOARDING_STEPS).toContain('verify_email');
    expect(ONBOARDING_STEPS).toContain('select_plan');
    expect(ONBOARDING_STEPS).toContain('create_business');
    expect(ONBOARDING_STEPS).toContain('activate_plan');
    expect(ONBOARDING_STEPS).toContain('init_store');
    expect(ONBOARDING_STEPS).toContain('complete');
  });

  it('every status has at least one outgoing transition or is terminal', async () => {
    const { VALID_TRANSITIONS } = await import('../modules/onboarding/onboarding-progress.schema');
    for (const [status, targets] of Object.entries(VALID_TRANSITIONS)) {
      // completed is the only true terminal state (empty transitions)
      if (status === 'completed') {
        expect(targets).toHaveLength(0);
      } else {
        expect(targets.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

/* ── State Transition Validation ─────────────────────────────────── */

describe('Onboarding — Transition Validation', () => {
  it('not_started → account_created is valid', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('not_started', 'account_created')).toBe(true);
  });

  it('account_created → email_verified is valid', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('account_created', 'email_verified')).toBe(true);
  });

  it('email_verified → plan_selected is valid', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('email_verified', 'plan_selected')).toBe(true);
  });

  it('plan_selected → business_created is valid', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('plan_selected', 'business_created')).toBe(true);
  });

  it('store_initialized → completed is valid', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('store_initialized', 'completed')).toBe(true);
  });

  it('abandoned → account_created is valid (resume)', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('abandoned', 'account_created')).toBe(true);
  });

  it('not_started → completed is INVALID (cannot skip)', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('not_started', 'completed')).toBe(false);
  });

  it('account_created → business_created is INVALID (email not verified)', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('account_created', 'business_created')).toBe(false);
  });

  it('plan_selected → completed is INVALID (cannot skip provisioning)', async () => {
    const { canTransitionOnboarding } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(canTransitionOnboarding('plan_selected', 'completed')).toBe(false);
  });

  it('completed → anything is INVALID (terminal)', async () => {
    const { canTransitionOnboarding, ONBOARDING_STATUSES } = await import('../modules/onboarding/onboarding-progress.schema');
    for (const target of ONBOARDING_STATUSES) {
      if (target === 'completed') continue;
      expect(canTransitionOnboarding('completed', target)).toBe(false);
    }
  });

  it('validateOnboardingTransition throws on invalid', async () => {
    const { validateOnboardingTransition } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(() => validateOnboardingTransition('not_started', 'completed')).toThrow('Invalid onboarding transition');
  });

  it('validateOnboardingTransition does not throw on valid', async () => {
    const { validateOnboardingTransition } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(() => validateOnboardingTransition('account_created', 'email_verified')).not.toThrow();
  });
});

/* ── Service Exports ─────────────────────────────────────────────── */

describe('Onboarding — Service Layer', () => {
  it('exports all Wave 1 methods', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.start).toBe('function');
    expect(typeof onboardingService.getProgress).toBe('function');
    expect(typeof onboardingService.getById).toBe('function');
    expect(typeof onboardingService.markEmailVerified).toBe('function');
    expect(typeof onboardingService.selectPlan).toBe('function');
    expect(typeof onboardingService.provisionFreePlan).toBe('function');
    expect(typeof onboardingService.resume).toBe('function');
    expect(typeof onboardingService.evaluateCompletion).toBe('function');
  });
});

/* ── Route Structure ─────────────────────────────────────────────── */

describe('Onboarding — Routes', () => {
  it('onboarding router has Wave 1 endpoints', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => ({
      path: l.route!.path,
      methods: Object.keys(l.route!.methods),
    }));

    const paths = routes.map((r) => r.path);

    // Wave 1 endpoints
    expect(paths).toContain('/start');
    expect(paths).toContain('/progress');
    expect(paths).toContain('/status');
    expect(paths).toContain('/resume');
  });

  it('routes use correct HTTP methods', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => ({
      path: l.route!.path,
      methods: Object.keys(l.route!.methods),
    }));

    // /progress has both GET and PATCH, so check all methods for each path
    const allMethods = routes.flatMap((r) => r.methods);
    expect(allMethods).toContain('post');  // /start, /resume
    expect(allMethods).toContain('get');   // /progress, /status
    expect(allMethods).toContain('patch'); // /progress (update)
  });
});

/* ── Feature Flag Gate ───────────────────────────────────────────── */

describe('Onboarding — Feature Flag', () => {
  it('routes file checks ONBOARDING_ENABLED', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain('ONBOARDING_ENABLED');
    expect(code).toContain("'Onboarding is not yet available'");
  });
});

/* ── Idempotency ─────────────────────────────────────────────────── */

describe('Onboarding — Idempotency', () => {
  it('start() checks for existing onboarding by userId', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('findOne({ userId: input.userId })');
    expect(code).toContain('Onboarding already exists');
  });

  it('provisionFreePlan uses upserts for tenant, business, staff, subscription', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Business uses upsert
    expect(code).toContain('$setOnInsert');
    expect(code).toContain('upsert: true');
    // User link only sets if null
    expect(code).toContain('tenantId: null');
    // Site checks before creating
    expect(code).toContain('findOne({ tenantId })');
  });

  it('markEmailVerified returns existing if already verified', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("record.status === 'email_verified'");
    expect(code).toContain("completedSteps.includes('verify_email')");
  });

  it('selectPlan allows re-selection when already plan_selected', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("record.status === 'plan_selected'");
  });
});

/* ── Audit Logging ───────────────────────────────────────────────── */

describe('Onboarding — Audit', () => {
  it('service logs onboarding_started', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'onboarding_started'");
  });

  it('service logs email_verified', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'email_verified'");
  });

  it('service logs free_plan_provisioned', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'free_plan_provisioned'");
  });

  it('service logs onboarding_resumed', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'onboarding_resumed'");
  });
});

/* ── Event Emission ──────────────────────────────────────────────── */

describe('Onboarding — Events', () => {
  it('emits onboarding.started', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("'onboarding.started'");
  });

  it('emits onboarding.email_verified', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("'onboarding.email_verified'");
  });

  it('emits onboarding.completed', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("'onboarding.completed'");
  });

  it('emits onboarding.plan_selected', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("'onboarding.plan_selected'");
  });
});

/* ── Completion Criteria ─────────────────────────────────────────── */

describe('Onboarding — Completion', () => {
  it('evaluateCompletion checks all 5 hard criteria', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('emailVerified');
    expect(code).toContain('businessExists');
    expect(code).toContain('planValid');
    expect(code).toContain('siteExists');
    expect(code).toContain('userLinked');
  });

  it('planValid checks for trial activation type', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("'trial'");
    expect(code).toContain("'grace'");
    expect(code).toContain("'paid'");
    expect(code).toContain("'default'");
  });
});

/* ── Tenant Schema Extension ─────────────────────────────────────── */

describe('Onboarding — Tenant Extension', () => {
  it('PlanActivation type includes trial', () => {
    const code = readSrc('modules/platform-core/tenant.schema.ts');
    expect(code).toContain("'trial'");
  });

  it('planActivation enum includes trial', () => {
    const code = readSrc('modules/platform-core/tenant.schema.ts');
    expect(code).toContain("'paid', 'grace', 'default', 'trial'");
  });
});

/* ── Wave 1 Boundaries ───────────────────────────────────────────── */

describe('Onboarding — Wave 1 Boundaries', () => {
  it('provisionFreePlan rejects non-free plans', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("Wave 1 only supports free plan");
  });

  it('payment session schema may exist (Wave 4+)', () => {
    // Wave 4 adds payment-session.schema.ts — this is expected
    // Wave 1 code does not USE it, verified by no import in service
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const wave1Section = code.slice(0, code.indexOf('Wave 2'));
    expect(wave1Section).not.toContain('PaymentSession');
  });

  it('trial activation added in Wave 5 (forward-compatible)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateTrial');
  });
});

/* ── Barrel Export ───────────────────────────────────────────────── */

describe('Onboarding — Barrel Export', () => {
  it('index exports all public API', async () => {
    const mod = await import('../modules/onboarding/index');
    expect(mod.onboardingService).toBeDefined();
    expect(mod.onboardingRoutes).toBeDefined();
    expect(mod.OnboardingProgress).toBeDefined();
    expect(mod.ONBOARDING_STATUSES).toBeDefined();
    expect(mod.ONBOARDING_STEPS).toBeDefined();
    expect(mod.VALID_TRANSITIONS).toBeDefined();
    expect(typeof mod.canTransitionOnboarding).toBe('function');
    expect(typeof mod.validateOnboardingTransition).toBe('function');
  });
});

/* ── App Integration ─────────────────────────────────────────────── */

describe('Onboarding — App Integration', () => {
  it('onboarding routes are mounted in app.ts', () => {
    const code = readSrc('app.ts');
    expect(code).toContain("'/api/onboarding'");
    expect(code).toContain('onboarding/onboarding.routes');
  });

  it('routes are mounted before the main /api catch-all', () => {
    const code = readSrc('app.ts');
    const onboardingMount = code.indexOf("'/api/onboarding'");
    const mainMount = code.indexOf("app.use('/api', routes)");
    expect(onboardingMount).toBeLessThan(mainMount);
  });
});

/* ── Resume Logic ────────────────────────────────────────────────── */

describe('Onboarding — Resume', () => {
  it('resume determines correct step from completedSteps', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Should check completedSteps to determine resume point
    expect(code).toContain("steps.includes('select_plan')");
    expect(code).toContain("steps.includes('verify_email')");
  });

  it('resume only works from abandoned or suspended', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("abandoned");
    expect(code).toContain("suspended");
    expect(code).toContain("$in: ['abandoned', 'suspended']");
  });

  it('resume returns current progress if not in resumable state', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // When status is not abandoned/suspended, resume returns existing record unchanged
    expect(code).toContain("record.status !== 'abandoned'");
    expect(code).toContain("record.status !== 'suspended'");
    expect(code).toContain('return record');
  });
});

/* ── Schema Defaults ─────────────────────────────────────────────── */

describe('Onboarding — Schema Defaults', () => {
  it('default status is not_started', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("default: 'not_started'");
  });

  it('default currentStep is signup', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("default: 'signup'");
  });

  it('default retryCount is 0', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain('retryCount: { type: Number, default: 0');
  });

  it('default completedSteps is empty array', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("completedSteps: { type: [String], default: [] }");
  });

  it('tenantId and businessId default to null', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("tenantId: { type: String, default: null }");
    expect(code).toContain("businessId: { type: String, default: null }");
  });

  it('completedAt and abandonedAt default to null', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("completedAt: { type: Date, default: null }");
    expect(code).toContain("abandonedAt: { type: Date, default: null }");
  });
});

/* ── One-Record-Per-User Uniqueness ──────────────────────────────── */

describe('Onboarding — Uniqueness', () => {
  it('userId has a unique index', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain("{ userId: 1 }");
    // The index block should contain unique for userId
    const indexBlock = code.slice(code.indexOf('/* ── Indexes'));
    expect(indexBlock).toContain('userId: 1 }, { unique: true');
  });

  it('onboardingId has a unique index', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    const indexBlock = code.slice(code.indexOf('/* ── Indexes'));
    expect(indexBlock).toContain('onboardingId: 1 }, { unique: true');
  });

  it('service start() prevents duplicates via findOne before create', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const startFn = code.slice(code.indexOf('async start('), code.indexOf('async getProgress('));
    // Must check existing before creating
    expect(startFn).toContain('findOne({ userId');
    expect(startFn).toContain('if (existing)');
    expect(startFn).toContain('return existing');
  });
});

/* ── Forward-Compatible Fields ───────────────────────────────────── */

describe('Onboarding — Forward Compatibility', () => {
  it('payment_pending status exists as placeholder but is not used in Wave 1 service', async () => {
    const { ONBOARDING_STATUSES } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(ONBOARDING_STATUSES).toContain('payment_pending');

    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Wave 1 service should never transition TO payment_pending
    expect(code).not.toContain("→ status='payment_pending'");
    expect(code).not.toMatch(/\$set:.*status:\s*'payment_pending'/);
  });

  it('trial_active and grace_active states exist and are used by Wave 5', async () => {
    const { ONBOARDING_STATUSES } = await import('../modules/onboarding/onboarding-progress.schema');
    expect(ONBOARDING_STATUSES).toContain('trial_active');
    expect(ONBOARDING_STATUSES).toContain('grace_active');
  });

  it('trialEndsAt field exists in schema but is never set in Wave 1', () => {
    const code = readSrc('modules/onboarding/onboarding-progress.schema.ts');
    expect(code).toContain('trialEndsAt');

    const svcCode = readSrc('modules/onboarding/onboarding.service.ts');
    // Only provisionFreePlan sets fields, and it should NOT set trialEndsAt
    const provisionFn = svcCode.slice(
      svcCode.indexOf('async provisionFreePlan'),
      svcCode.indexOf('async resume'),
    );
    expect(provisionFn).not.toContain('trialEndsAt:');
  });
});

/* ── Route Auth Expectations ─────────────────────────────────────── */

describe('Onboarding — Route Auth', () => {
  it('authenticated routes check userId, public verify-email uses token', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    // Authenticated handlers call getUserId
    const authRoutes = ['/start', '/progress', '/status', '/resume', '/send-verification', '/resend-verification'];
    for (const route of authRoutes) {
      const routeBlock = code.slice(code.indexOf(`'${route}'`), code.indexOf(`'${route}'`) + 500);
      expect(routeBlock).toContain('getUserId(req)');
    }
    // Public verify-email uses token from body, not getUserId
    const verifyBlock = code.slice(code.indexOf("'/verify-email'"));
    expect(verifyBlock).toContain('req.body');
    expect(verifyBlock).toContain('token');
  });

  it('missing userId returns 401', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain("401");
    expect(code).toContain("'Authentication required'");
  });
});

/* ── PATCH /progress Action Validation ───────────────────────────── */

describe('Onboarding — Progress Update Validation', () => {
  it('PATCH /progress requires action field', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain("'action is required'");
    expect(code).toContain("!action");
  });

  it('PATCH /progress rejects unknown actions', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain('Unknown action');
    expect(code).toContain('400');
  });

  it('PATCH /progress requires planId for select_plan action', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain("'planId is required'");
  });

  it('PATCH /progress requires businessName for provision_free action', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain("'businessName is required'");
  });

  it('PATCH supports only verify_email, select_plan, provision_free actions', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain("case 'verify_email'");
    expect(code).toContain("case 'select_plan'");
    expect(code).toContain("case 'provision_free'");
  });
});

/* ── Status Endpoint Normalized Output ───────────────────────────── */

describe('Onboarding — Status Endpoint', () => {
  it('GET /status returns completionReady boolean', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain('completionReady');
    expect(code).toContain('allMet');
  });

  it('GET /status returns criteria object', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).toContain('criteria');
  });

  it('GET /status returns onboardingId and status', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const statusHandler = code.slice(code.indexOf("get('/status'"), code.indexOf("patch('/progress'"));
    expect(statusHandler).toContain('onboardingId');
    expect(statusHandler).toContain('status');
  });
});

/* ── Regression Safety ───────────────────────────────────────────── */

describe('Onboarding — Regression Safety', () => {
  it('existing auth.service signup function is not modified', () => {
    const code = readSrc('services/auth.service.ts');
    // signup should still exist and create client_staff type
    expect(code).toContain('async function signup');
    expect(code).toContain("type: 'client_staff'");
  });

  it('existing tenantService.createTenant is not modified', () => {
    const code = readSrc('modules/platform-core/tenant.service.ts');
    expect(code).toContain('async createTenant');
    // Should still accept (tenantId, plan) params
    expect(code).toContain("plan = 'free'");
  });

  it('existing tenant schema backward compatible (default is still default)', () => {
    const code = readSrc('modules/platform-core/tenant.schema.ts');
    expect(code).toContain("default: 'default'");
    // Existing records with 'paid', 'grace', 'default' still valid
    expect(code).toContain("'paid'");
    expect(code).toContain("'grace'");
    expect(code).toContain("'default'");
  });

  it('subscription schema backward compatible (Wave 4 extensions additive)', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    // Original statuses still present
    expect(code).toContain("'active'");
    expect(code).toContain("'past_due'");
    expect(code).toContain("'cancelled'");
    expect(code).toContain("'trialing'");
    // Wave 4 added pending + grace (additive, backward compatible)
    expect(code).toContain("'pending'");
  });

  it('no new subscription/payment logic introduced in Wave 1 service', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // No Stripe/Paymob references
    expect(code).not.toContain('stripe');
    expect(code).not.toContain('paymob');
    // No checkout session creation
    expect(code).not.toContain('createCheckoutSession');
    expect(code).not.toContain('handlePaymentWebhook');
  });

  it('no admin override endpoints in Wave 1', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).not.toContain('/admin/');
    expect(code).not.toContain('/provision');
    expect(code).not.toContain('/activate-grace');
  });

  it('no builder auto-provision beyond free plan scope', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // provisionFreePlan creates site, but only for free plan
    expect(code).toContain("record.planIntent !== 'free'");
    // No call to builderService.publishSite
    expect(code).not.toContain('publishSite');
  });

  it('clients.routes create-client endpoint still exists (not replaced)', () => {
    const code = readSrc('routes/clients.routes.ts');
    expect(code).toContain('create-client');
  });
});

/* ── No Unintended Cross-Module Coupling ──────────────────────────── */

describe('Onboarding — Module Boundaries', () => {
  it('onboarding service only imports from platform-core and lib', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Should import from platform-core (audit, eventBus, tenantService)
    expect(code).toContain("from '../platform-core/");
    expect(code).toContain("from '../../lib/logger'");
    // Should NOT directly import finance, builder, shipping, etc.
    expect(code).not.toContain("from '../finance/");
    expect(code).not.toContain("from '../builder/");
    expect(code).not.toContain("from '../shipping");
    expect(code).not.toContain("from '../fulfillment/");
  });

  it('onboarding uses mongoose.models for cross-module model access', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Should use mongoose.models (lazy, no import-time coupling)
    expect(code).toContain('mongoose.models.Business');
    expect(code).toContain('mongoose.models.User');
    expect(code).toContain('mongoose.models.Site');
    expect(code).toContain('mongoose.models.Subscription');
  });
});
