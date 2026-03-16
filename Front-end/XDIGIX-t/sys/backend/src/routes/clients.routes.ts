/**
 * Create Client API
 * Creates new client (tenant + business + owner user) in MongoDB
 * Alternative to Firebase Cloud Function when using backend
 */
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../schemas/user.schema';
import { Business } from '../schemas/business.schema';
import { Tenant } from '../schemas/tenant.schema';
import { FirestoreDoc } from '../schemas/document.schema';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';

const router = Router();
const SALT_ROUNDS = 10;

/** Require caller to be an authenticated admin (super_admin / ADMIN accountType) */
function requireAdmin(req: Request, res: Response, next: () => void): void {
  const isAdmin =
    req.accountPayload?.accountType === 'ADMIN' ||
    req.accountPayload?.role === 'super_admin' ||
    (req.user as { type?: string } | undefined)?.type === 'super_admin';
  if (!isAdmin) {
    res.status(403).json({ error: 'Super admin access required', code: 'auth/forbidden' });
    return;
  }
  next();
}

router.post(
  '/create-client',
  centralJwtMiddleware,
  requireAdmin,
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('ownerEmail').isEmail().normalizeEmail(),
  body('ownerPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('ownerName').optional().trim(),
  body('brandEmail').optional().isEmail().normalizeEmail(),
  body('plan').optional().isIn(['basic', 'professional', 'enterprise']),
  body('status').optional().isIn(['active', 'trial', 'suspended', 'cancelled']),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Invalid input',
        details: errors.array()
      });
    }

    const {
      businessName,
      ownerEmail,
      ownerPassword,
      ownerName,
      brandEmail,
      plan = 'basic',
      status = 'trial'
    } = req.body;

    const normalizedEmail = ownerEmail.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    try {
      const uid = uuidv4().replace(/-/g, '').slice(0, 20);
      const tenantId = uuidv4().replace(/-/g, '').slice(0, 20);
      const businessId = uuidv4().replace(/-/g, '').slice(0, 20);
      const passwordHash = await bcrypt.hash(ownerPassword, SALT_ROUNDS);
      const displayName = ownerName || businessName + ' Owner';

      await Tenant.create({
        tenantId,
        name: businessName,
        plan: plan === 'basic' ? 'saas' : plan === 'professional' ? 'all-in-one' : 'all-in-one',
        features: [],
        status: status === 'trial' ? 'trial' : status === 'active' ? 'active' : 'suspended'
      });

      await Business.create({
        businessId,
        tenantId,
        name: businessName,
        owner: { userId: uid, email: normalizedEmail },
        plan: { type: plan, status }
      });

      await User.create({
        uid,
        email: normalizedEmail,
        passwordHash,
        displayName,
        type: 'client_owner',
        businessId,
        tenantId,
        emailVerified: false
      });

      await FirestoreDoc.create({
        tenantId,
        businessId,
        coll: 'staff',
        docId: uid,
        data: {
          uid,
          email: normalizedEmail,
          firstName: displayName.split(' ')[0] || displayName,
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          role: 'owner',
          permissions: { all: true },
          approved: true,
          status: 'active',
          joinedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          invitedBy: 'super_admin'
        }
      });

      res.json({
        success: true,
        businessId,
        tenantId,
        ownerUid: uid,
        message: 'Client created successfully'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to create client'
      });
    }
  }
);

/** GET /clients/restock-reports - List all restock reports (admin use). Query: clientId?, page?, limit? */
router.get('/clients/restock-reports', centralJwtMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { RestockReport } = await import('../schemas/restock-report.schema');
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const clientId = (req.query.clientId as string) || undefined;
    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    const [reports, total] = await Promise.all([
      RestockReport.find(filter).sort({ finishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      RestockReport.countDocuments(filter),
    ]);
    res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;
