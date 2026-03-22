/**
 * Restock - Multi-user live barcode scanning for stock replenishment.
 * Staff with WAREHOUSE app only. Follows same auth pattern as audit.routes.ts.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { requireAccountType, requireApp } from '../middleware/account-guard.middleware';
import * as RestockController from '../modules/restock/controllers/Restock.controller';

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

/** Staff with WAREHOUSE or ADMIN (so admin who started can also scan / view session). */
function staffWarehouseOrAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const p = (req as any).accountPayload;
  if (p?.accountType === 'ADMIN') return next();
  requireAccountType('STAFF')(req, res, () => {
    requireApp('WAREHOUSE')(req, res, next);
  });
}

router.post(
  '/start',
  staffWarehouseOrAdmin,
  [body('clientId').isString().notEmpty()],
  validate,
  RestockController.start,
);

router.post(
  '/join',
  staffWarehouseOrAdmin,
  [body('joinCode').isString().notEmpty().isLength({ min: 6, max: 6 })],
  validate,
  RestockController.join,
);

router.post(
  '/scan',
  staffWarehouseOrAdmin,
  [
    body('sessionId').isString().notEmpty(),
    body('barcode').isString().notEmpty(),
  ],
  validate,
  RestockController.scan,
);

router.get('/session/:id', staffWarehouseOrAdmin, RestockController.getSession);
router.get('/restore/:id', staffWarehouseOrAdmin, RestockController.restore);

router.post(
  '/finish',
  staffWarehouseOrAdmin,
  [body('sessionId').isString().notEmpty()],
  validate,
  RestockController.finish,
);

router.post(
  '/cancel',
  staffWarehouseOrAdmin,
  [body('sessionId').isString().notEmpty()],
  validate,
  RestockController.cancel,
);

export default router;
