/**
 * Fulfillment API routes.
 *
 * All routes require JWT authentication and tenant context.
 * Fulfillment data is tenant-scoped.
 */

import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { fulfillmentService } from './fulfillment.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('fulfillment-routes');
const router = Router();

// All fulfillment routes require authentication
router.use(jwtMiddleware);

/* ── GET /jobs ───────────────────────────────────────────────── */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const { jobs, total } = await fulfillmentService.listJobs(tenantId, {
      status: req.query.status as any,
      assignedTo: req.query.assignedTo as string | undefined,
      priority: req.query.priority as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    res.json({ jobs, total });
  } catch (err) {
    log.error('Failed to list fulfillment jobs', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list fulfillment jobs' });
  }
});

/* ── GET /jobs/:id ───────────────────────────────────────────── */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await fulfillmentService.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Fulfillment job not found' });
      return;
    }

    // Tenant scope check
    if (job.tenantId !== req.user?.tenantId) {
      res.status(404).json({ error: 'Fulfillment job not found' });
      return;
    }

    res.json({ job });
  } catch (err) {
    log.error('Failed to get fulfillment job', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to get fulfillment job' });
  }
});

/* ── PATCH /jobs/:id/pick-start ──────────────────────────────── */
router.patch('/jobs/:id/pick-start', async (req: Request, res: Response) => {
  try {
    const staffId = req.user?.uid;
    if (!staffId) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const job = await fulfillmentService.startPicking(req.params.id, staffId, req.headers['x-correlation-id'] as string);
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid fulfillment job transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to start picking', { error: message });
      res.status(500).json({ error: 'Failed to start picking' });
    }
  }
});

/* ── PATCH /jobs/:id/pick-complete ───────────────────────────── */
router.patch('/jobs/:id/pick-complete', async (req: Request, res: Response) => {
  try {
    const { pickedItems } = req.body;
    if (!Array.isArray(pickedItems)) {
      res.status(400).json({ error: 'pickedItems array required' });
      return;
    }

    const job = await fulfillmentService.completePick(
      req.params.id,
      pickedItems,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Cannot complete pick')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to complete pick', { error: message });
      res.status(500).json({ error: 'Failed to complete pick' });
    }
  }
});

/* ── PATCH /jobs/:id/pack-start ──────────────────────────────── */
router.patch('/jobs/:id/pack-start', async (req: Request, res: Response) => {
  try {
    const job = await fulfillmentService.startPacking(
      req.params.id,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid fulfillment job transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to start packing', { error: message });
      res.status(500).json({ error: 'Failed to start packing' });
    }
  }
});

/* ── PATCH /jobs/:id/pack-complete ───────────────────────────── */
router.patch('/jobs/:id/pack-complete', async (req: Request, res: Response) => {
  try {
    const { packageDetails } = req.body;
    const job = await fulfillmentService.completePack(
      req.params.id,
      packageDetails,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid fulfillment job transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to complete pack', { error: message });
      res.status(500).json({ error: 'Failed to complete pack' });
    }
  }
});

/* ── PATCH /jobs/:id/hand-to-shipping ────────────────────────── */
router.patch('/jobs/:id/hand-to-shipping', async (req: Request, res: Response) => {
  try {
    const job = await fulfillmentService.handToShipping(
      req.params.id,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid fulfillment job transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to hand to shipping', { error: message });
      res.status(500).json({ error: 'Failed to hand to shipping' });
    }
  }
});

/* ── PATCH /jobs/:id/cancel ──────────────────────────────────── */
router.patch('/jobs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: 'reason required' });
      return;
    }

    const actor = req.user?.uid || 'unknown';
    const job = await fulfillmentService.cancelJob(
      req.params.id,
      reason,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid fulfillment job transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to cancel job', { error: message });
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  }
});

/* ── POST /returns/:returnId/receive ─────────────────────────── */
router.post('/returns/:returnId/receive', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const staffId = req.user?.uid;
    if (!tenantId || !staffId) {
      res.status(400).json({ error: 'Tenant and staff context required' });
      return;
    }

    const { businessId, items } = req.body;
    if (!businessId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'businessId and non-empty items array required' });
      return;
    }

    const receivingLog = await fulfillmentService.receiveReturn(
      tenantId,
      businessId,
      req.params.returnId,
      items,
      staffId,
      req.headers['x-correlation-id'] as string,
    );

    res.status(201).json({ receivingLog });
  } catch (err) {
    log.error('Failed to receive return', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to receive return' });
  }
});

/* ── PATCH /returns/:returnId/items/:lineItemIndex/inspect ──── */
router.patch('/returns/:returnId/items/:lineItemIndex/inspect', async (req: Request, res: Response) => {
  try {
    const actor = req.user?.uid;
    if (!actor) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const { condition } = req.body;
    if (!condition || !['good', 'damaged', 'missing'].includes(condition)) {
      res.status(400).json({ error: 'condition must be one of: good, damaged, missing' });
      return;
    }

    await fulfillmentService.inspectReturnItem(
      req.params.returnId,
      parseInt(req.params.lineItemIndex, 10),
      condition,
      actor,
      req.headers['x-correlation-id'] as string,
    );

    res.json({ ok: true });
  } catch (err) {
    log.error('Failed to inspect return item', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to inspect return item' });
  }
});

/* ── POST /admin/:id/escalate ────────────────────────────────── */
router.post('/admin/:id/escalate', async (req: Request, res: Response) => {
  try {
    const actor = req.user?.uid;
    if (!actor) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const { priority, reason } = req.body;
    if (!priority || !['normal', 'high', 'urgent'].includes(priority)) {
      res.status(400).json({ error: 'priority must be one of: normal, high, urgent' });
      return;
    }
    if (!reason) {
      res.status(400).json({ error: 'reason required' });
      return;
    }

    const job = await fulfillmentService.escalate(
      req.params.id,
      priority,
      reason,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      log.error('Failed to escalate job', { error: message });
      res.status(500).json({ error: 'Failed to escalate job' });
    }
  }
});

/* ── POST /admin/:id/force-complete ──────────────────────────── */
router.post('/admin/:id/force-complete', async (req: Request, res: Response) => {
  try {
    const actor = req.user?.uid;
    if (!actor) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: 'reason required' });
      return;
    }

    const job = await fulfillmentService.forceComplete(
      req.params.id,
      reason,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ job });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      log.error('Failed to force-complete job', { error: message });
      res.status(500).json({ error: 'Failed to force-complete job' });
    }
  }
});

export default router;
