import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorMiddleware(err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode ?? 500;
  const isProd = config.nodeEnv === 'production';

  // Production: only log message (no stack traces in logs to avoid leaking internals)
  if (isProd) {
    console.error(`[Error] ${statusCode} ${req.method} ${req.path}: ${err.message}`);
  } else {
    console.error('[Error]', err);
  }

  // Response: never expose internal details in production
  const response: Record<string, unknown> = {
    error: isProd ? (statusCode < 500 ? err.message : 'Internal server error') : err.message,
  };

  // Include error code if safe (e.g., PLAN_LIMIT_EXCEEDED, ORDER_VALIDATION_FAILED)
  if (err.code) response.code = err.code;

  // Stack trace only in development
  if (!isProd && err.stack) response.stack = err.stack;

  res.status(statusCode).json(response);
}
