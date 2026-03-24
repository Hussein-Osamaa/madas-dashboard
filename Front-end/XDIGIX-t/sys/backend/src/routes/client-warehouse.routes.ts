/**
 * Client virtual warehouse - read-only. Clients only (no warehouse access).
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { requireAccountType } from '../middleware/account-guard.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireClientId } from '../middlewares/warehouse.middlewares';
import * as ProductsController from '../modules/products/controllers/Products.controller';
import * as ReportsController from '../modules/reports/controllers/Reports.controller';
import * as TransactionsController from '../modules/transactions/controllers/Transactions.controller';

function getClientId(req: Request): string {
  const raw = req.businessId ?? req.query.clientId ?? req.params.clientId;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? String(raw[0] ?? '') : '';
}

const router = Router();
router.use(centralJwtMiddleware);
router.use(requireAccountType(['CLIENT', 'ADMIN']));
router.use(tenantMiddleware);
router.use((req, _res, next) => {
  req.clientId = getClientId(req);
  next();
});
router.use(requireClientId);

router.get('/products', ProductsController.listWithStock);
router.get('/linked-inventory', ProductsController.listLinkedInventory);
router.get('/fulfillment-status', ProductsController.fulfillmentStatus);
router.patch('/products/:productId', ProductsController.updateLinkedProductImagePricing);
router.get('/reports', ReportsController.list);
router.get('/reports/:id/download', ReportsController.download);
router.get('/transactions', TransactionsController.list);

/**
 * POST /client/warehouse/send-to-fulfillment
 * Copies an order from the client's orders collection into the warehouse fulfillment pipeline.
 * Body: { orderId }
 * The order data is read from the client's Firestore orders, then upserted into the warehouse orders.
 */
router.post(
  '/send-to-fulfillment',
  [body('orderId').isString().notEmpty()],
  async (req: Request, res: Response) => {
    const errs = require('express-validator').validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
      return;
    }
    try {
      const clientId = req.clientId!;
      const { orderId } = req.body as { orderId: string };

      // 1. Check fulfillment subscription
      const { Business } = await import('../schemas/business.schema');
      const biz = await Business.findOne({ businessId: clientId }).select('features name').lean();
      const features = (biz as { features?: Record<string, unknown> })?.features ?? {};
      const hasFulfillment = features.fulfillment || features.fulfillment_service || features.fulfillmentService;
      if (!hasFulfillment) {
        res.status(403).json({ error: 'Business is not subscribed to fulfillment service' });
        return;
      }

      // 2. Get the order from Firestore
      const { FirestoreDoc } = await import('../schemas/document.schema');
      const orderDoc = await FirestoreDoc.findOne({ businessId: clientId, coll: 'orders', docId: orderId }).lean();
      if (!orderDoc) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const data = (orderDoc as { data?: Record<string, unknown> }).data ?? {};

      // 3. Check if already synced
      if (data.fulfillmentSynced === true) {
        res.status(400).json({ error: 'Order already sent to fulfillment' });
        return;
      }

      // 4. Mark the client's order as synced
      await FirestoreDoc.updateOne(
        { businessId: clientId, coll: 'orders', docId: orderId },
        { $set: { 'data.fulfillmentSynced': true, 'data.fulfillment': { status: 'pending' } } },
      );

      // 5. Emit warehouse update so fulfillment app picks it up
      const { getIo, emitWarehouseUpdate } = await import('../realtime');
      emitWarehouseUpdate(getIo(), { type: 'orders', businessId: clientId });

      const businessName = (biz as { name?: string })?.name || clientId;
      res.json({ success: true, orderId, businessName });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

export default router;
