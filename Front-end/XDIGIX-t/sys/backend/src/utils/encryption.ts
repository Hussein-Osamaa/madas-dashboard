/**
 * AES-256-GCM encryption/decryption for sensitive credentials (e.g. Zammit passwords).
 * Key sourced from ZAMMIT_ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 * Format: iv:authTag:ciphertext (all base64).
 */

import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = config.zammit.encryptionKey;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ZAMMIT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @returns `iv:authTag:ciphertext` (all base64-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt a value produced by `encrypt()`.
 * @param encrypted - format: `iv:authTag:ciphertext` (base64)
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format (expected iv:authTag:ciphertext)');
  }

  const key = getKey();
  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
