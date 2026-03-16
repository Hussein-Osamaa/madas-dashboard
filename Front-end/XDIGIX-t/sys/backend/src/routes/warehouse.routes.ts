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
import { getIo, emitWarehouseUpdate } from '../realtime';
import * as InventoryController from '../modules/inventory/controllers/Inventory.controller';
import * as InventoryMovementController from '../modules/inventory/controllers/InventoryMovement.controller';
import * as ReportsController from '../modules/reports/controllers/Reports.controller';
import * as AuditComparisonController from '../modules/audit/controllers/AuditComparison.controller';

const router = Router();
router.use(centralJwtMiddleware);
router.use(requireAccountType('STAFF'));
router.use(requireApp('WAREHOUSE'));

/** GET /warehouse/product-activity-log - List product create/update/delete log (ADMIN only). Query: clientId?, page?, limit? */
router.get('/product-activity-log', async (req: Request, res: Response) => {
  const allowedApps = (req.accountPayload as { allowedApps?: string[] } | undefined)?.allowedApps ?? [];
  if (!allowedApps.includes('ADMIN')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  try {
    const clientId = (req.query.clientId as string) || undefined;
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const { listProductActivityLog } = await import('../modules/products/services/ProductActivityLog.service');
    const result = await listProductActivityLog({ clientId, page, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Movement-based inventory: no static quantity. Stock derived only from inventory_movements. */
router.post('/movements', InventoryMovementController.recordMovement);
router.get('/movements', InventoryMovementController.list);
router.get('/stock', InventoryMovementController.getStock);

/** GET /warehouse/dashboard?clientId=xxx - Dashboard metrics (registered early so route always matches). */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string)?.trim() || (req as { clientId?: string }).clientId;
    if (!clientId) {
      res.status(400).json({ error: 'clientId query required' });
      return;
    }
    const { getDashboardData } = await import('../modules/inventory/services/Dashboard.service');
    const data = await getDashboardData(clientId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Audit GET routes (before requireClientId so they always match). */
router.get('/audit/threshold', AuditComparisonController.getThreshold);
router.get('/audit/comparisons', AuditComparisonController.listComparisons);
router.get('/audit/alerts', AuditComparisonController.listAlerts);

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

/** PATCH /warehouse/orders/:orderId - Update order fulfillment status. Body: { businessId, status, trackingNumber?, notes?, shipmentId? } */
router.patch(
  '/orders/:orderId',
  [
    body('businessId').isString().notEmpty(),
    body('status').isString().notEmpty(),
    body('trackingNumber').optional().isString(),
    body('notes').optional().isString(),
    body('shipmentId').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errs = require('express-validator').validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
      return;
    }
    try {
      const orderId = req.params.orderId;
      const { businessId, status, trackingNumber, notes, shipmentId } = req.body;
      const { updateOrderFulfillment } = await import('../modules/warehouse-orders/warehouse-orders.service');
      const payload: { status: string; trackingNumber?: string; notes?: string; shippedAt?: string; deliveredAt?: string; shipmentId?: string } = { status };
      if (trackingNumber) payload.trackingNumber = trackingNumber;
      if (notes) payload.notes = notes;
      if (shipmentId) payload.shipmentId = shipmentId;
      if (status === 'shipped') payload.shippedAt = new Date().toISOString();
      if (status === 'delivered') payload.deliveredAt = new Date().toISOString();
      await updateOrderFulfillment(businessId, orderId, payload);
      emitWarehouseUpdate(getIo(), { type: 'orders', businessId });
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
      emitWarehouseUpdate(getIo(), { type: 'orders', businessId });
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

/** GET /warehouse/export?clientId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Excel export (4 sheets: Weekly Summary, Detailed Movement Log, SKU-Level Breakdown, Profit Estimation). */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const clientId = req.clientId!;
    const startDateRaw = (req.query.startDate as string)?.trim();
    const endDateRaw = (req.query.endDate as string)?.trim();
    if (!startDateRaw || !endDateRaw) {
      res.status(400).json({ error: 'startDate and endDate query params required (YYYY-MM-DD)' });
      return;
    }
    const startDate = new Date(startDateRaw + 'T00:00:00.000Z');
    const endDate = new Date(endDateRaw + 'T23:59:59.999Z');
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ error: 'Invalid startDate or endDate' });
      return;
    }
    if (startDate > endDate) {
      res.status(400).json({ error: 'startDate must be before or equal to endDate' });
      return;
    }
    const { buildInventoryExport } = await import('../modules/inventory/services/Export.service');
    const buffer = await buildInventoryExport(clientId, startDate, endDate);
    const filename = `inventory-export-${startDateRaw}-${endDateRaw}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Audit comparison: POST/PATCH (clientId in body for POST). */
router.post('/audit/record-count', AuditComparisonController.recordCount);
router.post('/audit/record-count-bulk', AuditComparisonController.recordCountBulk);
router.patch('/audit/alerts/:alertId/acknowledge', AuditComparisonController.acknowledgeAlert);

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

/** POST /warehouse/restock-session - Finish a restock session: records INBOUND for each item, saves RestockReport, sends email. */
router.post(
  '/restock-session',
  [
    body('clientId').isString().notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.productId').isString().notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('sessionNote').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { clientId, items, sessionNote } = req.body as {
        clientId: string;
        items: Array<{ productId: string; productName?: string; sku?: string; quantity: number }>;
        sessionNote?: string;
      };
      const staffId = (req.accountPayload as { userId?: string })?.userId;
      const staffEmail = (req.accountPayload as { email?: string })?.email;

      const { recordTransaction } = await import('../modules/inventory/services/Inventory.service');
      for (const item of items) {
        await recordTransaction({
          productId: item.productId,
          clientId,
          type: 'INBOUND',
          quantity: item.quantity,
          referenceId: `restock:session:${Date.now()}`,
          performedByStaffId: staffId,
        });
      }

      const biz = await Business.findOne({ businessId: clientId }).select('name').lean();
      const clientName = (biz as { name?: string } | null)?.name || clientId;

      const { RestockReport } = await import('../schemas/restock-report.schema');
      const totalItems = items.reduce((s, i) => s + i.quantity, 0);
      const report = await RestockReport.create({
        clientId,
        clientName,
        staffId,
        staffEmail,
        items,
        totalItems,
        sessionNote,
        finishedAt: new Date(),
      });

      // Send email notification
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (adminEmail) {
        try {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          const itemRows = items
            .map((i) => `<tr><td style="padding:4px 8px;border:1px solid #ddd">${i.productName || i.productId}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${i.sku || '-'}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${i.quantity}</td></tr>`)
            .join('');
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@xdigix.com',
            to: adminEmail,
            subject: `Restock Session Complete — ${clientName}`,
            html: `
              <h2 style="font-family:sans-serif">Restock Session Report</h2>
              <p style="font-family:sans-serif"><strong>Client:</strong> ${clientName}</p>
              <p style="font-family:sans-serif"><strong>Staff:</strong> ${staffEmail || staffId || 'N/A'}</p>
              <p style="font-family:sans-serif"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              ${sessionNote ? `<p style="font-family:sans-serif"><strong>Note:</strong> ${sessionNote}</p>` : ''}
              <p style="font-family:sans-serif"><strong>Total Units Restocked:</strong> ${totalItems}</p>
              <table style="border-collapse:collapse;font-family:sans-serif;margin-top:12px">
                <thead><tr style="background:#f4f4f4"><th style="padding:6px 8px;border:1px solid #ddd">Product</th><th style="padding:6px 8px;border:1px solid #ddd">SKU</th><th style="padding:6px 8px;border:1px solid #ddd">Qty Added</th></tr></thead>
                <tbody>${itemRows}</tbody>
              </table>
            `,
          });
          report.emailSent = true;
          await report.save();
        } catch (mailErr) {
          console.error('[RestockSession] Email error:', mailErr);
        }
      }

      emitWarehouseUpdate(getIo(), { type: 'products', clientId });
      res.json({ success: true, reportId: report._id.toString(), totalItems });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** POST /warehouse/returns/scan - Scan returned product. Creates RETURNED (resellable) or DAMAGED movement. Body: barcode, return_reference_id, condition (resellable|damaged), quantity? */
router.post(
  '/returns/scan',
  [
    body('barcode').isString().notEmpty(),
    body('return_reference_id').isString().notEmpty(),
    body('condition').isIn(['resellable', 'damaged']),
    body('quantity').optional().isInt({ min: 1 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const clientId = req.clientId!;
      const { barcode, return_reference_id, condition, quantity } = req.body;
      const worker_id = (req.accountPayload as { userId?: string })?.userId ?? req.body.worker_id;
      const { scanReturnedProduct } = await import('../modules/warehouse-orders/warehouse-orders.service');
      const result = await scanReturnedProduct(clientId, {
        barcode,
        return_reference_id,
        condition,
        quantity,
        worker_id,
      });
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }
      emitWarehouseUpdate(getIo(), { type: 'products', clientId });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

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
      emitWarehouseUpdate(getIo(), { type: 'warehouses', clientId: req.clientId! });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

router.get('/products', async (req: Request, res: Response) => {
  try {
    const lean = req.query.lean === '1';
    const { listProductsWithStock } = await import('../modules/products/controllers/Products.controller');
    const products = await listProductsWithStock(req.clientId!, { fulfillmentOnly: true, skipAvailableStock: lean });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Clone to plain object so nested stock/sizeBarcodes are never lost (proxies, getters, etc.) */
function plainStockAndBarcodes(body: Record<string, unknown>): {
  stock: Record<string, number> | undefined;
  sizeBarcodes: Record<string, string> | undefined;
} {
  let stock: Record<string, number> | undefined;
  let sizeBarcodes: Record<string, string> | undefined;
  try {
    if (body.stock != null && typeof body.stock === 'object' && !Array.isArray(body.stock)) {
      stock = JSON.parse(JSON.stringify(body.stock)) as Record<string, number>;
    }
  } catch {
    stock = undefined;
  }
  try {
    if (body.sizeBarcodes != null && typeof body.sizeBarcodes === 'object' && !Array.isArray(body.sizeBarcodes)) {
      sizeBarcodes = JSON.parse(JSON.stringify(body.sizeBarcodes)) as Record<string, string>;
    }
  } catch {
    sizeBarcodes = undefined;
  }
  return { stock, sizeBarcodes };
}

router.post(
  '/products',
  [
    body('clientId').isString().notEmpty(),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('sku').optional().isString(),
    body('barcode').optional().isString(),
    body('warehouse').optional().isString(),
    body('stock').optional(),
    body('sizeBarcodes').optional(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { createProduct } = await import('../modules/products/controllers/Products.controller');
      const { stock, sizeBarcodes } = plainStockAndBarcodes(req.body as Record<string, unknown>);
      const result = await createProduct(req.clientId!, {
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode,
        warehouse: req.body.warehouse,
        stock: stock ?? {},
        sizeBarcodes: sizeBarcodes ?? {},
      });
      const { logProductActivity } = await import('../modules/products/services/ProductActivityLog.service');
      const userId = (req.accountPayload as { userId?: string })?.userId ?? '';
      const email = (req.accountPayload as { email?: string })?.email ?? '';
      await logProductActivity({
        clientId: req.clientId!,
        productId: result.id,
        productName: req.body.name,
        action: 'created',
        performedByUserId: userId,
        performedByEmail: email,
        details: {
          sku: req.body.sku ?? null,
          barcode: req.body.barcode ?? null,
          warehouse: req.body.warehouse ?? null,
          initialStock: stock ?? {},
        },
      });
      emitWarehouseUpdate(getIo(), { type: 'products', clientId: req.clientId! });
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
    body('clientId').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });
      const clientId = (req.body?.clientId && String(req.body.clientId).trim()) || req.clientId;
      if (!clientId) return res.status(400).json({ error: 'Client ID required' });
      const { updateProduct } = await import('../modules/products/controllers/Products.controller');
      let { stock, sizeBarcodes } = plainStockAndBarcodes(req.body as Record<string, unknown>);
      if (stock === undefined && req.body?.stock != null && typeof req.body.stock === 'object' && !Array.isArray(req.body.stock)) {
        try {
          stock = JSON.parse(JSON.stringify(req.body.stock)) as Record<string, number>;
        } catch {
          stock = undefined;
        }
      }
      if (sizeBarcodes === undefined && req.body?.sizeBarcodes != null && typeof req.body.sizeBarcodes === 'object' && !Array.isArray(req.body.sizeBarcodes)) {
        try {
          sizeBarcodes = JSON.parse(JSON.stringify(req.body.sizeBarcodes)) as Record<string, string>;
        } catch {
          sizeBarcodes = undefined;
        }
      }
      const { productName, oldStock, oldFields } = await updateProduct(clientId, productId, {
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode,
        warehouse: req.body.warehouse,
        stock,
        sizeBarcodes,
      });
      const userId = (req.accountPayload as { userId?: string })?.userId ?? '';
      const email = (req.accountPayload as { email?: string })?.email ?? '';
      const { logProductActivity } = await import('../modules/products/services/ProductActivityLog.service');

      // Compute stock diffs: { M: { from: 30, to: 50, diff: 20 } }
      const stockChanges: Record<string, { from: number; to: number; diff: number }> = {};
      if (stock != null) {
        const allKeys = new Set([...Object.keys(stock), ...Object.keys(oldStock ?? {})]);
        for (const key of allKeys) {
          const from = (oldStock ?? {})[key] ?? 0;
          const to = stock[key] ?? 0;
          if (from !== to) stockChanges[key] = { from, to, diff: to - from };
        }
      }

      // Compute field changes: { name: { from: 'Old', to: 'New' } }
      const fieldChanges: Record<string, { from: unknown; to: unknown }> = {};
      if (req.body.name != null && String(oldFields?.name ?? '') !== String(req.body.name))
        fieldChanges.name = { from: oldFields?.name ?? '', to: req.body.name };
      if (req.body.sku != null && String(oldFields?.sku ?? '') !== String(req.body.sku))
        fieldChanges.sku = { from: oldFields?.sku ?? '', to: req.body.sku };
      if (req.body.barcode != null && String(oldFields?.barcode ?? '') !== String(req.body.barcode))
        fieldChanges.barcode = { from: oldFields?.barcode ?? '', to: req.body.barcode };
      if (req.body.warehouse != null && String(oldFields?.warehouse ?? '') !== String(req.body.warehouse))
        fieldChanges.warehouse = { from: oldFields?.warehouse ?? '', to: req.body.warehouse };

      const logDetails: Record<string, unknown> = {};
      if (Object.keys(stockChanges).length) logDetails.stockChanges = stockChanges;
      if (Object.keys(fieldChanges).length) logDetails.fieldChanges = fieldChanges;
      if (!Object.keys(logDetails).length) logDetails.noChanges = true;

      await logProductActivity({
        clientId,
        productId,
        productName,
        action: 'updated',
        performedByUserId: userId,
        performedByEmail: email,
        details: logDetails,
      });
      emitWarehouseUpdate(getIo(), { type: 'products', clientId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** POST /warehouse/products/bulk-stock - Bulk update stock for many products at once (restock).
 *
 * Scalable path: one MongoDB find() + one bulkWrite() regardless of product count.
 * Supports partial batches from the frontend (frontend chunks into ≤200-product requests).
 */
router.post('/products/bulk-stock', async (req: Request, res: Response) => {
  try {
    const clientId = (req.body?.clientId && String(req.body.clientId).trim()) || req.clientId;
    if (!clientId) return res.status(400).json({ error: 'Client ID required' });
    const updates = req.body?.updates as Array<{ productId: string; stock: Record<string, number> }> | undefined;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array required' });
    }

    const { FirestoreDoc } = await import('../schemas/document.schema');
    const { batchLogProductActivity } = await import('../modules/products/services/ProductActivityLog.service');
    const userId = (req.accountPayload as { userId?: string })?.userId ?? '';
    const email  = (req.accountPayload as { email?: string })?.email  ?? '';

    const productIds = updates.map((u) => u.productId);

    // ── 1. Load ALL existing docs in ONE query ────────────────────────────────
    const existingDocs = await FirestoreDoc.find(
      { businessId: clientId, coll: 'products', docId: { $in: productIds } },
      { docId: 1, data: 1 }
    ).lean();

    const docMap = new Map<string, Record<string, unknown>>();
    existingDocs.forEach((d) => docMap.set(String(d.docId), (d.data ?? {}) as Record<string, unknown>));

    // ── 2. Build bulkWrite ops + activity logs in memory ─────────────────────
    const bulkOps: object[] = [];
    const activityLogs: Parameters<typeof batchLogProductActivity>[0] = [];
    let succeeded = 0;
    let failed    = 0;

    for (const u of updates) {
      const existing = docMap.get(u.productId);
      if (!existing) { failed++; continue; }

      // Compute stock diff for activity log
      const oldStockRaw = existing.stock as Record<string, unknown> | undefined;
      const oldStock: Record<string, number> = {};
      if (oldStockRaw && typeof oldStockRaw === 'object') {
        for (const [k, v] of Object.entries(oldStockRaw)) {
          const n = typeof v === 'number' ? v : Number(v);
          if (!Number.isNaN(n)) oldStock[k] = n;
        }
      }

      const stockChanges: Record<string, { from: number; to: number; diff: number }> = {};
      const allKeys = new Set([...Object.keys(u.stock), ...Object.keys(oldStock)]);
      for (const key of allKeys) {
        const from = oldStock[key] ?? 0;
        const to   = u.stock[key] ?? 0;
        if (from !== to) stockChanges[key] = { from, to, diff: to - from };
      }

      // Only update the stock field — preserve everything else (name, sku, barcodes…)
      bulkOps.push({
        updateOne: {
          filter: { businessId: clientId, coll: 'products', docId: u.productId },
          update: { $set: { 'data.stock': u.stock, 'data.updatedAt': new Date().toISOString() } },
        },
      });

      activityLogs.push({
        clientId,
        productId:          u.productId,
        productName:        String(existing.name ?? u.productId),
        action:             'updated',
        performedByUserId:  userId,
        performedByEmail:   email,
        details: {
          stockChanges: Object.keys(stockChanges).length ? stockChanges : undefined,
          source: 'bulk-restock',
        },
      });
      succeeded++;
    }

    // ── 3. ONE bulkWrite for all stock updates ────────────────────────────────
    if (bulkOps.length > 0) {
      await (FirestoreDoc as import('mongoose').Model<import('mongoose').Document>).bulkWrite(
        bulkOps as import('mongoose').AnyBulkWriteOperation[],
        { ordered: false }   // continue even if one op fails
      );
    }

    // ── 4. ONE insertMany for all activity logs ───────────────────────────────
    if (activityLogs.length > 0) {
      await batchLogProductActivity(activityLogs).catch(() => { /* non-critical */ });
    }

    emitWarehouseUpdate(getIo(), { type: 'products', clientId });
    res.json({ success: true, succeeded, failed, total: updates.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** DELETE /warehouse/products/:id - Delete product. Query: clientId (preferred; body also accepted). */
router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    if (!productId) return res.status(400).json({ error: 'Product ID required' });
    const clientId =
      (req.query?.clientId && String(req.query.clientId).trim()) ||
      (req.body?.clientId && String(req.body.clientId).trim()) ||
      req.clientId;
    if (!clientId) return res.status(400).json({ error: 'Client ID required' });
    const { deleteProduct } = await import('../modules/products/controllers/Products.controller');
    const { productName } = await deleteProduct(clientId, productId);
    const userId = (req.accountPayload as { userId?: string })?.userId ?? '';
    const email = (req.accountPayload as { email?: string })?.email ?? '';
    const { logProductActivity } = await import('../modules/products/services/ProductActivityLog.service');
    await logProductActivity({
      clientId,
      productId,
      productName,
      action: 'deleted',
      performedByUserId: userId,
      performedByEmail: email,
      details: { deletedName: productName ?? null },
    });
    emitWarehouseUpdate(getIo(), { type: 'products', clientId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
