/**
 * Capture raw body for webhook signature verification.
 * Must run before express.json(). Captures raw bytes for matched paths
 * AND parses them into req.body so downstream handlers work normally.
 */

import { Request, Response, NextFunction } from 'express';

const WEBHOOK_PATH_REGEX = /^\/api\/(external\/[^/]+\/webhook|payments\/stripe\/webhook|onboarding\/webhooks\/stripe)\/?$/;

export function rawBodyWebhookMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'POST' || !WEBHOOK_PATH_REGEX.test(req.path)) {
    next();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    (req as Request & { rawBody: Buffer }).rawBody = raw;

    // Also parse into req.body so express.json() skip doesn't break downstream handlers
    try {
      const text = raw.toString('utf-8');
      if (text) {
        (req as Record<string, unknown>).body = JSON.parse(text);
      }
    } catch {
      // Non-JSON body — leave req.body as-is
    }

    next();
  });
  req.on('error', (err) => {
    next(err);
  });
}
