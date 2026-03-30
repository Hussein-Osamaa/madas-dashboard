/**
 * CSRF protection via Origin header validation.
 *
 * For state-changing requests (POST, PUT, PATCH, DELETE), verifies that
 * the Origin header is present and matches the CORS allowlist. This
 * prevents cross-site request forgery since browsers always send the
 * Origin header on cross-origin requests and it cannot be spoofed by JS.
 *
 * Exceptions:
 *  - GET/HEAD/OPTIONS (safe methods)
 *  - /api/public/* routes (storefront API — no auth, uses cart tokens)
 *  - /api/external/* routes (uses HMAC signature verification)
 *  - Requests with no Origin AND no Referer (server-to-server / curl)
 */
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths that bypass CSRF (public storefront API, external webhooks)
const CSRF_EXEMPT_PREFIXES = ['/api/public/', '/api/external/'];

const KNOWN_ORIGINS = [
  'https://xdigix-os.vercel.app',
  'https://xdigix-os-xdigix.vercel.app',
  'https://dist-xdigix.vercel.app',
  'https://xdigix.com',
  'https://www.xdigix.com',
];

function isAllowedOrigin(origin: string): boolean {
  if (KNOWN_ORIGINS.includes(origin)) return true;
  // Vercel preview deployments
  if (/^https:\/\/[a-z0-9-]+-xdigix\.vercel\.app$/.test(origin)) return true;
  // xdigix.com subdomains
  if (/^https:\/\/[a-z0-9-]+\.xdigix\.com$/.test(origin)) return true;
  // Localhost for dev
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) { next(); return; }

  // Skip exempt paths
  if (CSRF_EXEMPT_PREFIXES.some(p => req.path.startsWith(p))) { next(); return; }

  const origin = req.headers.origin as string | undefined;

  // If Origin header is present, validate it
  if (origin) {
    if (isAllowedOrigin(origin)) { next(); return; }
    res.status(403).json({ error: 'CSRF validation failed: origin not allowed', code: 'csrf/invalid-origin' });
    return;
  }

  // No Origin header — allow if it looks like a same-origin request or server-to-server
  // (Browsers always send Origin on cross-origin POST; absence means same-origin or non-browser)
  const referer = req.headers.referer as string | undefined;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (isAllowedOrigin(refOrigin)) { next(); return; }
    } catch { /* invalid referer URL */ }
    res.status(403).json({ error: 'CSRF validation failed: referer not allowed', code: 'csrf/invalid-referer' });
    return;
  }

  // No Origin, no Referer — likely server-to-server (curl, Postman, webhooks)
  // Allow if the request has a valid Authorization header (JWT)
  if (req.headers.authorization) { next(); return; }

  // Block unauthenticated requests with no origin info
  res.status(403).json({ error: 'CSRF validation failed: missing origin', code: 'csrf/missing-origin' });
}
