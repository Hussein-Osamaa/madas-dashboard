/**
 * Per-tenant rate limiting for external API.
 * Uses in-memory store (Map); for multi-instance use Redis in production.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface WindowCount {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowCount>();
const WINDOW_MS = config.externalApi.rateLimitWindowMs;
const MAX_PER_TENANT = config.externalApi.rateLimitPerTenant;

function getKey(tenantId: string): string {
  return `external:${tenantId}`;
}

function getOrCreateWindow(key: string): WindowCount {
  const now = Date.now();
  const existing = store.get(key);
  if (existing && now < existing.resetAt) {
    return existing;
  }
  const window: WindowCount = { count: 0, resetAt: now + WINDOW_MS };
  store.set(key, window);
  return window;
}

export function externalRateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.externalContext?.tenantId ?? req.params.tenantId;
  if (!tenantId) {
    next();
    return;
  }

  const key = getKey(tenantId);
  const window = getOrCreateWindow(key);

  if (Date.now() >= window.resetAt) {
    window.count = 0;
    window.resetAt = Date.now() + WINDOW_MS;
  }

  window.count += 1;

  res.setHeader('X-RateLimit-Limit', String(MAX_PER_TENANT));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MAX_PER_TENANT - window.count)));

  if (window.count > MAX_PER_TENANT) {
    res.status(429).json({
      error: 'Too many requests',
      code: 'external/rate_limited',
      retryAfter: Math.ceil((window.resetAt - Date.now()) / 1000),
    });
    return;
  }

  next();
}
