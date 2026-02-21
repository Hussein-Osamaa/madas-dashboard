import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorMiddleware(err: Error & { statusCode?: number }, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode ?? 500;
  const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;

  console.error('[Error]', err);

  res.status(statusCode).json({
    error: message,
    ...(config.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}
