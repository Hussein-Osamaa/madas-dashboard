/**
 * Audit - Barcode scan workflow. Staff with WAREHOUSE app only.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { requireAccountType } from '../middleware/account-guard.middleware';
import { requireApp } from '../middleware/account-guard.middleware';
import * as AuditController from '../modules/audit/controllers/Audit.controller';

const router = Router();
router.use(centralJwtMiddleware);

const validate = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  const errs = require('express-validator').validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg });
    return;
  }
  next();
};

const staffWarehouse = [requireAccountType('STAFF'), requireApp('WAREHOUSE')];

/** Platform admin only (e.g. cancel). */
function requireAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  if ((req as any).accountPayload?.accountType === 'ADMIN') return next();
  res.status(403).json({ error: 'Admin only' });
}

/** Can start/finish audit: platform ADMIN or STAFF with ADMIN app (or audit_start_finish permission when present in JWT). */
function requireCanStartOrFinishAudit(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const p = (req as any).accountPayload;
  if (!p) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (p.accountType === 'ADMIN') return next();
  if (p.accountType === 'STAFF') {
    const hasAdminApp = Array.isArray(p.allowedApps) && p.allowedApps.includes('ADMIN');
    const hasPermission = Array.isArray(p.permissions) && p.permissions.includes('audit_start_finish');
    if (hasAdminApp || hasPermission) return next();
  }
  res.status(403).json({ error: 'You need Admin app access or Start/Finish audit permission to start or finish an audit' });
}

/** Staff with WAREHOUSE or ADMIN (so admin who started can also scan / view session). */
function staffWarehouseOrAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const p = (req as any).accountPayload;
  if (p?.accountType === 'ADMIN') return next();
  requireAccountType('STAFF')(req, res, () => {
    requireApp('WAREHOUSE')(req, res, next);
  });
}

router.post('/start', requireCanStartOrFinishAudit, [body('clientId').isString().notEmpty()], validate, AuditController.start);
router.post('/join', staffWarehouse, [body('joinCode').isString().notEmpty().isLength({ min: 6, max: 6 })], validate, AuditController.join);
router.post(
  '/scan',
  staffWarehouseOrAdmin,
  [
    body('barcode').isString().notEmpty(),
    body('auditSessionId').optional().isString(),
    body('sessionId').optional().isString(),
    body('productId').optional().isString(),
    body('quantity').optional().isNumeric(),
  ],
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (!req.body.auditSessionId && !req.body.sessionId) {
      return res.status(400).json({ error: 'auditSessionId or sessionId required' });
    }
    validate(req, res, next);
  },
  AuditController.scan
);
router.get('/session/:id', staffWarehouseOrAdmin, AuditController.getSession);
router.get('/restore/:id', staffWarehouseOrAdmin, AuditController.restore);
router.post('/finish', requireCanStartOrFinishAudit, [body('sessionId').isString().notEmpty()], validate, AuditController.finish);

router.post('/cancel', requireAdmin, [body('sessionId').isString().notEmpty()], validate, AuditController.cancel);

export default router;
