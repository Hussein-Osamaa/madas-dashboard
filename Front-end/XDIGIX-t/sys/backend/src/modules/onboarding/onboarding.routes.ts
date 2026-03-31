/**
 * Onboarding routes — Wave 1: start, progress, resume, free-plan completion.
 *
 * All routes except /start require JWT auth.
 * Feature-gated by ONBOARDING_ENABLED env var.
 */
import { Router, Request, Response } from 'express';
import { onboardingService } from './onboarding.service';
import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from './onboarding-progress.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-routes');
const router = Router();

/* ── Feature gate ─────────────────────────────────────────────────── */

if (process.env.ONBOARDING_ENABLED !== 'true') {
  router.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Onboarding is not yet available' });
  });
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getUserId(req: Request): string | undefined {
  return (req as Record<string, unknown>).userId as string ||
    ((req as Record<string, unknown>).accountPayload as Record<string, unknown>)?.userId as string;
}

function getUserEmail(req: Request): string {
  return (req as Record<string, unknown>).userEmail as string ||
    ((req as Record<string, unknown>).accountPayload as Record<string, unknown>)?.email as string || '';
}

/* ── POST /start — start or retrieve onboarding ───────────────────── */

router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const record = await onboardingService.start({
      userId,
      email: getUserEmail(req),
      signupSource: req.body?.signupSource,
      referralCode: req.body?.referralCode,
    });

    res.status(201).json({
      ok: true,
      onboarding: {
        onboardingId: record.onboardingId,
        status: record.status,
        currentStep: record.currentStep,
        completedSteps: record.completedSteps,
      },
    });
  } catch (err) {
    log.error('Start onboarding failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to start onboarding' });
  }
});

/* ── GET /progress — get current onboarding state ─────────────────── */

router.get('/progress', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const record = await onboardingService.getProgress(userId);
    if (!record) {
      return res.status(404).json({ ok: false, error: 'No onboarding found' });
    }

    res.json({ ok: true, onboarding: record });
  } catch (err) {
    log.error('Get progress failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get progress' });
  }
});

/* ── GET /status — evaluate completion readiness ──────────────────── */

router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { progress, criteria } = await onboardingService.evaluateCompletion(userId);
    if (!progress) {
      return res.status(404).json({ ok: false, error: 'No onboarding found' });
    }

    const allMet = Object.values(criteria).every(Boolean);

    res.json({
      ok: true,
      onboardingId: progress.onboardingId,
      status: progress.status,
      completionReady: allMet,
      criteria,
    });
  } catch (err) {
    log.error('Get status failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get status' });
  }
});

/* ── PATCH /progress — update onboarding step (email verified, plan selected) */

router.patch('/progress', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { action, planId, businessName, currency } = req.body || {};

    if (!action) {
      return res.status(400).json({ ok: false, error: 'action is required' });
    }

    let result;

    switch (action) {
      case 'verify_email':
        result = await onboardingService.markEmailVerified(userId);
        break;

      case 'select_plan':
        if (!planId) return res.status(400).json({ ok: false, error: 'planId is required' });
        result = await onboardingService.selectPlan(userId, planId);
        break;

      case 'provision_free':
        if (!businessName) return res.status(400).json({ ok: false, error: 'businessName is required' });
        result = await onboardingService.provisionFreePlan(userId, { businessName, currency });
        break;

      default:
        return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
    }

    if (!result) {
      return res.status(404).json({ ok: false, error: 'Onboarding not found' });
    }

    res.json({ ok: true, onboarding: result });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Invalid onboarding transition') || msg.startsWith('Cannot provision') || msg.startsWith('Wave 1')) {
      return res.status(422).json({ ok: false, error: msg });
    }
    if (msg.startsWith('Plan not found')) {
      return res.status(404).json({ ok: false, error: msg });
    }
    log.error('Update progress failed', { error: msg });
    res.status(500).json({ ok: false, error: 'Failed to update progress' });
  }
});

/* ── POST /resume — resume an abandoned onboarding ────────────────── */

router.post('/resume', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const result = await onboardingService.resume(userId);
    if (!result) {
      return res.status(404).json({ ok: false, error: 'No onboarding found' });
    }

    res.json({
      ok: true,
      onboarding: {
        onboardingId: result.onboardingId,
        status: result.status,
        currentStep: result.currentStep,
        completedSteps: result.completedSteps,
      },
    });
  } catch (err) {
    log.error('Resume onboarding failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to resume onboarding' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   Wave 2: Email Verification Endpoints
   ══════════════════════════════════════════════════════════════════ */

/** POST /send-verification — send (or re-create) verification email. Requires auth. */
router.post('/send-verification', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const email = getUserEmail(req);
    if (!email) {
      return res.status(400).json({ ok: false, error: 'No email associated with account' });
    }

    const { expiresAt } = await onboardingService.createAndSendVerification(userId, email);
    res.json({ ok: true, message: 'Verification email sent', expiresAt });
  } catch (err) {
    log.error('Send verification failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to send verification email' });
  }
});

/** POST /resend-verification — resend verification email. Requires auth. */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const result = await onboardingService.resendVerification(userId);
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    res.json({ ok: true, message: 'Verification email resent' });
  } catch (err) {
    log.error('Resend verification failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to resend verification email' });
  }
});

/** POST /verify-email — verify email with token. Public (token-based auth). */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'token is required' });
    }

    const result = await onboardingService.verifyEmailToken(token);
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    res.json({
      ok: true,
      message: 'Email verified successfully',
      onboarding: result.progress ? {
        onboardingId: result.progress.onboardingId,
        status: result.progress.status,
        currentStep: result.progress.currentStep,
      } : null,
    });
  } catch (err) {
    log.error('Verify email failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to verify email' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   Wave 3: Business Profile + Completion
   ══════════════════════════════════════════════════════════════════ */

/** GET /checklist — get completion checklist with missing items and blocked reason */
router.get('/checklist', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const result = await onboardingService.getCompletionChecklist(userId);
    if (!result.progress) {
      return res.status(404).json({ ok: false, error: 'No onboarding found' });
    }

    res.json({
      ok: true,
      onboardingId: result.progress.onboardingId,
      status: result.progress.status,
      checklist: result.checklist,
      completable: result.completable,
      blockedReason: result.blockedReason,
    });
  } catch (err) {
    log.error('Get checklist failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get checklist' });
  }
});

/** PATCH /business-profile — update business profile during onboarding */
router.patch('/business-profile', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { name, contactEmail, contactPhone, country, currency, slug, logoUrl } = req.body || {};
    const result = await onboardingService.updateBusinessProfile(userId, {
      name, contactEmail, contactPhone, country, currency, slug, logoUrl,
    });

    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    res.json({ ok: true, message: 'Business profile updated' });
  } catch (err) {
    log.error('Update business profile failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to update business profile' });
  }
});

/** POST /complete — complete onboarding (requires all checklist items) */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const result = await onboardingService.completeOnboarding(userId);
    if (!result.success) {
      return res.status(422).json({
        ok: false,
        error: result.error,
        blockedReason: result.blockedReason,
      });
    }

    res.json({
      ok: true,
      message: 'Onboarding completed',
      onboarding: result.progress ? {
        onboardingId: result.progress.onboardingId,
        status: result.progress.status,
        completedAt: result.progress.completedAt,
        tenantId: result.progress.tenantId,
        businessId: result.progress.businessId,
      } : null,
    });
  } catch (err) {
    log.error('Complete onboarding failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to complete onboarding' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   Wave 4: Payment Session Endpoints
   ══════════════════════════════════════════════════════════════════ */

/** POST /payment-session — start paid-plan checkout */
router.post('/payment-session', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'Authentication required' });

    const { paymentProvider, successUrl, cancelUrl } = req.body || {};
    if (!paymentProvider) return res.status(400).json({ ok: false, error: 'paymentProvider is required' });

    const result = await onboardingService.startPaidPlanCheckout(userId, { paymentProvider, successUrl, cancelUrl });
    if (!result.success) return res.status(422).json({ ok: false, error: result.error });

    res.status(201).json({ ok: true, paymentSession: result.paymentSession });
  } catch (err) {
    log.error('Create payment session failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to create payment session' });
  }
});

/** GET /payment-status — get latest payment session + subscription status */
router.get('/payment-status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'Authentication required' });

    const result = await onboardingService.getPaymentStatus(userId);
    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('Get payment status failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get payment status' });
  }
});

/** POST /payment-success — mark payment as succeeded (internal callback) */
router.post('/payment-success', async (req: Request, res: Response) => {
  try {
    const { paymentSessionId, externalPaymentIntentId, externalSubscriptionId } = req.body || {};
    if (!paymentSessionId) return res.status(400).json({ ok: false, error: 'paymentSessionId is required' });

    const result = await onboardingService.markPaymentSucceeded({ paymentSessionId, externalPaymentIntentId, externalSubscriptionId });
    if (!result.success) return res.status(400).json({ ok: false, error: result.error });

    res.json({ ok: true, message: 'Payment confirmed and plan activated' });
  } catch (err) {
    log.error('Payment success handler failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to process payment success' });
  }
});

/** POST /payment-failed — mark payment as failed (internal callback) */
router.post('/payment-failed', async (req: Request, res: Response) => {
  try {
    const { paymentSessionId, failureReason } = req.body || {};
    if (!paymentSessionId) return res.status(400).json({ ok: false, error: 'paymentSessionId is required' });

    const result = await onboardingService.markPaymentFailed({ paymentSessionId, failureReason });
    if (!result.success) return res.status(400).json({ ok: false, error: result.error });

    res.json({ ok: true, message: 'Payment failure recorded' });
  } catch (err) {
    log.error('Payment failed handler failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to process payment failure' });
  }
});

export default router;
