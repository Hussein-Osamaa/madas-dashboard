/**
 * Capture raw body for webhook signature verification.
 * Must run before express.json(). Only runs for POST /api/external/:tenantId/webhook.
 */

import { Request, Response, NextFunction } from 'express';

const WEBHOOK_PATH_REGEX = /^\/api\/external\/[^/]+\/webhook\/?$/;

export function rawBodyWebhookMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'POST' || !WEBHOOK_PATH_REGEX.test(req.path)) {
    next();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', (err) => {
    next(err);
  });
}
