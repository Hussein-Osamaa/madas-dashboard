/**
 * JWT middleware for central auth (supports CLIENT, STAFF, ADMIN).
 * Sets req.accountPayload with full JWT payload.
 * Also sets req.user for backward compatibility (uid, email, type, businessId, tenantId).
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken, type AccountType } from '../services/central-auth.service';
import { verifyAccessToken } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      accountPayload?: {
        userId: string;
        accountType: AccountType;
        email: string;
        role?: string;
        department?: string;
        allowedApps?: string[];
        permissions?: string[];
        businessId?: string;
        tenantId?: string;
      };
      user?: { uid: string; email: string; type: string; businessId?: string; tenantId?: string };
    }
  }
}

export function centralJwtMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/unauthorized' });
    return;
  }

  const payload = verifyToken(token);
  if (payload) {
    req.accountPayload = payload;
    req.user = {
      uid: payload.userId,
      email: payload.email,
      type: payload.role ?? payload.accountType,
      businessId: payload.businessId,
      tenantId: payload.tenantId,
    };
    next();
    return;
  }

  // Fallback to legacy JWT for backward compatibility (old client tokens, legacy super_admin)
  const legacy = verifyAccessToken(token);
  if (legacy) {
    const accountType: AccountType = legacy.type === 'super_admin' ? 'ADMIN' : 'CLIENT';
    req.accountPayload = {
      userId: legacy.uid,
      accountType,
      email: legacy.email,
      role: legacy.type,
      businessId: legacy.businessId,
      tenantId: legacy.tenantId,
    };
    req.user = legacy;
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid or expired token', code: 'auth/token-expired' });
}
