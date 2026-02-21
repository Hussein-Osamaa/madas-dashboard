/**
 * Application Access Guard
 * requireAccountType + requireApp for warehouse portal and other apps.
 */
import { Request, Response, NextFunction } from 'express';
import type { AccountType } from '../services/central-auth.service';

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
        businessId?: string;
        tenantId?: string;
      };
    }
  }
}

/** Require specific account type. Use after jwt middleware that sets req.accountPayload. */
export function requireAccountType(accountType: AccountType | AccountType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = req.accountPayload;
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
      return;
    }
    const allowed: AccountType[] = Array.isArray(accountType) ? accountType : [accountType];
    if (!(allowed as string[]).includes(payload.accountType)) {
      res.status(403).json({
        error: 'Access denied',
        code: 'auth/wrong-account-type',
        message: `Requires ${allowed.join(' or ')} account`,
      });
      return;
    }
    next();
  };
}

/** Require allowedApps to include the app. For STAFF only. */
export function requireApp(app: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = req.accountPayload;
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
      return;
    }
    if (payload.accountType !== 'STAFF') {
      res.status(403).json({ error: 'App access is for staff accounts only', code: 'auth/staff-required' });
      return;
    }
    const apps = payload.allowedApps || [];
    if (!apps.includes(app)) {
      res.status(403).json({
        error: 'Access denied',
        code: 'auth/app-not-allowed',
        message: `Your account does not have access to ${app}`,
      });
      return;
    }
    next();
  };
}
