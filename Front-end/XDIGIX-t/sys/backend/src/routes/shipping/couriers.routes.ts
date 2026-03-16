/**
 * Courier management routes
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { Courier } from '../../schemas/shipping/courier.schema';

const router = Router();
const validate = (req: Request, res: Response, next: import('express').NextFunction) => {
  const { validationResult } = require('express-validator');
  const errs = validationResult(req);
  if (!errs.isEmpty()) { res.status(400).json({ error: errs.array()[0]?.msg }); return; }
  next();
};

// GET /couriers?status=available&type=company&zoneId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status)  filter.status = req.query.status;
    if (req.query.type)    filter.courierType = req.query.type;
    if (req.query.zoneId)  filter.assignedZoneIds = req.query.zoneId;
    if (req.query.active !== undefined) filter.isActive = req.query.active !== 'false';

    const couriers = await Courier.find(filter).sort({ name: 1 }).lean();
    res.json({ couriers, total: couriers.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /couriers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const courier = await Courier.findById(req.params.id).lean();
    if (!courier) { res.status(404).json({ error: 'Courier not found' }); return; }
    res.json({ courier });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /couriers
router.post('/',
  [
    body('name').isString().notEmpty(),
    body('phone').isString().notEmpty(),
    body('courierType').isIn(['company','freelancer']),
    body('vehicleType').isIn(['motorcycle','car','van','truck']),
    body('maxWeightCapacity').isNumeric().optional(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const courier = await Courier.create(req.body);
      res.status(201).json({ courier });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 11000) { res.status(409).json({ error: 'Phone number already registered' }); return; }
      res.status(500).json({ error: e.message });
    }
  });

// PATCH /couriers/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const courier = await Courier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!courier) { res.status(404).json({ error: 'Courier not found' }); return; }
    res.json({ courier });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// PATCH /couriers/:id/location  – mobile app updates GPS
router.patch('/:id/location',
  [body('lat').isNumeric(), body('lng').isNumeric()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.body;
      await Courier.findByIdAndUpdate(req.params.id, {
        currentLat: lat, currentLng: lng, lastLocationAt: new Date(),
        status: 'available',
      });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// DELETE /couriers/:id  (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Courier.findByIdAndUpdate(req.params.id, { isActive: false, status: 'suspended' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /couriers/:id/performance
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const courier = await Courier.findById(req.params.id).lean();
    if (!courier) { res.status(404).json({ error: 'Not found' }); return; }
    const { DeliveryAttempt } = await import('../../schemas/shipping/delivery-attempt.schema');
    const attempts = await DeliveryAttempt.find({ courierId: req.params.id }).lean();
    const delivered = attempts.filter(a => a.result === 'delivered').length;
    res.json({
      courierId: req.params.id,
      totalDeliveries: courier.totalDeliveries,
      successRate: courier.successRate,
      rating: courier.rating,
      activeOrders: courier.activeOrders,
      recentAttempts: attempts.slice(-20),
      deliveredCount: delivered,
    });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
