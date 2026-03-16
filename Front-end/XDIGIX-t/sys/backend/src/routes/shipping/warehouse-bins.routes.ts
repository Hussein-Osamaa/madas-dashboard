/**
 * Warehouse sorting bins management + package scanning
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { WarehouseBin, PackageScan } from '../../schemas/shipping/warehouse-bin.schema';
import { Shipment } from '../../schemas/shipping/shipment.schema';
import { ShipmentEvent } from '../../schemas/shipping/shipment-event.schema';

const router = Router();
const validate = (req: Request, res: Response, next: import('express').NextFunction) => {
  const { validationResult } = require('express-validator');
  const errs = validationResult(req);
  if (!errs.isEmpty()) { res.status(400).json({ error: errs.array()[0]?.msg }); return; }
  next();
};

// GET /warehouse-bins?warehouseId=&zoneId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId;
    if (req.query.zoneId)      filter.zoneId      = req.query.zoneId;
    const bins = await WarehouseBin.find(filter).sort({ binCode: 1 }).lean();
    res.json({ bins });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /warehouse-bins
router.post('/',
  [body('warehouseId').isString().notEmpty(), body('binCode').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const bin = await WarehouseBin.create(req.body);
      res.status(201).json({ bin });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 11000) { res.status(409).json({ error: 'Bin code already exists in this warehouse' }); return; }
      res.status(500).json({ error: e.message });
    }
  });

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const bin = await WarehouseBin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bin) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ bin });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  await WarehouseBin.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// POST /warehouse-bins/scan — scan shipment barcode into a bin
router.post('/scan',
  [
    body('trackingNumber').isString().notEmpty(),
    body('binId').isString().notEmpty(),
    body('warehouseId').isString().notEmpty(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { trackingNumber, binId, warehouseId } = req.body;
      const scannedBy = req.body.scannedBy;

      const shipment = await Shipment.findOne({ trackingNumber });
      if (!shipment) { res.status(404).json({ error: 'Shipment not found' }); return; }

      const bin = await WarehouseBin.findById(binId);
      if (!bin) { res.status(404).json({ error: 'Bin not found' }); return; }

      await PackageScan.create({
        shipmentId:     shipment._id.toString(),
        trackingNumber,
        binId,
        warehouseId,
        scannedBy,
        scannedAt: new Date(),
      });

      // Update bin count
      await WarehouseBin.findByIdAndUpdate(binId, { $inc: { currentCount: 1 } });

      // Mark shipment as sorted if it was in_warehouse
      if (shipment.status === 'in_warehouse') {
        shipment.status = 'sorted';
        await shipment.save();
        await ShipmentEvent.create({
          shipmentId: shipment._id.toString(),
          trackingNumber,
          eventType: 'SORTED',
          description: `Package scanned into bin ${bin.binCode}`,
          location: warehouseId,
          performedBy: scannedBy,
          performedByRole: 'warehouse_staff',
          metadata: { binCode: bin.binCode, binId },
          timestamp: new Date(),
        });
      }

      res.json({ success: true, bin: { code: bin.binCode }, shipment: { status: shipment.status } });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// GET /warehouse-bins/:binId/scans
router.get('/:binId/scans', async (req: Request, res: Response) => {
  try {
    const scans = await PackageScan.find({ binId: req.params.binId }).sort({ scannedAt: -1 }).limit(100).lean();
    res.json({ scans });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
