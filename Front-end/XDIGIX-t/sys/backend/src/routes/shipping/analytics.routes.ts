/**
 * Shipping analytics and reporting
 */
import { Router, Request, Response } from 'express';
import { Shipment } from '../../schemas/shipping/shipment.schema';
import { DeliveryAttempt } from '../../schemas/shipping/delivery-attempt.schema';
import { Courier } from '../../schemas/shipping/courier.schema';

const router = Router();

// GET /analytics/overview?from=&to=&merchantId=
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.merchantId) filter.merchantId = req.query.merchantId;
    if (req.query.from || req.query.to) {
      const range: Record<string, Date> = {};
      if (req.query.from) range.$gte = new Date(req.query.from as string);
      if (req.query.to)   range.$lte = new Date(req.query.to   as string);
      filter.createdAt = range;
    }

    const [
      totalOrders,
      deliveredOrders,
      failedOrders,
      returnedOrders,
      cancelledOrders,
      inTransit,
      codData,
    ] = await Promise.all([
      Shipment.countDocuments(filter),
      Shipment.countDocuments({ ...filter, status: 'delivered' }),
      Shipment.countDocuments({ ...filter, status: 'failed' }),
      Shipment.countDocuments({ ...filter, status: 'returned' }),
      Shipment.countDocuments({ ...filter, status: 'cancelled' }),
      Shipment.countDocuments({ ...filter, status: { $in: ['picked_up','in_warehouse','sorted','assigned_to_courier','out_for_delivery'] } }),
      Shipment.aggregate([
        { $match: { ...filter, status: 'delivered', codAmount: { $gt: 0 } } },
        { $group: { _id: null, totalCOD: { $sum: '$codAmount' }, totalCODFee: { $sum: '$codFee' }, totalShippingFee: { $sum: '$shippingFee' } } },
      ]),
    ]);

    const successRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    const codSummary = codData[0] ?? { totalCOD: 0, totalCODFee: 0, totalShippingFee: 0 };

    res.json({
      totalOrders,
      deliveredOrders,
      failedOrders,
      returnedOrders,
      cancelledOrders,
      inTransit,
      successRate,
      cashCollected: codSummary.totalCOD,
      totalCODFees:  codSummary.totalCODFee,
      totalRevenue:  codSummary.totalShippingFee + codSummary.totalCODFee,
    });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /analytics/delivery-reasons?from=&to=
router.get('/delivery-reasons', async (req: Request, res: Response) => {
  try {
    const matchFilter: Record<string, unknown> = {};
    if (req.query.from || req.query.to) {
      const range: Record<string, Date> = {};
      if (req.query.from) range.$gte = new Date(req.query.from as string);
      if (req.query.to)   range.$lte = new Date(req.query.to   as string);
      matchFilter.timestamp = range;
    }

    const reasons = await DeliveryAttempt.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$result', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = reasons.reduce((s: number, r: { count: number }) => s + r.count, 0);
    const data = reasons.map((r: { _id: string; count: number }) => ({
      reason: r._id,
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
    }));

    res.json({ reasons: data, total });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /analytics/courier-performance
router.get('/courier-performance', async (req: Request, res: Response) => {
  try {
    const couriers = await Courier.find({ isActive: true })
      .select('name phone courierType vehicleType rating totalDeliveries successRate activeOrders status')
      .sort({ successRate: -1 })
      .lean();
    res.json({ couriers });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /analytics/zone-performance?from=&to=
router.get('/zone-performance', async (req: Request, res: Response) => {
  try {
    const matchFilter: Record<string, unknown> = {};
    if (req.query.from || req.query.to) {
      const range: Record<string, Date> = {};
      if (req.query.from) range.$gte = new Date(req.query.from as string);
      if (req.query.to)   range.$lte = new Date(req.query.to   as string);
      matchFilter.createdAt = range;
    }

    const zoneStats = await Shipment.aggregate([
      { $match: matchFilter },
      { $group: {
          _id: '$zoneId',
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status','delivered'] }, 1, 0] } },
          failed:    { $sum: { $cond: [{ $eq: ['$status','failed']    }, 1, 0] } },
          returned:  { $sum: { $cond: [{ $eq: ['$status','returned']  }, 1, 0] } },
          revenue:   { $sum: '$shippingFee' },
        }
      },
      { $sort: { total: -1 } },
    ]);

    const enhanced = zoneStats.map((z: { _id: string; total: number; delivered: number; failed: number; returned: number; revenue: number }) => ({
      ...z,
      successRate: z.total > 0 ? Math.round((z.delivered / z.total) * 100) : 0,
    }));

    res.json({ zones: enhanced });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// GET /analytics/daily-trend?days=30&merchantId=
router.get('/daily-trend', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days ?? 30));
    const from = new Date();
    from.setDate(from.getDate() - days);

    const matchFilter: Record<string, unknown> = { createdAt: { $gte: from } };
    if (req.query.merchantId) matchFilter.merchantId = req.query.merchantId;

    const trend = await Shipment.aggregate([
      { $match: matchFilter },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total:     { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status','delivered'] }, 1, 0] } },
          failed:    { $sum: { $cond: [{ $eq: ['$status','failed'] }, 1, 0] } },
          revenue:   { $sum: '$shippingFee' },
          cod:       { $sum: '$codAmount' },
        }
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ trend });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
