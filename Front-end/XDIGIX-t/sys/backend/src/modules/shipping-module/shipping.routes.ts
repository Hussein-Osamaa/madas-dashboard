/**
 * Shipping API routes.
 *
 * Authenticated routes require JWT and tenant context.
 * Public tracking route requires tenantId in the URL.
 */

import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { shippingService } from './shipping.service';
import { ShipmentStatus } from './shipment.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('shipping-routes');
const router = Router();

/* ══════════════════════════════════════════════════════════════════
   Public routes (no auth)
   ══════════════════════════════════════════════════════════════════ */

/* ── GET /public/:tenantId/tracking/:trackingNumber ─────────────── */
router.get('/public/:tenantId/tracking/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const { tenantId, trackingNumber } = req.params;
    const result = await shippingService.getPublicTracking(tenantId, trackingNumber);

    if (!result.shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    // Return limited public-facing data
    res.json({
      trackingNumber: result.shipment.trackingNumber,
      status: result.shipment.status,
      type: result.shipment.type,
      shippingAddress: {
        city: result.shipment.shippingAddress.city,
        country: result.shipment.shippingAddress.country,
      },
      pickedUpAt: result.shipment.pickedUpAt,
      deliveredAt: result.shipment.deliveredAt,
      events: result.events,
    });
  } catch (err) {
    log.error('Failed to get public tracking', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   Authenticated routes
   ══════════════════════════════════════════════════════════════════ */

// All routes below require authentication
router.use(jwtMiddleware);

/* ── GET /shipments ─────────────────────────────────────────────── */
router.get('/shipments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const { shipments, total } = await shippingService.listShipments(tenantId, {
      status: req.query.status as ShipmentStatus | undefined,
      type: req.query.type as 'outbound' | 'return' | undefined,
      carrierId: req.query.carrierId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    res.json({ shipments, total });
  } catch (err) {
    log.error('Failed to list shipments', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list shipments' });
  }
});

/* ── GET /shipments/:id ─────────────────────────────────────────── */
router.get('/shipments/:id', async (req: Request, res: Response) => {
  try {
    const shipment = await shippingService.getShipment(req.params.id);
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    // Tenant scope check
    if (shipment.tenantId !== req.user?.tenantId) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    res.json({ shipment });
  } catch (err) {
    log.error('Failed to get shipment', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to get shipment' });
  }
});

/* ── POST /shipments/:id/label ──────────────────────────────────── */
router.post('/shipments/:id/label', async (req: Request, res: Response) => {
  try {
    const shipment = await shippingService.generateLabel(
      req.params.id,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ shipment });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid shipment transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to generate label', { error: message });
      res.status(500).json({ error: 'Failed to generate label' });
    }
  }
});

/* ── POST /shipments/:id/book ───────────────────────────────────── */
router.post('/shipments/:id/book', async (req: Request, res: Response) => {
  try {
    const shipment = await shippingService.bookCarrier(
      req.params.id,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ shipment });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid shipment transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to book carrier', { error: message });
      res.status(500).json({ error: 'Failed to book carrier' });
    }
  }
});

/* ── POST /admin/:id/manual-tracking ────────────────────────────── */
router.post('/admin/:id/manual-tracking', async (req: Request, res: Response) => {
  try {
    const actor = req.user?.uid;
    if (!actor) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status required' });
      return;
    }

    const shipment = await shippingService.manualTracking(
      req.params.id,
      status as ShipmentStatus,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ shipment });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid shipment transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed manual tracking update', { error: message });
      res.status(500).json({ error: 'Failed to update tracking' });
    }
  }
});

/* ── POST /admin/:id/override-carrier ───────────────────────────── */
router.post('/admin/:id/override-carrier', async (req: Request, res: Response) => {
  try {
    const actor = req.user?.uid;
    if (!actor) {
      res.status(400).json({ error: 'Staff context required' });
      return;
    }

    const { carrierId } = req.body;
    if (!carrierId) {
      res.status(400).json({ error: 'carrierId required' });
      return;
    }

    const shipment = await shippingService.overrideCarrier(
      req.params.id,
      carrierId,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ shipment });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Cannot override carrier')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to override carrier', { error: message });
      res.status(500).json({ error: 'Failed to override carrier' });
    }
  }
});

/* ── POST /admin/:id/cancel ─────────────────────────────────────── */
router.post('/admin/:id/cancel', async (req: Request, res: Response) => {
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

    const shipment = await shippingService.cancelShipment(
      req.params.id,
      reason,
      actor,
      req.headers['x-correlation-id'] as string,
    );
    res.json({ shipment });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Invalid shipment transition')) {
      res.status(409).json({ error: message });
    } else {
      log.error('Failed to cancel shipment', { error: message });
      res.status(500).json({ error: 'Failed to cancel shipment' });
    }
  }
});

export default router;
