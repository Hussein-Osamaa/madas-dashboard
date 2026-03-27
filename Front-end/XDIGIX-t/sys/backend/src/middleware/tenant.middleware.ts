import { Request, Response, NextFunction } from 'express';
import { User } from '../schemas/user.schema';
import { Business } from '../schemas/business.schema';
import { getEffectiveTenantId } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      businessId?: string;
    }
  }
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'auth/required' });
    return;
  }

  const { uid, type, businessId: jwtBusinessId, tenantId: jwtTenantId } = req.user;

  // Super admins can access all tenants (for admin panel)
  if (type === 'super_admin') {
    req.tenantId = req.query.tenantId as string || jwtTenantId || undefined;
    req.businessId = req.query.businessId as string || jwtBusinessId || undefined;
    next();
    return;
  }

  let effectiveTenant = await getEffectiveTenantId(uid);
  // Fallback: use tenant from JWT if DB lookup missed (e.g. token already has tenant from re-login)
  if (!effectiveTenant && (jwtTenantId || jwtBusinessId)) {
    if (jwtTenantId) {
      effectiveTenant = jwtTenantId;
    } else if (jwtBusinessId) {
      const biz = await Business.findOne({ businessId: jwtBusinessId }).select('tenantId').lean();
      effectiveTenant = (biz as { tenantId?: string } | null)?.tenantId ?? null;
    }
  }
  if (!effectiveTenant) {
    res.status(403).json({ error: 'No tenant associated', code: 'auth/no-tenant' });
    return;
  }

  req.tenantId = effectiveTenant;
  req.businessId = jwtBusinessId;

  // If businessId in path/query, verify it belongs to tenant (or resolve for support mode)
  const pathBusinessId = req.params.businessId || req.query.businessId as string;
  if (pathBusinessId) {
    const business = await Business.findOne({ businessId: pathBusinessId }).lean();
    if (!business && type !== 'super_admin') {
      res.status(403).json({ error: 'Access denied to business', code: 'auth/forbidden' });
      return;
    }
    if (business) {
      const bizTenant = (business as { tenantId?: string }).tenantId;
      // In support mode the JWT tenant may differ from the client's — adopt the business tenant
      if (bizTenant && bizTenant !== effectiveTenant) {
        req.tenantId = bizTenant;
      }
    }
    req.businessId = pathBusinessId;
  }

  next();
}
