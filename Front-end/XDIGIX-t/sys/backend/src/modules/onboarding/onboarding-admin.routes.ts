/**
 * Onboarding admin routes — Wave 5.
 *
 * All routes require admin JWT. Mounted at /api/admin/onboarding.
 */
import { Router, Request, Response } from 'express';
import { onboardingService } from './onboarding.service';
import { OnboardingProgress } from './onboarding-progress.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-admin');
const router = Router();

function getAdminUserId(req: Request): string | undefined {
  const payload = (req as Record<string, unknown>).accountPayload as Record<string, unknown> | undefined;
  return payload?.userId as string || (req as Record<string, unknown>).userId as string;
}

/** POST /provision — admin creates a fully provisioned merchant */
router.post('/provision', async (req: Request, res: Response) => {
  try {
    const adminUserId = getAdminUserId(req);
    if (!adminUserId) return res.status(401).json({ ok: false, error: 'Admin authentication required' });

    const { email, displayName, businessName, planId, planActivation, currency, graceDays, graceReason } = req.body || {};
    if (!email || !businessName || !planId) {
      return res.status(400).json({ ok: false, error: 'email, businessName, and planId are required' });
    }

    const result = await onboardingService.adminProvision({
      email, displayName, businessName, planId,
      planActivation: planActivation || 'default',
      currency, graceDays, graceReason, adminUserId,
    });

    if (!result.success) return res.status(422).json({ ok: false, error: result.error });

    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    log.error('Admin provision failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to provision merchant' });
  }
});

/** POST /:id/activate-trial — admin triggers trial for an onboarding */
router.post('/:id/activate-trial', async (req: Request, res: Response) => {
  try {
    const record = await OnboardingProgress.findOne({ onboardingId: req.params.id }).lean();
    if (!record) return res.status(404).json({ ok: false, error: 'Onboarding not found' });

    const result = await onboardingService.activateTrial((record as Record<string, unknown>).userId as string);
    if (!result.success) return res.status(422).json({ ok: false, error: result.error });

    res.json({ ok: true, trialEndsAt: result.trialEndsAt });
  } catch (err) {
    log.error('Admin activate trial failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to activate trial' });
  }
});

/** POST /:id/activate-grace — admin grants grace period */
router.post('/:id/activate-grace', async (req: Request, res: Response) => {
  try {
    const adminUserId = getAdminUserId(req);
    if (!adminUserId) return res.status(401).json({ ok: false, error: 'Admin authentication required' });

    const { planId, graceDays, reason } = req.body || {};
    if (!planId || !graceDays || !reason) {
      return res.status(400).json({ ok: false, error: 'planId, graceDays, and reason are required' });
    }

    const result = await onboardingService.activateGraceByAdmin({
      onboardingId: req.params.id, planId, graceDays: Number(graceDays), reason, adminUserId,
    });

    if (!result.success) return res.status(422).json({ ok: false, error: result.error });
    res.json({ ok: true, graceExpiresAt: result.graceExpiresAt });
  } catch (err) {
    log.error('Admin activate grace failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to activate grace' });
  }
});

/** POST /:id/reopen — admin reopens abandoned/suspended onboarding */
router.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    const adminUserId = getAdminUserId(req);
    if (!adminUserId) return res.status(401).json({ ok: false, error: 'Admin authentication required' });

    const result = await onboardingService.adminReopen(req.params.id, adminUserId);
    if (!result.success) return res.status(422).json({ ok: false, error: result.error });
    res.json({ ok: true, message: 'Onboarding reopened' });
  } catch (err) {
    log.error('Admin reopen failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to reopen onboarding' });
  }
});

/** GET / — list all onboarding records (with filters) */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query: Record<string, unknown> = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.planIntent) query.planIntent = req.query.planIntent;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);

    const [records, total] = await Promise.all([
      OnboardingProgress.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OnboardingProgress.countDocuments(query),
    ]);

    res.json({ ok: true, onboardings: records, total, page, limit });
  } catch (err) {
    log.error('Admin list onboardings failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list onboardings' });
  }
});

/** GET /:id — get specific onboarding details */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await OnboardingProgress.findOne({ onboardingId: req.params.id }).lean();
    if (!record) return res.status(404).json({ ok: false, error: 'Onboarding not found' });
    res.json({ ok: true, onboarding: record });
  } catch (err) {
    log.error('Admin get onboarding failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get onboarding' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   Wave 6: Reporting / Funnel Visibility
   ══════════════════════════════════════════════════════════════════ */

/** GET /funnel — onboarding funnel summary */
router.get('/funnel', async (_req: Request, res: Response) => {
  try {
    const { onboardingReporting } = await import('./onboarding-reporting');
    const [summary, byPlan] = await Promise.all([
      onboardingReporting.funnelSummary(),
      onboardingReporting.funnelByPlan(),
    ]);
    res.json({ ok: true, funnel: summary, byPlan });
  } catch (err) {
    log.error('Funnel summary failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get funnel' });
  }
});

/** GET /metrics — persistent + live metrics */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const { onboardingReporting } = await import('./onboarding-reporting');
    const combined = await onboardingReporting.combinedMetrics();
    res.json({ ok: true, ...combined });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to get metrics' });
  }
});

/** GET /abandoned — list abandoned onboardings */
router.get('/abandoned', async (req: Request, res: Response) => {
  try {
    const { onboardingReporting } = await import('./onboarding-reporting');
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const list = await onboardingReporting.abandonedList(limit);
    res.json({ ok: true, abandoned: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to list abandoned' });
  }
});

/** GET /payment-pending — list payment-pending onboardings */
router.get('/payment-pending', async (req: Request, res: Response) => {
  try {
    const { onboardingReporting } = await import('./onboarding-reporting');
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const list = await onboardingReporting.paymentPendingList(limit);
    res.json({ ok: true, paymentPending: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to list payment-pending' });
  }
});

/** GET /trials — list active trial onboardings */
router.get('/trials', async (req: Request, res: Response) => {
  try {
    const { onboardingReporting } = await import('./onboarding-reporting');
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const list = await onboardingReporting.trialActiveList(limit);
    res.json({ ok: true, trials: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to list trials' });
  }
});

export default router;
