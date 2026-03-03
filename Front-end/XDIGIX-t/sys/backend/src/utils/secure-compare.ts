/**
 * Constant-time string comparison to prevent timing attacks.
 * Use for signature and token comparison only.
 */

import { timingSafeEqual } from 'crypto';

/**
 * Compare two strings in constant time.
 * Returns false if lengths differ or bytes differ.
 * Both inputs must be strings; encoding is UTF-8. For raw buffers use timingSafeEqual directly.
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still run a dummy compare to avoid length leakage (optional, depends on threat model)
    timingSafeEqual(Buffer.alloc(bufA.length, 0), Buffer.alloc(bufB.length, 0));
    return false;
  }
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
