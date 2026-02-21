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

const router = Router();
const SALT_ROUNDS = 10;

router.post(
  '/create-client',
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('ownerEmail').isEmail().normalizeEmail(),
  body('ownerPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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

      console.log('[CreateClient] Created:', { businessName, ownerEmail, businessId, tenantId });

      res.json({
        success: true,
        businessId,
        tenantId,
        ownerUid: uid,
        message: 'Client created successfully'
      });
    } catch (err) {
      console.error('[CreateClient] Error:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create client'
      });
    }
  }
);

export default router;
