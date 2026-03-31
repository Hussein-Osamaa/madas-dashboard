/**
 * Plan enforcement visibility routes.
 *
 * GET /api/business/plan-usage — merchant sees own usage vs limits
 * GET /api/admin/tenants/:tenantId/plan-usage — admin inspects any tenant
 */
import { Router, Request, Response } from 'express';
import { enforcementService, PlanLimitError } from './enforcement.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('enforcement-routes');

/* ── Merchant route ───────────────────────────────────────────────── */

export const merchantPlanRouter = Router();

merchantPlanRouter.get('/plan-usage', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as Record<string, unknown>).tenantId as string;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const caps = await enforcementService.getCapabilities(tenantId);
    if (!caps) {
      return res.status(404).json({ ok: false, error: 'Tenant or plan not found' });
    }

    res.json({
      ok: true,
      plan: caps.plan,
      planActivation: caps.planActivation,
      limits: caps.limits,
      usage: caps.usage,
      overLimit: caps.overLimit,
      features: caps.features,
    });
  } catch (err) {
    log.error('Plan usage query failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get plan usage' });
  }
});

/* ── Admin route ──────────────────────────────────────────────────── */

export const adminPlanRouter = Router();

adminPlanRouter.get('/tenants/:tenantId/plan-usage', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const caps = await enforcementService.getCapabilities(tenantId);
    if (!caps) {
      return res.status(404).json({ ok: false, error: 'Tenant or plan not found' });
    }

    res.json({
      ok: true,
      tenantId,
      status: caps.status,
      plan: caps.plan,
      planActivation: caps.planActivation,
      limits: caps.limits,
      usage: caps.usage,
      overLimit: caps.overLimit,
      features: caps.features,
    });
  } catch (err) {
    log.error('Admin plan usage query failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get plan usage' });
  }
});
