/**
 * Onboarding Wave 3 tests — business profile completion + onboarding readiness.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══════════════════════════════════════════════════════════════════
   1. BUSINESS SCHEMA EXTENSION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Business Schema Extension', () => {
  it('IBusiness interface includes contactEmail', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain('contactEmail');
  });

  it('IBusiness interface includes contactPhone', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain('contactPhone');
  });

  it('IBusiness interface includes country', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain("country?: string");
  });

  it('IBusiness interface includes currency as top-level field', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain("currency?: string");
  });

  it('IBusiness interface includes slug', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain("slug?: string");
  });

  it('IBusiness interface includes logoUrl', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain("logoUrl?: string");
  });

  it('new fields all default to null (backward compatible)', () => {
    const code = readSrc('schemas/business.schema.ts');
    expect(code).toContain("contactEmail: { type: String, default: null }");
    expect(code).toContain("contactPhone: { type: String, default: null }");
    expect(code).toContain("country: { type: String, default: null }");
    expect(code).toContain("slug: { type: String, default: null }");
    expect(code).toContain("logoUrl: { type: String, default: null }");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2. CHECKLIST LOGIC
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Completion Checklist', () => {
  it('service defines REQUIRED_PROFILE_FIELDS', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('REQUIRED_PROFILE_FIELDS');
    expect(code).toContain("'name'");
    expect(code).toContain("'contactEmail'");
    expect(code).toContain("'country'");
    expect(code).toContain("'currency'");
  });

  it('getCompletionChecklist checks emailVerified from User', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('emailVerified');
    expect(fn).toContain('user?.emailVerified');
  });

  it('getCompletionChecklist checks planSelected from onboarding record', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('planSelected');
    expect(fn).toContain('record.planIntent');
  });

  it('getCompletionChecklist checks business existence', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('businessExists');
    expect(fn).toContain('Business.findOne');
  });

  it('getCompletionChecklist checks required profile fields on real Business doc', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('REQUIRED_PROFILE_FIELDS');
    expect(fn).toContain('missingProfileFields');
  });

  it('getCompletionChecklist checks siteExists', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('siteExists');
    expect(fn).toContain('Site.findOne');
  });

  it('getCompletionChecklist returns blockedReason when not completable', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async getCompletionChecklist'), code.indexOf('async completeOnboarding'));
    expect(fn).toContain('blockedReason');
    expect(fn).toContain('Email not verified');
    expect(fn).toContain('Plan not selected');
    expect(fn).toContain('Business not provisioned');
    expect(fn).toContain('Missing required fields');
    expect(fn).toContain('Store not initialized');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3. BUSINESS PROFILE UPDATE
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Business Profile Update', () => {
  it('updateBusinessProfile writes to Business collection, not onboarding', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    expect(fn).toContain('Business.updateOne');
    // Must NOT write profile data to OnboardingProgress
    expect(fn).not.toContain('OnboardingProgress.updateOne');
    expect(fn).not.toContain('OnboardingProgress.findOneAndUpdate');
  });

  it('updateBusinessProfile requires businessId to be provisioned', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    expect(fn).toContain("!record.businessId");
    expect(fn).toContain('Business not yet provisioned');
  });

  it('updateBusinessProfile filters to only allowed fields', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    expect(fn).toContain('updates.name');
    expect(fn).toContain('updates.contactEmail');
    expect(fn).toContain('updates.contactPhone');
    expect(fn).toContain('updates.country');
    expect(fn).toContain('updates.currency');
    expect(fn).toContain('updates.slug');
    expect(fn).toContain('updates.logoUrl');
  });

  it('updateBusinessProfile rejects empty update', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    expect(fn).toContain('No valid fields provided');
  });

  it('updateBusinessProfile is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    expect(fn).toContain("action: 'business_profile_updated'");
    expect(fn).toContain('updatedFields');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4. COMPLETION READINESS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Completion Readiness', () => {
  it('completeOnboarding is idempotent if already completed', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("record.status === 'completed'");
    expect(fn).toContain('return { success: true, progress: record }');
  });

  it('completeOnboarding rejects when checklist incomplete', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain('!completable');
    expect(fn).toContain('Onboarding cannot be completed yet');
    expect(fn).toContain('blockedReason');
  });

  it('completeOnboarding only allows from valid statuses', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("'store_initialized'");
    expect(fn).toContain("'business_created'");
    expect(fn).toContain('Cannot complete from status');
  });

  it('completeOnboarding uses atomic update to prevent races', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("status: { $ne: 'completed' }");
    expect(fn).toContain('findOneAndUpdate');
  });

  it('completeOnboarding is audited', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("action: 'onboarding_completed'");
  });

  it('completeOnboarding emits onboarding.completed event', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("'onboarding.completed'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5. ROUTES
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Routes', () => {
  it('GET /checklist route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/checklist');
  });

  it('PATCH /business-profile route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/business-profile');
  });

  it('POST /complete route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/complete');
  });

  it('all Wave 3 routes require authentication', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    for (const route of ['/checklist', '/business-profile', '/complete']) {
      const idx = code.indexOf(`'${route}'`);
      const block = code.slice(idx, idx + 300);
      expect(block).toContain('getUserId(req)');
      expect(block).toContain('401');
    }
  });

  it('POST /complete returns blockedReason on failure', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/complete'"));
    expect(handler).toContain('blockedReason');
    expect(handler).toContain('422');
  });

  it('GET /checklist returns completable boolean and blockedReason', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/checklist'"), code.indexOf("'/business-profile'"));
    expect(handler).toContain('completable');
    expect(handler).toContain('blockedReason');
    expect(handler).toContain('checklist');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   6. FEATURE FLAG
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Feature Flag', () => {
  it('Wave 3 routes are behind ONBOARDING_ENABLED', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const flagIdx = code.indexOf('ONBOARDING_ENABLED');
    const checklistIdx = code.indexOf('/checklist');
    const profileIdx = code.indexOf('/business-profile');
    const completeIdx = code.lastIndexOf('/complete');
    expect(flagIdx).toBeLessThan(checklistIdx);
    expect(flagIdx).toBeLessThan(profileIdx);
    expect(flagIdx).toBeLessThan(completeIdx);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   7. IDEMPOTENCY
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Idempotency', () => {
  it('completeOnboarding returns success if already completed', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async completeOnboarding'));
    expect(fn).toContain("record.status === 'completed'");
    expect(fn).toContain('success: true');
  });

  it('updateBusinessProfile can be called multiple times safely', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const fn = code.slice(code.indexOf('async updateBusinessProfile'), code.indexOf('async getCompletionChecklist'));
    // Uses updateOne with $set — not upsert, so it updates existing doc in place
    expect(fn).toContain('$set');
    // Does NOT create new business docs
    expect(fn).not.toContain('$setOnInsert');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   8. REGRESSION — Wave 1 and Wave 2 still work
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Regression Safety', () => {
  it('Wave 1 routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/start');
    expect(paths).toContain('/progress');
    expect(paths).toContain('/status');
    expect(paths).toContain('/resume');
  });

  it('Wave 2 routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/send-verification');
    expect(paths).toContain('/resend-verification');
    expect(paths).toContain('/verify-email');
  });

  it('Wave 1 service methods still exist', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.start).toBe('function');
    expect(typeof onboardingService.provisionFreePlan).toBe('function');
    expect(typeof onboardingService.resume).toBe('function');
  });

  it('Wave 2 service methods still exist', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.createAndSendVerification).toBe('function');
    expect(typeof onboardingService.verifyEmailToken).toBe('function');
    expect(typeof onboardingService.resendVerification).toBe('function');
  });

  it('subscription schema backward compatible after Wave 4', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain("'active'");
    expect(code).toContain("'trialing'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   9. EXPLICIT EXCLUSION — Payment/Trial/Grace/Admin NOT in Wave 3
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Exclusion Verification', () => {
  it('no payment logic', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).not.toContain('stripe');
    expect(code).not.toContain('paymob');
    expect(code).not.toContain('createCheckoutSession');
    expect(code).not.toContain('handlePaymentWebhook');
  });

  it('no paid plan activation', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("Wave 1 only supports free plan");
  });

  it('trial activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateTrial');
  });

  it('grace activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateGraceByAdmin');
  });

  it('no admin override endpoints', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).not.toContain('/admin/');
    expect(code).not.toContain('/provision');
  });

  it('Wave 3 does not use payment session (Wave 4 addition)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const wave3Section = code.slice(code.indexOf('Wave 3'), code.indexOf('Wave 4'));
    expect(wave3Section).not.toContain('PaymentSession');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   10. SERVICE EXPORTS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 3 — Service Exports', () => {
  it('exports Wave 3 methods', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.updateBusinessProfile).toBe('function');
    expect(typeof onboardingService.getCompletionChecklist).toBe('function');
    expect(typeof onboardingService.completeOnboarding).toBe('function');
    expect(onboardingService.REQUIRED_PROFILE_FIELDS).toBeDefined();
    expect(onboardingService.REQUIRED_PROFILE_FIELDS.length).toBeGreaterThanOrEqual(3);
  });
});
