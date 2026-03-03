/**
 * Multi-tenant external API authentication.
 * - Validates Authorization: Bearer <token>
 * - Resolves token to tenant from DB (or env); uses constant-time comparison.
 * - Attaches externalTenant and externalContext to req.
 * - Rejects missing/invalid token or unknown/disabled tenant (fail closed).
 */

import { Request, Response, NextFunction } from 'express';
import { getExternalTenantByApiToken } from '../services/external-credentials.service';
import { secureCompare } from '../utils/secure-compare';
import { logger } from '../utils/logger';

const BEARER_PREFIX = 'Bearer ';

export async function externalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const tenantIdParam = req.params.tenantId;

  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    logger.warn('External API: missing Authorization header', { requestId, tenantId: tenantIdParam });
    res.status(401).json({ error: 'Unauthorized', code: 'external/missing_auth' });
    return;
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    logger.warn('External API: invalid Authorization format', { requestId });
    res.status(401).json({ error: 'Unauthorized', code: 'external/invalid_auth_format' });
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', code: 'external/missing_token' });
    return;
  }

  const credentials = await getExternalTenantByApiToken(token);
  if (!credentials) {
    // Constant-time dummy compare to avoid timing leakage (token not in DB vs wrong token)
    secureCompare(token, 'x'.repeat(Math.min(token.length, 64)));
    logger.warn('External API: invalid or disabled token', { requestId, tenantId: tenantIdParam });
    res.status(401).json({ error: 'Unauthorized', code: 'external/invalid_token' });
    return;
  }

  if (!secureCompare(token, credentials.apiToken)) {
    logger.warn('External API: token mismatch', { requestId, tenantId: credentials.tenantId });
    res.status(401).json({ error: 'Unauthorized', code: 'external/invalid_token' });
    return;
  }

  if (tenantIdParam && tenantIdParam !== credentials.tenantId) {
    logger.warn('External API: tenantId path does not match token tenant', {
      requestId,
      pathTenantId: tenantIdParam,
      tokenTenantId: credentials.tenantId,
    });
    res.status(403).json({ error: 'Forbidden', code: 'external/tenant_mismatch' });
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
