/**
 * Performance instrumentation middleware.
 *
 * Logs request duration for every HTTP request. Emits structured JSON
 * for production log aggregation. Flags slow requests (>1s) as warnings.
 */
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';

const log = createLogger('perf');

const SLOW_THRESHOLD_MS = 1000;

export function perfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1e6);
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode;
    const requestId = (req as Record<string, unknown>).requestId as string || '';
    const tenantId = (req as Record<string, unknown>).tenantId as string || '';

    const entry = {
      method,
      route,
      status: String(status),
      durationMs: String(durationMs),
      requestId,
      tenantId,
    };

    if (durationMs > SLOW_THRESHOLD_MS) {
      log.warn(`Slow request: ${method} ${route} ${durationMs}ms`, entry);
    } else if (process.env.PERF_LOG_ALL === 'true') {
      log.info(`${method} ${route} ${durationMs}ms`, entry);
    }
  });

  next();
}
