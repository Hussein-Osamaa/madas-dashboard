import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { createLogger } from '../../lib/logger';

const router = Router();
const log = createLogger('company-admin:routes');

// ---------------------------------------------------------------------------
// Middleware: require admin or super_admin role
// ---------------------------------------------------------------------------

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.type !== 'super_admin' && user.type !== 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

router.use(requireAdmin);

// ---------------------------------------------------------------------------
// Overview Views (read-only aggregations)
// ---------------------------------------------------------------------------

router.get('/overview/tenants', async (_req: Request, res: Response) => {
  try {
    res.json(await adminService.getTenantOverview());
  } catch (err) {
    log.error('getTenantOverview failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/overview/orders', async (req: Request, res: Response) => {
  try {
    const { tenantId, from, to } = req.query as Record<string, string>;
    res.json(
      await adminService.getOrderPipeline({
        tenantId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      }),
    );
  } catch (err) {
    log.error('getOrderPipeline failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/overview/fulfillment', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query as Record<string, string>;
    res.json(await adminService.getFulfillmentMonitor({ tenantId }));
  } catch (err) {
    log.error('getFulfillmentMonitor failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/overview/shipping', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query as Record<string, string>;
    res.json(await adminService.getShippingTracker({ tenantId }));
  } catch (err) {
    log.error('getShippingTracker failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/overview/revenue', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query as Record<string, string>;
    res.json(await adminService.getRevenueOverview({ tenantId }));
  } catch (err) {
    log.error('getRevenueOverview failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------

router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { tenantId, module, action, from, to, limit } = req.query as Record<
      string,
      string
    >;
    res.json(
      await adminService.getAuditTrail({
        tenantId,
        module,
        action,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      }),
    );
  } catch (err) {
    log.error('getAuditTrail failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------

router.get('/feature-flags/:tenantId', async (req: Request, res: Response) => {
  try {
    res.json(await adminService.getFeatureFlags(req.params.tenantId));
  } catch (err) {
    log.error('getFeatureFlags failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/feature-flags/:tenantId', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.setFeatureFlag(
      req.params.tenantId,
      req.body.flagName,
      req.body.enabled,
      actor,
    );
    res.json({ success: true });
  } catch (err) {
    log.error('setFeatureFlag failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

router.get('/health', async (_req: Request, res: Response) => {
  try {
    res.json(await adminService.getSystemHealth());
  } catch (err) {
    log.error('getSystemHealth failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Admin Preferences
// ---------------------------------------------------------------------------

router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.uid || '';
    res.json(await adminService.getPreferences(adminUserId));
  } catch (err) {
    log.error('getPreferences failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.uid || '';
    res.json(await adminService.updatePreferences(adminUserId, req.body));
  } catch (err) {
    log.error('updatePreferences failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Control Actions (writes through module services)
// ---------------------------------------------------------------------------

router.post('/tenants/:id/suspend', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.suspendTenant(
      req.params.id,
      req.body.reason || 'Admin action',
      actor,
    );
    log.info('Tenant suspended by admin', { tenantId: req.params.id, actor });
    res.json({ success: true });
  } catch (err) {
    log.error('suspendTenant failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/tenants/:id/activate', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.activateTenant(req.params.id, actor);
    log.info('Tenant activated by admin', { tenantId: req.params.id, actor });
    res.json({ success: true });
  } catch (err) {
    log.error('activateTenant failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/tenants/:id/change-plan', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.changePlan(req.params.id, req.body.planId, actor);
    log.info('Tenant plan changed by admin', {
      tenantId: req.params.id,
      planId: req.body.planId,
      actor,
    });
    res.json({ success: true });
  } catch (err) {
    log.error('changePlan failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/tenants/:id/grace', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    const { planId, graceDays, reason, category } = req.body;
    await adminService.activateWithGrace(
      req.params.id,
      planId,
      graceDays,
      reason,
      category,
      actor,
    );
    log.info('Tenant grace activated by admin', {
      tenantId: req.params.id,
      actor,
    });
    res.json({ success: true });
  } catch (err) {
    log.error('activateWithGrace failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/sites/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.unpublishSite(
      req.params.id,
      req.body.reason || 'Admin action',
      actor,
    );
    log.info('Site unpublished by admin', { siteId: req.params.id, actor });
    res.json({ success: true });
  } catch (err) {
    log.error('unpublishSite failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.uid || 'admin';
    await adminService.cancelOrder(
      req.params.id,
      req.body.reason || 'Admin cancellation',
      actor,
    );
    log.info('Order cancelled by admin', { orderId: req.params.id, actor });
    res.json({ success: true });
  } catch (err) {
    log.error('cancelOrder failed', { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post(
  '/fulfillment/:id/escalate',
  async (req: Request, res: Response) => {
    try {
      const actor = (req as any).user?.uid || 'admin';
      await adminService.escalateFulfillment(
        req.params.id,
        req.body.priority || 'urgent',
        req.body.reason || '',
        actor,
      );
      log.info('Fulfillment escalated by admin', {
        jobId: req.params.id,
        actor,
      });
      res.json({ success: true });
    } catch (err) {
      log.error('escalateFulfillment failed', {
        error: (err as Error).message,
      });
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

router.post(
  '/shipping/:id/manual-tracking',
  async (req: Request, res: Response) => {
    try {
      const actor = (req as any).user?.uid || 'admin';
      await adminService.manualShipmentTracking(
        req.params.id,
        req.body.status,
        actor,
      );
      log.info('Shipment tracking updated by admin', {
        shipmentId: req.params.id,
        actor,
      });
      res.json({ success: true });
    } catch (err) {
      log.error('manualShipmentTracking failed', {
        error: (err as Error).message,
      });
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

export default router;
