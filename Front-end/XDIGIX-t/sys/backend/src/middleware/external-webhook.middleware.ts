/**
 * Webhook: verify HMAC-SHA256 signature and optional replay protection (timestamp).
 * Expects raw body to be on req.rawBody (set by express.raw or custom middleware).
 * Fail closed: reject missing or invalid signature; reject stale timestamps.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../utils/webhook-signature';
import { config } from '../config';
import { logger } from '../utils/logger';

const SIGNATURE_HEADER = 'x-webhook-signature';
const TIMESTAMP_HEADER = 'x-webhook-timestamp';
const TOLERANCE_SEC = config.externalApi.webhookTimestampToleranceSec;

export function externalWebhookMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const tenantId = req.externalContext?.tenantId;

  const signature = req.headers[SIGNATURE_HEADER] ?? req.headers['x-signature'];
  const rawBody = (req as Request & { rawBody?: Buffer | string }).rawBody ?? req.body;

  if (signature === undefined || signature === null) {
    logger.warn('External webhook: missing signature header', { requestId, tenantId });
    res.status(401).json({ error: 'Unauthorized', code: 'external/missing_signature' });
    return;
  }

  const secret = req.externalTenant?.webhookSecret;
  if (!secret || !req.externalTenant?.webhookEnabled) {
    logger.warn('External webhook: tenant webhook not enabled', { requestId, tenantId });
    res.status(403).json({ error: 'Webhook not enabled', code: 'external/webhook_disabled' });
    return;
  }

  const payload = typeof rawBody === 'string' ? rawBody : (Buffer.isBuffer(rawBody) ? rawBody : JSON.stringify(req.body ?? {}));
  const isValid = verifyWebhookSignature(payload, secret, Array.isArray(signature) ? signature[0] : signature);
  if (!isValid) {
    logger.warn('External webhook: invalid signature', { requestId, tenantId });
    res.status(401).json({ error: 'Unauthorized', code: 'external/invalid_signature' });
    return;
  }

  const tsHeader = req.headers[TIMESTAMP_HEADER];
  const tsStr = Array.isArray(tsHeader) ? tsHeader[0] : tsHeader;
  if (tsStr && typeof tsStr === 'string') {
    const ts = parseInt(tsStr.trim(), 10);
    if (Number.isNaN(ts)) {
      res.status(400).json({ error: 'Invalid timestamp', code: 'external/invalid_timestamp' });
      return;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > TOLERANCE_SEC) {
      logger.warn('External webhook: timestamp outside tolerance (replay?)', { requestId, tenantId });
      res.status(401).json({ error: 'Request expired or timestamp invalid', code: 'external/replay_or_expired' });
      return;
    }
  }

  next();
}
