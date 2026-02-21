import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

export function requireClientId(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.clientId ?? req.businessId ?? req.body?.clientId ?? req.query?.clientId ?? req.params?.clientId;
  const id = typeof clientId === 'string' ? clientId : Array.isArray(clientId) ? String(clientId[0]) : '';
  if (!id || id === 'undefined') {
    res.status(400).json({ error: 'Client ID required', code: 'client-required' });
    return;
  }
  req.clientId = id;
  next();
}

export function requireWarehouseStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const allowed = ['warehouse_staff', 'internal_staff', 'super_admin'];
  if (!allowed.includes(req.user.type)) {
    res.status(403).json({ error: 'Warehouse staff role required' });
    return;
  }
  next();
}

export function requireClientRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const allowed = ['client_owner', 'client_staff', 'super_admin', 'internal_staff'];
  if (!allowed.includes(req.user.type)) {
    res.status(403).json({ error: 'Client access required' });
    return;
  }
  next();
}
