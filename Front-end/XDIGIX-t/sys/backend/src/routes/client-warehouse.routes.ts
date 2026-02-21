/**
 * Client virtual warehouse - read-only. Clients only (no warehouse access).
 */
import { Router, Request } from 'express';
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
router.use(requireAccountType('CLIENT'));
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

export default router;
