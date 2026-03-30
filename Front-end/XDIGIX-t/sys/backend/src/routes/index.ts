import { Router } from 'express';
import authRoutes from './auth.routes';
import firestoreRoutes from './firestore.routes';
import storageRoutes from './storage.routes';
import domainsRoutes from './domains.routes';
import clientsRoutes from './clients.routes';
import warehouseRoutes from './warehouse.routes';
import auditRoutes from './audit.routes';
import restockRoutes from './restock.routes';
import clientWarehouseRoutes from './client-warehouse.routes';
import staffRoutes from './staff.routes';
import externalRoutes from './external.routes';
import zammitRoutes from './zammit.routes';
import bostaRoutes from './bosta.routes';
import shippingRoutes from './shipping/index';
import sitesRoutes from './sites.routes';
import publicRoutes from './public.routes';
import checkoutRoutes, { handleStripeWebhook } from './checkout.routes';
import aiRoutes from './ai.routes';
import financeRoutes from '../modules/finance/finance.routes';
import fulfillmentRoutes from '../modules/fulfillment/fulfillment.routes';
import shippingModuleRoutes from '../modules/shipping-module/shipping.routes';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const { healthService } = await import('../modules/platform-core');
    const health = await healthService.checkHealth();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: (err as Error).message, timestamp: new Date().toISOString() });
  }
});

router.use('/external', externalRoutes);
router.use('/zammit', zammitRoutes);
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/', clientsRoutes);
router.use('/firestore', firestoreRoutes);
// Debug: if GET /api/warehouse/ping returns 200, this backend is running (no auth).
router.get('/warehouse/ping', (_req, res) => res.json({ ok: true, msg: 'warehouse routes loaded' }));
router.use('/warehouse', warehouseRoutes);
router.use('/audit', auditRoutes);
router.use('/restock', restockRoutes);
router.use('/client/warehouse', clientWarehouseRoutes);
router.use('/storage', storageRoutes);
router.use('/domains', domainsRoutes);
router.use('/bosta', bostaRoutes);
router.use('/shipping', shippingRoutes);
router.use('/sites', sitesRoutes);

// Public storefront API — no auth required, cors(*), rate-limited
router.use('/public', publicRoutes);

// Checkout API — no auth, cart-token based, rate-limited
router.use('/public', checkoutRoutes);

// Stripe webhook — raw body, signature verified
router.post('/payments/stripe/webhook', handleStripeWebhook);

// AI Theme API — auth required, rate-limited to 10 req/min
router.use('/ai', aiRoutes);

// Finance API — auth required, tenant-scoped
router.use('/finance', financeRoutes);

// Fulfillment API — auth required, tenant-scoped
router.use('/fulfillment', fulfillmentRoutes);

// Shipping v2 API — auth required (except public tracking), tenant-scoped
router.use('/shipping-v2', shippingModuleRoutes);

// Cloud Functions compatibility: /addDomain, /verifyDomain, etc. (base URL replacement only)
const qs = (req: { url?: string }) => (req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
router.post('/addDomain', (req, res, next) => { req.url = '/add' + qs(req); domainsRoutes(req, res, next); });
router.post('/verifyDomain', (req, res, next) => { req.url = '/verify' + qs(req); domainsRoutes(req, res, next); });
router.post('/removeDomain', (req, res, next) => { req.url = '/remove' + qs(req); domainsRoutes(req, res, next); });
router.get('/getDomainStatus', (req, res, next) => { req.url = '/status' + qs(req); domainsRoutes(req, res, next); });
router.get('/listDomains', (req, res, next) => { req.url = '/list' + qs(req); domainsRoutes(req, res, next); });

export default router;
