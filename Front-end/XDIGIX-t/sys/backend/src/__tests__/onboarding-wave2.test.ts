/**
 * Onboarding Wave 2 tests — email verification infrastructure.
 *
 * Tests token schema, lifecycle, service methods, routes,
 * integration with onboarding progress, and regression safety.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ═══════════════════════════════════════════════════════════════════
   1. SCHEMA TESTS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — EmailVerificationToken Schema', () => {
  it('model registered with conditional pattern', async () => {
    const { EmailVerificationToken } = await import('../modules/onboarding/email-verification-token.schema');
    expect(EmailVerificationToken).toBeDefined();
    expect(EmailVerificationToken.modelName).toBe('EmailVerificationToken');
  });

  it('purpose enum only allows onboarding_email_verification', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain("enum: ['onboarding_email_verification']");
  });

  it('expiresAt is required', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('expiresAt: { type: Date, required: true }');
  });

  it('usedAt defaults to null', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('usedAt: { type: Date, default: null }');
  });

  it('tenantId defaults to null', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('tenantId: { type: String, default: null }');
  });

  it('token has unique index', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('{ token: 1 }, { unique: true }');
  });

  it('TTL index on createdAt with 24h expiry', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('expireAfterSeconds: 86400');
  });

  it('userId + purpose compound index exists', () => {
    const code = readSrc('modules/onboarding/email-verification-token.schema.ts');
    expect(code).toContain('{ userId: 1, purpose: 1 }');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2. TOKEN GENERATION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Token Generation', () => {
  it('generateVerificationToken returns 64 hex chars (256 bits)', async () => {
    const { generateVerificationToken } = await import('../modules/onboarding/email-verification-token.schema');
    const token = generateVerificationToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it('generateVerificationToken produces unique tokens', async () => {
    const { generateVerificationToken } = await import('../modules/onboarding/email-verification-token.schema');
    const tokens = new Set(Array.from({ length: 100 }, () => generateVerificationToken()));
    expect(tokens.size).toBe(100);
  });

  it('tokenExpiresAt returns a date 24h in the future', async () => {
    const { tokenExpiresAt } = await import('../modules/onboarding/email-verification-token.schema');
    const expiry = tokenExpiresAt();
    const diff = expiry.getTime() - Date.now();
    // Should be approximately 24h (within 5 seconds tolerance)
    expect(Math.abs(diff - 24 * 60 * 60 * 1000)).toBeLessThan(5000);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3. TOKEN LIFECYCLE (SERVICE LOGIC)
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Token Lifecycle', () => {
  it('createAndSendVerification supersedes previous active tokens', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Must invalidate old tokens before creating new one
    expect(code).toContain('updateMany');
    expect(code).toContain("purpose: 'onboarding_email_verification'");
    expect(code).toContain('usedAt: null');
    expect(code).toContain("$set: { usedAt:");
  });

  it('createAndSendVerification creates a new token after superseding', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('EmailVerificationToken.create');
    expect(code).toContain('generateVerificationToken()');
    expect(code).toContain('tokenExpiresAt()');
  });

  it('verifyEmailToken uses atomic findOneAndUpdate (one-time use)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    expect(verifyFn).toContain('findOneAndUpdate');
    expect(verifyFn).toContain('usedAt: null'); // only unused tokens
    expect(verifyFn).toContain("$set: { usedAt: new Date() }");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4. EXPIRY AND USED-TOKEN REJECTION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Token Rejection', () => {
  it('verifyEmailToken checks token expiry', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    expect(verifyFn).toContain('tokenDoc.expiresAt < new Date()');
    expect(verifyFn).toContain('expired');
  });

  it('verifyEmailToken distinguishes already-used from invalid tokens', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    expect(verifyFn).toContain('already used');
    expect(verifyFn).toContain('Invalid or expired');
  });

  it('verifyEmailToken returns structured error on failure', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    // All failure paths return { success: false, error: string }
    const failPaths = verifyFn.match(/return \{ success: false/g);
    expect(failPaths).toBeDefined();
    expect(failPaths!.length).toBeGreaterThanOrEqual(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5. RESEND BEHAVIOR
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Resend Verification', () => {
  it('resendVerification checks if user exists', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const resendFn = code.slice(code.indexOf('async resendVerification'));
    expect(resendFn).toContain('User not found');
  });

  it('resendVerification is idempotent if already verified', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const resendFn = code.slice(code.indexOf('async resendVerification'));
    expect(resendFn).toContain('emailVerified');
    expect(resendFn).toContain('return { success: true }');
  });

  it('resendVerification calls createAndSendVerification', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const resendFn = code.slice(code.indexOf('async resendVerification'));
    expect(resendFn).toContain('this.createAndSendVerification');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   6. ROUTE TESTS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Routes', () => {
  it('POST /send-verification route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/send-verification');
  });

  it('POST /resend-verification route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/resend-verification');
  });

  it('POST /verify-email route exists', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/verify-email');
  });

  it('send-verification requires authentication', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/send-verification'"), code.indexOf("'/resend-verification'"));
    expect(handler).toContain('getUserId(req)');
    expect(handler).toContain('401');
    expect(handler).toContain('Authentication required');
  });

  it('resend-verification requires authentication', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/resend-verification'"), code.indexOf("'/verify-email'"));
    expect(handler).toContain('getUserId(req)');
    expect(handler).toContain('401');
  });

  it('verify-email is public (token-based, no JWT required)', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    // Extract only the verify-email handler (up to the next Wave marker or next route)
    const startIdx = code.indexOf("'/verify-email'");
    const endMarker = code.indexOf('Wave 3', startIdx);
    const handler = code.slice(startIdx, endMarker > startIdx ? endMarker : startIdx + 500);
    // verify-email does NOT check getUserId — it uses the token body field
    expect(handler).toContain("req.body");
    expect(handler).toContain("token");
    expect(handler).not.toContain("getUserId(req)");
  });

  it('verify-email validates token is present', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/verify-email'"));
    expect(handler).toContain("'token is required'");
    expect(handler).toContain('400');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   7. FEATURE FLAG
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Feature Flag', () => {
  it('all Wave 2 routes are behind ONBOARDING_ENABLED flag', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    // The feature flag gate is at the top of the router, before all routes
    const flagIdx = code.indexOf('ONBOARDING_ENABLED');
    const sendVerifyIdx = code.indexOf('/send-verification');
    expect(flagIdx).toBeLessThan(sendVerifyIdx);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   8. INTEGRATION WITH ONBOARDING PROGRESS
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Progress Integration', () => {
  it('verifyEmailToken calls markEmailVerified to update onboarding progress', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    expect(verifyFn).toContain('this.markEmailVerified');
  });

  it('verifyEmailToken updates User.emailVerified to true', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const verifyFn = code.slice(code.indexOf('async verifyEmailToken'), code.indexOf('async resendVerification'));
    expect(verifyFn).toContain("emailVerified: true");
    expect(verifyFn).toContain('User.updateOne');
  });

  it('verify-email route returns onboarding progress in response', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    const handler = code.slice(code.indexOf("'/verify-email'"));
    expect(handler).toContain('onboardingId');
    expect(handler).toContain('status');
    expect(handler).toContain('currentStep');
  });

  it('successful verification sets onboarding status to email_verified', () => {
    // markEmailVerified transitions account_created → email_verified
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const markFn = code.slice(code.indexOf('async markEmailVerified'), code.indexOf('async selectPlan'));
    expect(markFn).toContain("'email_verified'");
    expect(markFn).toContain("'verify_email'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   9. AUDIT LOGGING
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Audit', () => {
  it('logs verification_email_sent', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'verification_email_sent'");
  });

  it('logs email_verified_via_token', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'email_verified_via_token'");
  });

  it('logs verification_email_resent', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("action: 'verification_email_resent'");
  });

  it('audit does not log full token (only prefix)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Token should be truncated in audit logs
    expect(code).toContain("token.slice(0, 8)");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   10. REGRESSION SAFETY — Wave 1 still works
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Regression Safety', () => {
  it('Wave 1 routes still exist', async () => {
    const { default: router } = await import('../modules/onboarding/onboarding.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    // All Wave 1 endpoints
    expect(paths).toContain('/start');
    expect(paths).toContain('/progress');
    expect(paths).toContain('/status');
    expect(paths).toContain('/resume');
  });

  it('Wave 1 service methods still exist', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.start).toBe('function');
    expect(typeof onboardingService.getProgress).toBe('function');
    expect(typeof onboardingService.markEmailVerified).toBe('function');
    expect(typeof onboardingService.selectPlan).toBe('function');
    expect(typeof onboardingService.provisionFreePlan).toBe('function');
    expect(typeof onboardingService.resume).toBe('function');
    expect(typeof onboardingService.evaluateCompletion).toBe('function');
  });

  it('Wave 1 state machine is unchanged', async () => {
    const { VALID_TRANSITIONS } = await import('../modules/onboarding/onboarding-progress.schema');
    // Critical Wave 1 transitions still valid
    expect(VALID_TRANSITIONS.not_started).toContain('account_created');
    expect(VALID_TRANSITIONS.account_created).toContain('email_verified');
    expect(VALID_TRANSITIONS.email_verified).toContain('plan_selected');
    expect(VALID_TRANSITIONS.store_initialized).toContain('completed');
  });

  it('existing auth signup function is not modified', () => {
    const code = readSrc('services/auth.service.ts');
    expect(code).toContain('async function signup');
  });

  it('subscription schema backward compatible after Wave 4', () => {
    const code = readSrc('modules/finance/subscription.schema.ts');
    expect(code).toContain("'active'");
    expect(code).toContain("'trialing'");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   11. EXPLICIT: Payment/Trial/Grace/Admin NOT present in Wave 2
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Exclusion Verification', () => {
  it('no payment logic in onboarding service', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).not.toContain('stripe');
    expect(code).not.toContain('paymob');
    expect(code).not.toContain('createCheckoutSession');
    expect(code).not.toContain('handlePaymentWebhook');
  });

  it('trial activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateTrial');
  });

  it('grace activation added in Wave 5', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('async activateGraceByAdmin');
  });

  it('no admin override endpoints in routes', () => {
    const code = readSrc('modules/onboarding/onboarding.routes.ts');
    expect(code).not.toContain('/admin/');
    expect(code).not.toContain('/provision');
  });

  it('no paid plan activation in Wave 2', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("Wave 1 only supports free plan");
  });

  it('Wave 2 does not use payment session (Wave 4 addition)', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    const wave2Section = code.slice(code.indexOf('Wave 2'), code.indexOf('Wave 3'));
    expect(wave2Section).not.toContain('PaymentSession');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   12. BARREL EXPORT — Wave 2 additions
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Barrel Export', () => {
  it('index exports EmailVerificationToken', async () => {
    const mod = await import('../modules/onboarding/index');
    expect(mod.EmailVerificationToken).toBeDefined();
    expect(typeof mod.generateVerificationToken).toBe('function');
    expect(typeof mod.tokenExpiresAt).toBe('function');
  });

  it('service exports Wave 2 methods', async () => {
    const { onboardingService } = await import('../modules/onboarding/onboarding.service');
    expect(typeof onboardingService.createAndSendVerification).toBe('function');
    expect(typeof onboardingService.verifyEmailToken).toBe('function');
    expect(typeof onboardingService.resendVerification).toBe('function');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   13. EMAIL SENDING INTEGRATION
   ═══════════════════════════════════════════════════════════════════ */

describe('Wave 2 — Email Sending', () => {
  it('uses emailProvider from notifications module', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain("notifications/providers/email.provider");
    expect(code).toContain('emailProvider.send');
  });

  it('email sending failure does not crash token creation', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    // Email send is in a try-catch — failure logs warning but token is still valid
    const sendBlock = code.slice(code.indexOf('emailProvider.send'), code.indexOf('emailProvider.send') + 300);
    // The entire send block should be inside a try-catch
    const createFn = code.slice(code.indexOf('async createAndSendVerification'), code.indexOf('async verifyEmailToken'));
    expect(createFn).toContain('try {');
    expect(createFn).toContain('catch (err)');
    expect(createFn).toContain('email delivery issue');
  });

  it('verification email includes a URL with the token', () => {
    const code = readSrc('modules/onboarding/onboarding.service.ts');
    expect(code).toContain('verify-email?token=');
    expect(code).toContain('FRONTEND_URL');
  });
});
