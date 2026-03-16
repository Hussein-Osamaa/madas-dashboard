/**
 * Shipment CRUD + status transitions + timeline
 * Merchant API + Admin API
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { Shipment } from '../../schemas/shipping/shipment.schema';
import { ShipmentEvent } from '../../schemas/shipping/shipment-event.schema';
import { DeliveryAttempt } from '../../schemas/shipping/delivery-attempt.schema';
import { Courier } from '../../schemas/shipping/courier.schema';
import { calculateShippingPrice } from '../../modules/shipping/services/pricing-engine.service';
import { generateTrackingNumber } from '../../modules/shipping/services/tracking-number.service';
import { autoAssignCourier } from '../../modules/shipping/services/courier-assignment.service';
import * as WalletService from '../../modules/shipping/services/wallet.service';
import { notifyShipmentStatusChange } from '../../modules/shipping/services/notification.service';

const router = Router();
const validate = (req: Request, res: Response, next: import('express').NextFunction) => {
  const { validationResult } = require('express-validator');
  const errs = validationResult(req);
  if (!errs.isEmpty()) { res.status(400).json({ error: errs.array()[0]?.msg }); return; }
  next();
};

// ── List shipments ─────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.merchantId) filter.merchantId = req.query.merchantId;
    if (req.query.courierId)  filter.courierId  = req.query.courierId;
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.zoneId)     filter.zoneId     = req.query.zoneId;

    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 50))));
    const skip  = (page - 1) * limit;

    // date range
    if (req.query.from || req.query.to) {
      const range: Record<string, Date> = {};
      if (req.query.from) range.$gte = new Date(req.query.from as string);
      if (req.query.to)   range.$lte = new Date(req.query.to as string);
      filter.createdAt = range;
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Shipment.countDocuments(filter),
    ]);

    res.json({ shipments, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ── Get single shipment ────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const shipment = await Shipment.findById(req.params.id).lean();
    if (!shipment) { res.status(404).json({ error: 'Shipment not found' }); return; }
    const events = await ShipmentEvent.find({ shipmentId: req.params.id }).sort({ timestamp: 1 }).lean();
    const attempts = await DeliveryAttempt.find({ shipmentId: req.params.id }).sort({ attemptNumber: 1 }).lean();
    res.json({ shipment, events, attempts });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ── Create shipment ────────────────────────────────────────────────────────────
router.post('/',
  [
    body('merchantId').isString().notEmpty(),
    body('recipientName').isString().notEmpty(),
    body('recipientPhone').isString().notEmpty(),
    body('recipientAddress').isString().notEmpty(),
    body('weight').isNumeric(),
    body('codAmount').optional().isNumeric(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const {
        merchantId, recipientName, recipientPhone, recipientPhone2,
        recipientAddress, recipientCityId, recipientZoneId,
        weight, length, width, height,
        slaId, zoneId, cityId, codAmount = 0,
        shipmentType = 'deliver', packageCount = 1,
        description, notes, merchantNotes, specialInstructions,
        declaredValue, includePackaging = false,
      } = req.body;

      // Calculate price
      const pricing = await calculateShippingPrice({
        actualWeight: weight,
        length, width, height,
        zoneId: zoneId ?? recipientZoneId,
        slaId,
        codAmount,
        includePackaging,
        declaredValue,
      });

      const trackingNumber = await generateTrackingNumber();

      const shipment = await Shipment.create({
        trackingNumber,
        merchantId,
        zoneId: zoneId ?? recipientZoneId,
        cityId: cityId ?? recipientCityId,
        countryCode: 'EG',
        weight,
        length, width, height,
        volumetricWeight: pricing.volumetricWeight,
        chargeableWeight: pricing.chargeableWeight,
        packageCount,
        recipientName, recipientPhone, recipientPhone2,
        recipientAddress, recipientCityId, recipientZoneId,
        slaId,
        shipmentType,
        codAmount,
        shippingFee: pricing.total - pricing.codFee,
        codFee: pricing.codFee,
        totalFee: pricing.total,
        merchantReceives: pricing.merchantReceives,
        currency: pricing.currency,
        description, notes, merchantNotes, specialInstructions,
      });

      // Record creation event
      await ShipmentEvent.create({
        shipmentId: shipment._id.toString(),
        trackingNumber,
        eventType: 'ORDER_CREATED',
        description: `Order created by merchant`,
        performedBy: merchantId,
        performedByRole: 'merchant',
        timestamp: new Date(),
      });

      // Debit shipping fee from merchant wallet (fire-and-forget; non-blocking)
      if (pricing.total > 0) {
        WalletService.debitShipmentFee(merchantId, pricing.total, shipment._id.toString())
          .catch(() => {/* non-critical */});
      }

      res.status(201).json({ shipment, pricing });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// ── Bulk create ────────────────────────────────────────────────────────────────
router.post('/bulk', async (req: Request, res: Response) => {
  const orders = req.body.orders as unknown[];
  if (!Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ error: 'orders array required' }); return;
  }
  const results: unknown[] = [];
  for (const order of orders) {
    try {
      const pricing = await calculateShippingPrice({
        actualWeight: (order as Record<string, number>).weight ?? 1,
        zoneId: (order as Record<string, string>).zoneId,
        slaId:  (order as Record<string, string>).slaId,
        codAmount: (order as Record<string, number>).codAmount ?? 0,
      });
      const trackingNumber = await generateTrackingNumber();
      const shipment = await Shipment.create({
        ...(order as Record<string, unknown>),
        trackingNumber,
        countryCode: 'EG',
        volumetricWeight: pricing.volumetricWeight,
        chargeableWeight: pricing.chargeableWeight,
        shippingFee: pricing.total - pricing.codFee,
        codFee: pricing.codFee,
        totalFee: pricing.total,
        merchantReceives: pricing.merchantReceives,
        currency: pricing.currency,
      });
      await ShipmentEvent.create({
        shipmentId: shipment._id.toString(),
        trackingNumber,
        eventType: 'ORDER_CREATED',
        description: 'Order created (bulk)',
        performedBy: (order as Record<string, string>).merchantId,
        performedByRole: 'merchant',
        timestamp: new Date(),
      });
      results.push({ success: true, trackingNumber, id: shipment._id });
    } catch (err) {
      results.push({ success: false, error: (err as Error).message, order });
    }
  }
  res.json({ results });
});

// ── Update status ──────────────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:              ['pickup_scheduled', 'cancelled'],
  pickup_scheduled:     ['picked_up', 'cancelled'],
  picked_up:            ['in_warehouse'],
  in_warehouse:         ['sorted', 'return_initiated'],
  sorted:               ['assigned_to_courier'],
  assigned_to_courier:  ['out_for_delivery'],
  out_for_delivery:     ['delivered', 'failed'],
  failed:               ['out_for_delivery', 'return_initiated'],
  return_initiated:     ['returned'],
  returned:             [],
  delivered:            [],
  cancelled:            [],
};

router.patch('/:id/status',
  [body('status').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) { res.status(404).json({ error: 'Not found' }); return; }

      const newStatus = req.body.status;
      const allowed = STATUS_TRANSITIONS[shipment.status] ?? [];
      if (!allowed.includes(newStatus)) {
        res.status(400).json({ error: `Cannot transition from ${shipment.status} → ${newStatus}` }); return;
      }

      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'picked_up')   updates.pickedUpAt  = new Date();
      if (newStatus === 'delivered')   updates.deliveredAt = new Date();
      if (newStatus === 'returned')    updates.returnedAt  = new Date();

      Object.assign(shipment, updates);
      await shipment.save();

      // Auto-assign courier when sorted
      if (newStatus === 'sorted' || newStatus === 'assigned_to_courier') {
        autoAssignCourier({
          shipmentId: shipment._id.toString(),
          zoneId: shipment.zoneId,
          chargeableWeight: shipment.chargeableWeight ?? shipment.weight,
          recipientLat: shipment.recipientLat,
          recipientLng: shipment.recipientLng,
        }).catch(() => {/* non-critical */});
      }

      const eventMap: Record<string, string> = {
        pickup_scheduled: 'PICKUP_SCHEDULED',
        picked_up:        'PICKED_UP',
        in_warehouse:     'IN_WAREHOUSE',
        sorted:           'SORTED',
        assigned_to_courier: 'ASSIGNED_TO_COURIER',
        out_for_delivery: 'OUT_FOR_DELIVERY',
        delivered:        'DELIVERED',
        failed:           'FAILED',
        return_initiated: 'RETURN_INITIATED',
        returned:         'RETURNED',
        cancelled:        'CANCELLED',
      };

      await ShipmentEvent.create({
        shipmentId: shipment._id.toString(),
        trackingNumber: shipment.trackingNumber,
        eventType: eventMap[newStatus] ?? 'NOTE_ADDED',
        description: req.body.description ?? `Status updated to ${newStatus}`,
        location: req.body.location,
        performedBy: req.body.performedBy,
        performedByRole: req.body.performedByRole ?? 'admin',
        timestamp: new Date(),
      });

      // Email notification (fire-and-forget)
      notifyShipmentStatusChange({
        trackingNumber: shipment.trackingNumber,
        newStatus,
        recipientName:  shipment.recipientName,
        recipientEmail: (shipment as Record<string, unknown>).recipientEmail as string | undefined,
      }).catch(() => {/* non-critical */});

      // Wallet hooks (fire-and-forget)
      if (newStatus === 'out_for_delivery' && shipment.codAmount > 0) {
        WalletService.holdCODPending(shipment.merchantId, shipment.codAmount, shipment._id.toString())
          .catch(() => {/* non-critical */});
      }
      if (newStatus === 'delivered' && shipment.codAmount > 0) {
        WalletService.creditCODDelivery(
          shipment.merchantId, shipment.merchantReceives ?? 0,
          shipment.codAmount, shipment._id.toString()
        ).catch(() => {/* non-critical */});
      }
      if ((newStatus === 'returned' || newStatus === 'cancelled') && shipment.codAmount > 0) {
        WalletService.releasePendingCOD(shipment.merchantId, shipment.codAmount, shipment._id.toString())
          .catch(() => {/* non-critical */});
      }

      res.json({ shipment, success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// ── Record delivery attempt ────────────────────────────────────────────────────
router.post('/:id/attempts',
  [body('courierId').isString().notEmpty(), body('result').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) { res.status(404).json({ error: 'Not found' }); return; }

      const attemptNum = shipment.deliveryAttempts + 1;
      const attempt = await DeliveryAttempt.create({
        shipmentId: shipment._id.toString(),
        trackingNumber: shipment.trackingNumber,
        courierId: req.body.courierId,
        attemptNumber: attemptNum,
        result: req.body.result,
        notes: req.body.notes,
        photoUrl: req.body.photoUrl,
        recipientLat: req.body.lat,
        recipientLng: req.body.lng,
        timestamp: new Date(),
      });

      shipment.deliveryAttempts = attemptNum;

      if (req.body.result === 'delivered') {
        shipment.status = 'delivered';
        shipment.deliveredAt = new Date();
        // Update courier stats
        await Courier.findByIdAndUpdate(req.body.courierId, {
          $inc: { activeOrders: -1, totalDeliveries: 1 },
        });
        // Credit COD to merchant wallet
        if (shipment.codAmount > 0) {
          WalletService.creditCODDelivery(
            shipment.merchantId, shipment.merchantReceives ?? 0,
            shipment.codAmount, shipment._id.toString()
          ).catch(() => {/* non-critical */});
        }
        // Delivery notification
        notifyShipmentStatusChange({
          trackingNumber: shipment.trackingNumber,
          newStatus: 'delivered',
          recipientName: shipment.recipientName,
          recipientEmail: (shipment as Record<string, unknown>).recipientEmail as string | undefined,
        }).catch(() => {/* non-critical */});
      } else if (attemptNum >= shipment.maxAttempts) {
        shipment.status = 'return_initiated';
        await Courier.findByIdAndUpdate(req.body.courierId, { $inc: { activeOrders: -1 } });
      }

      await shipment.save();

      await ShipmentEvent.create({
        shipmentId: shipment._id.toString(),
        trackingNumber: shipment.trackingNumber,
        eventType: req.body.result === 'delivered' ? 'DELIVERED' : 'DELIVERY_ATTEMPT',
        description: `Delivery attempt #${attemptNum}: ${req.body.result}`,
        performedBy: req.body.courierId,
        performedByRole: 'courier',
        metadata: { attemptNumber: attemptNum, result: req.body.result },
        timestamp: new Date(),
      });

      res.status(201).json({ attempt, shipment });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// ── Cancel shipment ────────────────────────────────────────────────────────────
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) { res.status(404).json({ error: 'Not found' }); return; }
    if (['delivered','returned','cancelled'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot cancel a ${shipment.status} shipment` }); return;
    }
    shipment.status = 'cancelled';
    await shipment.save();

    if (shipment.courierId) {
      await Courier.findByIdAndUpdate(shipment.courierId, { $inc: { activeOrders: -1 } });
    }

    await ShipmentEvent.create({
      shipmentId: shipment._id.toString(),
      trackingNumber: shipment.trackingNumber,
      eventType: 'CANCELLED',
      description: req.body.reason ?? 'Shipment cancelled',
      performedBy: req.body.performedBy,
      performedByRole: req.body.role ?? 'admin',
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ── Public tracking (no auth) ──────────────────────────────────────────────────
router.get('/track/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const shipment = await Shipment.findOne({ trackingNumber: req.params.trackingNumber })
      .select('-merchantId -courierId -totalFee -shippingFee -codFee -merchantReceives')
      .lean();
    if (!shipment) { res.status(404).json({ error: 'Tracking number not found' }); return; }

    const events = await ShipmentEvent
      .find({ trackingNumber: req.params.trackingNumber })
      .sort({ timestamp: 1 })
      .select('-performedBy -metadata')
      .lean();

    res.json({ shipment, events });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
