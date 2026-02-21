/**
 * Staff Management - Admin only.
 * Create, update, deactivate staff. Assign department, role, allowedApps.
 */
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { requireAccountType } from '../middleware/account-guard.middleware';
import { StaffUser, STAFF_PERMISSIONS } from '../schemas/staff-user.schema';
import { hashPassword } from '../services/auth.service';

const allowedPermissions = new Set(STAFF_PERMISSIONS);
function validatePermissions(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => typeof x === 'string' && allowedPermissions.has(x as any));
}

const router = Router();
router.use(centralJwtMiddleware);
router.use(requireAccountType('ADMIN'));

function validate(req: Request, res: Response, next: () => void) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() });
    return;
  }
  next();
}

/** GET /staff - List all staff */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const staff = await StaffUser.find({}).sort({ createdAt: -1 }).select('-passwordHash').lean();
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /staff - Create staff (admin creates credentials) */
router.post(
  '/',
  [
    body('fullName').isString().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('department').isIn(['WAREHOUSE', 'SHIPPING', 'FINANCE']),
    body('role').optional().isString(),
    body('allowedApps').optional().isArray(),
    body('allowedApps.*').isIn(['WAREHOUSE', 'SHIPPING', 'ADMIN']),
    body('permissions').optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const adminId = req.accountPayload!.userId;
      const { fullName, email, password, department, role, allowedApps, permissions } = req.body;
      const existing = await StaffUser.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(409).json({ error: 'Email already in use', code: 'staff/email-exists' });
        return;
      }
      const passwordHash = await hashPassword(password);
      const doc = await StaffUser.create({
        fullName,
        email: email.toLowerCase(),
        passwordHash,
        department,
        role: role || 'staff',
        allowedApps: Array.isArray(allowedApps) ? allowedApps : [],
        permissions: validatePermissions(permissions),
        active: true,
        createdBy: adminId,
      });
      const { passwordHash: _, ...rest } = doc.toObject();
      res.status(201).json({ staff: rest });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** PATCH /staff/:id - Update staff */
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('fullName').optional().isString(),
    body('department').optional().isIn(['WAREHOUSE', 'SHIPPING', 'FINANCE']),
    body('role').optional().isString(),
    body('allowedApps').optional().isArray(),
    body('allowedApps.*').optional().isIn(['WAREHOUSE', 'SHIPPING', 'ADMIN']),
    body('permissions').optional().isArray(),
    body('active').optional().isBoolean(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const update: Record<string, unknown> = {};
      if (req.body.fullName != null) update.fullName = req.body.fullName;
      if (req.body.department != null) update.department = req.body.department;
      if (req.body.role != null) update.role = req.body.role;
      if (req.body.allowedApps != null) update.allowedApps = req.body.allowedApps;
      if (req.body.permissions != null) update.permissions = validatePermissions(req.body.permissions);
      if (req.body.active != null) update.active = req.body.active;
      const doc = await StaffUser.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('-passwordHash')
        .lean();
      if (!doc) {
        res.status(404).json({ error: 'Staff not found' });
        return;
      }
      res.json({ staff: doc });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** POST /staff/:id/reset-password - Reset password */
router.post(
  '/:id/reset-password',
  [param('id').isMongoId(), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const passwordHash = await hashPassword(req.body.password);
      const doc = await StaffUser.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true })
        .select('-passwordHash')
        .lean();
      if (!doc) {
        res.status(404).json({ error: 'Staff not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
