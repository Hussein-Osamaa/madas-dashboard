/**
 * Public website URL helpers.
 *
 * Default URL format: https://xdigix.com/[brand name]
 * where [brand name] is a URL slug derived from the site name.
 */
const DEFAULT_SITES_BASE_URL = 'https://xdigix.com';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * URL-friendly slug from site/brand name (e.g. "My Store" -> "my-store").
 */
export function slugifyBrandName(name: string): string {
  if (!name || typeof name !== 'string') return 'store';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'store';
}

/**
 * Base URL where published sites are served (e.g. https://xdigix.com).
 */
export function getSitesBaseUrl(): string {
  const fromEnv = (import.meta as any)?.env?.VITE_SITES_BASE_URL as string | undefined;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return stripTrailingSlashes(fromEnv.trim());
  }
  return DEFAULT_SITES_BASE_URL;
}

/**
 * Default published site URL.
 * - If slug is provided: https://xdigix.com/[slug]
 * - Otherwise (legacy): https://xdigix.com/site/[siteId]
 */
export function getDefaultPublishedSiteUrl(siteId: string, slug?: string | null): string {
  const base = getSitesBaseUrl();
  if (slug && slug.trim()) return `${base}/${slug.trim()}`;
  return `${base}/site/${siteId}`;
}

export function getCustomDomainUrl(domain: string): string {
  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/^www\./, '');
  return `https://${clean}`;
}

/**
 * Preferred public URL to show users.
 * - If a custom domain exists, show it (even if not yet active), because it’s what the user cares about.
 * - Otherwise show the default sites-hosting URL.
 */
export function getPreferredPublicUrl(siteId: string, customDomain?: string | null, slug?: string | null): string {
  if (customDomain) return getCustomDomainUrl(customDomain);
  return getDefaultPublishedSiteUrl(siteId, slug);
}


