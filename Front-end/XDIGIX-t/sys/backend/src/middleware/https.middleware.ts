/**
 * Enforce HTTPS in production for external API routes.
 * Fail closed: reject non-HTTPS requests when requireHttps is true.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function requireHttpsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.externalApi.requireHttps) {
    next();
    return;
  }
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  if (proto === 'https') {
    next();
    return;
  }
  res.status(403).json({
    error: 'HTTPS required',
    code: 'external/https_required',
  });
}
