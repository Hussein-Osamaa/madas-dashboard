import { cacheGet, cacheSet, cacheDel } from '../../lib/cache';
import { createLogger } from '../../lib/logger';

const log = createLogger('render-cache');
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Build Redis key for a rendered page artifact */
function artifactKey(siteId: string, version: number, pageSlug = 'home'): string {
  return `site:${siteId}:v${version}:${pageSlug}`;
}

export const renderCache = {
  /** Store a rendered HTML artifact in Redis */
  async set(siteId: string, version: number, pageSlug: string, html: string): Promise<boolean> {
    const key = artifactKey(siteId, version, pageSlug);
    try {
      await cacheSet(key, html, TTL_SECONDS);
      log.info(`Artifact stored: ${key} (${html.length} bytes)`);
      return true;
    } catch (err) {
      log.error(`Failed to store artifact: ${key}`, { error: (err as Error).message });
      return false;
    }
  },

  /** Retrieve a rendered HTML artifact from Redis */
  async get(siteId: string, version: number, pageSlug = 'home'): Promise<string | null> {
    const key = artifactKey(siteId, version, pageSlug);
    return cacheGet<string>(key);
  },

  /** Invalidate all artifacts for a site (all versions, all pages) */
  async invalidate(siteId: string): Promise<void> {
    await cacheDel(`site:${siteId}:*`);
    log.info(`Artifacts invalidated for site: ${siteId}`);
  },

  /** Invalidate artifacts for a specific version */
  async invalidateVersion(siteId: string, version: number): Promise<void> {
    await cacheDel(`site:${siteId}:v${version}:*`);
  },
};
