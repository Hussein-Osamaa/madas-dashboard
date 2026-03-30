/**
 * Per-account brute-force protection.
 *
 * Tracks failed login attempts per email address. After MAX_ATTEMPTS
 * consecutive failures, the account is temporarily locked for LOCKOUT_MS.
 * Successful logins reset the counter.
 *
 * Uses an in-memory Map (sufficient for single-instance Railway deployment).
 * For multi-instance, swap to Redis.
 */
import { Request, Response, NextFunction } from 'express';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up old entries every 5 minutes

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.lastAttempt > LOCKOUT_MS * 2) {
      attempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Middleware: check if the email is currently locked out.
 * Attach to login routes BEFORE the handler.
 */
export function bruteForceCheck(req: Request, res: Response, next: NextFunction): void {
  const email = (req.body?.email || '').toLowerCase().trim();
  if (!email) { next(); return; }

  const record = attempts.get(email);
  if (!record) { next(); return; }

  const now = Date.now();
  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      code: 'auth/account-locked',
      retryAfter,
    });
    return;
  }

  // Lockout expired, reset
  if (record.count >= MAX_ATTEMPTS && record.lockedUntil <= now) {
    attempts.delete(email);
  }

  next();
}

/**
 * Record a failed login attempt for an email.
 * Call this in the login handler when credentials are invalid.
 */
export function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, lastAttempt: 0, lockedUntil: 0 };

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  attempts.set(key, record);
}

/**
 * Reset the attempt counter on successful login.
 */
export function resetAttempts(email: string): void {
  attempts.delete(email.toLowerCase().trim());
}
