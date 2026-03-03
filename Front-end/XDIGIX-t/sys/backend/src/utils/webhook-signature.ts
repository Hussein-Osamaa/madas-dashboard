/**
 * HMAC-SHA256 webhook signature verification.
 * Use webhookSecret per tenant; constant-time comparison.
 */

import { createHmac } from 'crypto';
import { secureCompare } from './secure-compare';

const ALGORITHM = 'sha256';
const PREFIX = 'sha256=';

/**
 * Compute expected HMAC-SHA256 signature of payload using secret.
 * Payload should be raw body (string or Buffer) as received.
 */
export function computeWebhookSignature(payload: string | Buffer, secret: string): string {
  const hmac = createHmac(ALGORITHM, secret);
  hmac.update(payload);
  return PREFIX + hmac.digest('hex');
}

/**
 * Verify that the provided signature matches the expected HMAC of payload.
 * Uses constant-time comparison. Returns false if signature is missing, malformed, or invalid.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  secret: string,
  signatureHeader: string | undefined
): boolean {
  if (!signatureHeader || typeof signatureHeader !== 'string' || !secret) {
    return false;
  }
  const expected = computeWebhookSignature(payload, secret);
  return secureCompare(signatureHeader.trim(), expected);
}
