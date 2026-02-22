/**
 * Warehouse operations - Staff with WAREHOUSE app only.
 * All stock changes via recordTransaction. ClientId from request (merchant).
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { requireAccountType } from '../middleware/account-guard.middleware';
import { requireApp } from '../middleware/account-guard.middleware';
import { requireClientId } from '../middlewares/warehouse.middlewares';
import { Business } from '../schemas/business.schema';
import * as InventoryController from '../modules/inventory/controllers/Inventory.controller';
import * as ReportsController from '../modules/reports/controllers/Reports.controller';

const router = Router();
router.use(centralJwtMiddleware);
router.use(requireAccountType('STAFF'));
router.use(requireApp('WAREHOUSE'));

/** GET /warehouse/clients - List clients with fulfillment subscription (no clientId required) */
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const businesses = await Business.find({
      $or: [
        { 'features.fulfillment': true },
        { 'features.fulfillment_service': true },
        { 'features.fulfillmentService': true },
      ],
    })
      .select('businessId name')
      .sort({ name: 1 })
      .lean();
    res.json({
      clients: businesses.map((b) => ({ id: b.businessId, name: b.name || b.businessId })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /warehouse/orders - List fulfillment orders (all or by status). No clientId required. */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'all';
    const { listFulfillmentOrders } = await import('../modules/warehouse-orders/warehouse-orders.service');
    const orders = await listFulfillmentOrders({ status: status as 'all' | 'pending' | 'ready_for_pickup' | 'shipped' });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** PATCH /warehouse/orders/:orderId - Update order fulfillment status. Body: { businessId, status, trackingNumber?, notes? } */
router.patch(
  '/orders/:orderId',
  [
    body('businessId').isString().notEmpty(),
    body('status').isString().notEmpty(),
    body('trackingNumber').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errs = require('express-validator').validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
      return;
    }
    try {
      const orderId = req.params.orderId;
      const { businessId, status, trackingNumber, notes } = req.body;
      const { updateOrderFulfillment } = await import('../modules/warehouse-orders/warehouse-orders.service');
      const payload: { status: string; trackingNumber?: string; notes?: string; shippedAt?: string; deliveredAt?: string } = { status };
      if (trackingNumber) payload.trackingNumber = trackingNumber;
      if (notes) payload.notes = notes;
      if (status === 'shipped') payload.shippedAt = new Date().toISOString();
      if (status === 'delivered') payload.deliveredAt = new Date().toISOString();
      await updateOrderFulfillment(businessId, orderId, payload);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** GET /warehouse/orders/:orderId - Get single order (query businessId) */
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const businessId = (req.query.businessId as string) || '';
    if (!businessId) {
      res.status(400).json({ error: 'businessId query required' });
      return;
    }
    const { getOrder } = await import('../modules/warehouse-orders/warehouse-orders.service');
    const order = await getOrder(businessId, orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /warehouse/products-for-scan - List products with barcode fields for scan matching (query clientId) */
router.get('/products-for-scan', async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || '';
    if (!clientId) {
      res.status(400).json({ error: 'clientId query required' });
      return;
    }
    const { listProductsForScan } = await import('../modules/warehouse-orders/warehouse-orders.service');
    const products = await listProductsForScan(clientId);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /warehouse/orders/:orderId/scan - Scan barcode for order (body: businessId, barcode). Deducts stock, marks item scanned. */
router.post(
  '/orders/:orderId/scan',
  [body('businessId').isString().notEmpty(), body('barcode').isString().notEmpty()],
  async (req: Request, res: Response) => {
    const errs = require('express-validator').validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
      return;
    }
    try {
      const orderId = req.params.orderId;
      const { businessId, barcode } = req.body;
      const staffId = req.accountPayload?.userId;
      const { scanOrderBarcode } = await import('../modules/warehouse-orders/warehouse-orders.service');
      const result = await scanOrderBarcode(businessId, orderId, barcode, staffId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

router.use((req, _res, next) => {
  req.clientId = req.clientId ?? req.body?.clientId ?? req.query?.clientId;
  next();
});
router.use(requireClientId);

/** GET /warehouse/reports?clientId=xxx - List inventory reports for a client (STAFF with WAREHOUSE). */
router.get('/reports', ReportsController.list);
/** GET /warehouse/reports/:id/download?clientId=xxx - Download report PDF. */
router.get('/reports/:id/download', ReportsController.download);

const validate = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  const errs = require('express-validator').validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
    return;
  }
  next();
};

router.post(
  '/inbound',
  [body('productId').isString().notEmpty(), body('clientId').isString().notEmpty(), body('quantity').isInt({ min: 1 })],
  validate,
  InventoryController.inbound
);
router.post(
  '/damage',
  [body('productId').isString().notEmpty(), body('clientId').isString().notEmpty(), body('quantity').isInt({ min: 1 })],
  validate,
  InventoryController.damage
);
router.post(
  '/missing',
  [body('productId').isString().notEmpty(), body('clientId').isString().notEmpty(), body('quantity').isInt({ min: 1 })],
  validate,
  InventoryController.missing
);
router.get('/transactions', InventoryController.listTransactions);

router.get('/warehouses', async (req: Request, res: Response) => {
  try {
    const { listWarehouses } = await import('../modules/warehouses/controllers/Warehouses.controller');
    const warehouses = await listWarehouses(req.clientId!);
    res.json({ warehouses });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post(
  '/warehouses',
  [
    body('clientId').isString().notEmpty(),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('code').optional().isString(),
    body('description').optional().isString(),
    body('address').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { createWarehouse } = await import('../modules/warehouses/controllers/Warehouses.controller');
      const result = await createWarehouse(req.clientId!, {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        address: req.body.address,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { listProductsWithStock } = await import('../modules/products/controllers/Products.controller');
    const products = await listProductsWithStock(req.clientId!, { fulfillmentOnly: true });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post(
  '/products',
  [
    body('clientId').isString().notEmpty(),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('sku').optional().isString(),
    body('barcode').optional().isString(),
    body('warehouse').optional().isString(),
    body('stock').optional().isObject(),
    body('sizeBarcodes').optional().isObject(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { createProduct } = await import('../modules/products/controllers/Products.controller');
      const result = await createProduct(req.clientId!, {
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode,
        warehouse: req.body.warehouse,
        stock: req.body.stock,
        sizeBarcodes: req.body.sizeBarcodes,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

router.patch(
  '/products/:id',
  [
    body('name').optional().isString(),
    body('sku').optional().isString(),
    body('barcode').optional().isString(),
    body('warehouse').optional().isString(),
    body('stock').optional().isObject(),
    body('sizeBarcodes').optional().isObject(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });
      const { updateProduct } = await import('../modules/products/controllers/Products.controller');
      await updateProduct(req.clientId!, productId, {
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode,
        warehouse: req.body.warehouse,
        stock: req.body.stock,
        sizeBarcodes: req.body.sizeBarcodes,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
