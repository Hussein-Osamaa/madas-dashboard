/**
 * Validates that :tenantId in path exists and has external API enabled.
 * Loads credentials and attaches to req; used for webhook route (no Bearer).
 * Fail closed: reject invalid or disabled tenant.
 */

import { Request, Response, NextFunction } from 'express';
import { getExternalTenantCredentials } from '../services/external-credentials.service';
import { logger } from '../utils/logger';

export async function externalTenantValidateMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const tenantId = req.params.tenantId;

  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    logger.warn('External API: missing tenantId', { requestId });
    res.status(400).json({ error: 'Bad request', code: 'external/missing_tenant_id' });
    return;
  }

  const credentials = await getExternalTenantCredentials(tenantId.trim());
  if (!credentials) {
    logger.warn('External API: tenant not found or disabled', { requestId, tenantId });
    res.status(404).json({ error: 'Tenant not found or integration disabled', code: 'external/invalid_tenant' });
    return;
  }

  req.externalTenant = credentials;
  req.externalContext = {
    requestId: requestId ?? '',
    tenantId: credentials.tenantId,
    businessId: credentials.tenantId,
  };
  next();
}
