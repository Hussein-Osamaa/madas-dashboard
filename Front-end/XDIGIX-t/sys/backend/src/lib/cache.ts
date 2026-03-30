/**
 * Redis caching layer with graceful fallback.
 *
 * When REDIS_URL is set, provides get/set/del operations with TTL.
 * When not set, all operations are no-ops — the app works without Redis.
 *
 * Usage:
 *   import { cacheGet, cacheSet, cacheDel } from '../lib/cache';
 *   const cached = await cacheGet<ProductList>(key);
 *   if (cached) return res.json(cached);
 *   // ... compute result ...
 *   await cacheSet(key, result, 60); // 60s TTL
 */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
  });
  redis.connect().then(() => {
    console.log('[cache] Redis connected');
  }).catch((err) => {
    console.warn('[cache] Redis unavailable, running without cache:', err.message);
    redis = null;
  });
}

/** Get a cached value by key. Returns null if miss or Redis unavailable. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) as T : null;
  } catch {
    return null;
  }
}

/** Set a cached value with TTL in seconds. No-op if Redis unavailable. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch { /* swallow — cache is best-effort */ }
}

/** Delete keys matching a pattern. Uses SCAN for safety (no KEYS in prod). */
export async function cacheDel(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch { /* swallow */ }
}

/** Check if Redis is connected. */
export function isCacheAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}
