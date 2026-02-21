import { Router } from 'express';
import authRoutes from './auth.routes';
import firestoreRoutes from './firestore.routes';
import storageRoutes from './storage.routes';
import domainsRoutes from './domains.routes';
import clientsRoutes from './clients.routes';
import warehouseRoutes from './warehouse.routes';
import auditRoutes from './audit.routes';
import clientWarehouseRoutes from './client-warehouse.routes';
import staffRoutes from './staff.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/', clientsRoutes);
router.use('/firestore', firestoreRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/audit', auditRoutes);
router.use('/client/warehouse', clientWarehouseRoutes);
router.use('/storage', storageRoutes);
router.use('/domains', domainsRoutes);

// Cloud Functions compatibility: /addDomain, /verifyDomain, etc. (base URL replacement only)
const qs = (req: { url?: string }) => (req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
router.post('/addDomain', (req, res, next) => { req.url = '/add' + qs(req); domainsRoutes(req, res, next); });
router.post('/verifyDomain', (req, res, next) => { req.url = '/verify' + qs(req); domainsRoutes(req, res, next); });
router.post('/removeDomain', (req, res, next) => { req.url = '/remove' + qs(req); domainsRoutes(req, res, next); });
router.get('/getDomainStatus', (req, res, next) => { req.url = '/status' + qs(req); domainsRoutes(req, res, next); });
router.get('/listDomains', (req, res, next) => { req.url = '/list' + qs(req); domainsRoutes(req, res, next); });

export default router;
