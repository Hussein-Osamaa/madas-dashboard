/**
 * Warehouse middleware: requireTenant, requireWarehouseStaff, requireClientRole
 */
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

/**
 * Extract clientId exclusively from the authenticated JWT payload (req.clientId / req.businessId).
 * We deliberately do NOT fall back to query params or request body to prevent
 * authenticated users from accessing other tenants' data by spoofing clientId.
 *
 * Routes that serve warehouse staff (who act on behalf of any client) must supply
 * clientId via a separate super-admin check, not through this middleware.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
    return;
  }
  const clientId = req.clientId ?? req.businessId;
  if (!clientId || typeof clientId !== 'string') {
    res.status(400).json({ error: 'Client/tenant required', code: 'warehouse/client-required' });
    return;
  }
  req.clientId = clientId;
  next();
}

/** Require warehouse_staff or internal_staff or super_admin role. */
export function requireWarehouseStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
    return;
  }
  const type = req.user.type;
  const allowed = ['warehouse_staff', 'internal_staff', 'super_admin'];
  if (!allowed.includes(type)) {
    res.status(403).json({ error: 'Warehouse staff role required', code: 'warehouse/forbidden' });
    return;
  }
  next();
}

/** Require client role (client_owner, client_staff) for client dashboard read-only. */
export function requireClientRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
    return;
  }
  const type = req.user.type;
  const allowed = ['client_owner', 'client_staff', 'super_admin', 'internal_staff'];
  if (!allowed.includes(type)) {
    res.status(403).json({ error: 'Client access required', code: 'warehouse/forbidden' });
    return;
  }
  next();
}
