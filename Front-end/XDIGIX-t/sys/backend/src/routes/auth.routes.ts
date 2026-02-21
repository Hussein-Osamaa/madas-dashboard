import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { login, signup, refreshAccessToken, logout } from '../services/auth.service';
import {
  loginClient,
  loginStaff,
  loginAdmin,
  refreshToken,
  exchangeFirebaseForAdminToken,
  type AccountType,
} from '../services/central-auth.service';
import { verifyFirebaseToken } from '../lib/firebaseAdmin';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';

const router = Router();
const validate = (req: Request, res: Response, next: () => void) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg || 'Invalid input', code: 'auth/invalid-argument' });
    return;
  }
  next();
};

/** POST /auth/client/login - Client dashboard */
router.post(
  '/client/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
    const result = await loginClient(req.body.email, req.body.password);
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials', code: 'auth/invalid-credential' });
      return;
    }
    res.json(result);
  }
);

/** POST /auth/staff/login - Warehouse portal */
router.post(
  '/staff/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
    const result = await loginStaff(req.body.email, req.body.password);
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials', code: 'auth/invalid-credential' });
      return;
    }
    res.json(result);
  }
);

/** POST /auth/admin/exchange-firebase - Exchange Firebase ID token for backend admin token (no second login) */
router.post(
  '/admin/exchange-firebase',
  [body('firebaseIdToken').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await exchangeFirebaseForAdminToken(req.body.firebaseIdToken, verifyFirebaseToken);
      if (!result) {
        res.status(403).json({ error: 'Not authorized as admin', code: 'auth/not-admin' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/** POST /auth/admin/login */
router.post(
  '/admin/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
    const result = await loginAdmin(req.body.email, req.body.password);
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials', code: 'auth/invalid-credential' });
      return;
    }
    res.json(result);
  }
);

/** Legacy /auth/login → client login */
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
    const result = await login(req.body.email, req.body.password);
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials', code: 'auth/invalid-credential' });
      return;
    }
    res.json(result);
  }
);

router.post(
  '/signup',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid input', code: 'auth/invalid-argument', details: errors.array() });
      return;
    }
    const { email, password } = req.body;
    const result = await signup(email, password);
    if (!result) {
      res.status(409).json({ error: 'Email already in use', code: 'auth/email-already-in-use' });
      return;
    }
    res.json(result);
  }
);

router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty(), body('accountType').optional().isIn(['CLIENT', 'STAFF', 'ADMIN'])],
  validate,
  async (req: Request, res: Response) => {
    const { refreshToken: rt, accountType } = req.body;
    const at = (accountType as AccountType) || 'CLIENT';
    const result = await refreshToken(rt, at);
    if (result) {
      res.json(result);
      return;
    }
    const legacy = await refreshAccessToken(rt);
    if (legacy) {
      res.json(legacy);
      return;
    }
    res.status(401).json({ error: 'Invalid or expired refresh token', code: 'auth/invalid-refresh-token' });
  }
);

router.post('/logout', centralJwtMiddleware, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  // If we stored refresh token in body or cookie, we'd invalidate it here
  res.json({ success: true });
});

router.get('/me', centralJwtMiddleware, async (req: Request, res: Response) => {
  const payload = req.accountPayload ?? req.user;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
    return;
  }
  res.json({
    user: req.accountPayload
      ? {
          uid: req.accountPayload.userId,
          userId: req.accountPayload.userId,
          email: req.accountPayload.email,
          type: req.accountPayload.role,
          accountType: req.accountPayload.accountType,
          role: req.accountPayload.role,
          department: req.accountPayload.department,
          allowedApps: req.accountPayload.allowedApps,
          businessId: req.accountPayload.businessId,
          tenantId: req.accountPayload.tenantId,
        }
      : req.user,
  });
});

export default router;
