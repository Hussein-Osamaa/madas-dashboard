import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { login, signup, refreshAccessToken, logout, requestPasswordReset, resetPasswordWithToken } from '../services/auth.service';
import {
  loginClient,
  loginStaff,
  loginAdmin,
  refreshToken,
  type AccountType,
} from '../services/central-auth.service';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';

const router = Router();

/** Strict rate limiter for auth endpoints: 10 attempts per 15 minutes per IP, counting only failures */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.', code: 'auth/too-many-requests' },
  skipSuccessfulRequests: true,
});

/** Password complexity: min 8 chars, uppercase, lowercase, digit */
const passwordComplexity = (field: string) =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number');

const validate = (req: Request, res: Response, next: () => void) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg || 'Invalid input', code: 'auth/invalid-argument' });
    return;
  }
  next();
};

/** POST /auth/client/login */
router.post(
  '/client/login',
  authRateLimit,
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

/** POST /auth/staff/login */
router.post(
  '/staff/login',
  authRateLimit,
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

/** POST /auth/admin/login */
router.post(
  '/admin/login',
  authRateLimit,
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

/** Legacy POST /auth/login → client login */
router.post(
  '/login',
  authRateLimit,
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
  authRateLimit,
  [body('email').isEmail().normalizeEmail(), passwordComplexity('password')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid input', code: 'auth/invalid-argument', details: errors.array() });
      return;
    }
    const result = await signup(req.body.email, req.body.password);
    if (!result) {
      res.status(409).json({ error: 'Email already in use', code: 'auth/email-already-in-use' });
      return;
    }
    res.json(result);
  }
);

router.post(
  '/refresh',
  authRateLimit,
  [body('refreshToken').isString().notEmpty(), body('accountType').optional().isIn(['CLIENT', 'STAFF', 'ADMIN'])],
  validate,
  async (req: Request, res: Response) => {
    const { refreshToken: rt, accountType } = req.body;
    const at = (accountType as AccountType) || 'CLIENT';
    const result = await refreshToken(rt, at);
    if (result) { res.json(result); return; }
    const legacy = await refreshAccessToken(rt);
    if (legacy) { res.json(legacy); return; }
    res.status(401).json({ error: 'Invalid or expired refresh token', code: 'auth/invalid-refresh-token' });
  }
);

/** POST /auth/logout - Invalidates the refresh token so it cannot be reused */
router.post('/logout', centralJwtMiddleware, async (req: Request, res: Response) => {
  const { refreshToken: rt } = req.body;
  if (rt && typeof rt === 'string') {
    await logout(rt).catch(() => { /* token may already be gone */ });
  }
  res.json({ success: true });
});

/** POST /auth/forgot-password */
router.post(
  '/forgot-password',
  authRateLimit,
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req: Request, res: Response) => {
    try {
      await requestPasswordReset(req.body.email, req.body.resetBaseUrl);
    } catch {
      // Always return success to prevent user enumeration
    }
    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  }
);

/** POST /auth/reset-password */
router.post(
  '/reset-password',
  authRateLimit,
  [
    body('token').isString().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    passwordComplexity('password'),
  ],
  validate,
  async (req: Request, res: Response) => {
    const result = await resetPasswordWithToken(req.body.token, req.body.email, req.body.password);
    if (!result.success) {
      res.status(400).json({ error: result.error, code: 'auth/reset-failed' });
      return;
    }
    res.json({ success: true, message: 'Password has been reset successfully.' });
  }
);

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
