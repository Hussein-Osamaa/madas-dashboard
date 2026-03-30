# Cloudflare CDN Setup Guide for XDIGIX

## 1. DNS Configuration

### xdigix.com (main domain)
1. Go to Cloudflare Dashboard > DNS
2. Add A record: `xdigix.com` → Railway IP (or CNAME to Railway URL)
3. Add CNAME: `www` → `xdigix.com`
4. Add CNAME: `*` → Railway deployment URL (wildcard for *.xdigix.com subdomains)
5. Ensure all records have the **orange cloud (Proxied)** enabled

### Custom domains (e.g. addict-eg.com)
- Each custom domain needs its own Cloudflare zone OR DNS CNAME pointing to `xdigix-os-production.up.railway.app`

## 2. SSL/TLS
- Go to SSL/TLS > Overview
- Set mode to **Full (strict)**
- Enable **Always Use HTTPS**
- Enable **Automatic HTTPS Rewrites**

## 3. Caching Rules

### Page Rules (or Cache Rules)
Create these rules in order:

1. **API bypass** — `*xdigix.com/api/*`
   - Cache Level: **Bypass**
   - Reason: API responses are dynamic, per-user

2. **Static assets** — `*xdigix.com/storage/*`
   - Cache Level: **Cache Everything**
   - Edge TTL: **1 month**
   - Browser TTL: **1 year**
   - Reason: Images are immutable (hash-based filenames)

3. **Storefront pages** — `*xdigix.com/*`
   - Cache Level: **Standard**
   - Edge TTL: **Respect Existing Headers** (uses s-maxage=300 from backend)
   - Reason: HTML pages cached for 5 minutes, SWR for seamless updates

### Already configured in backend:
- HTML pages: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Product API: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`
- Static files: `Cache-Control: public, max-age=31536000, immutable`
- S3/R2 uploads: `Cache-Control: public, max-age=31536000, immutable`

## 4. Speed Optimizations

### Enable in Cloudflare Dashboard:
- **Speed > Optimization > Content Optimization**
  - Auto Minify: HTML, CSS, JS
  - Brotli: **ON** (Cloudflare compresses at edge, even if origin sends gzip)
  - Early Hints: **ON** (103 responses for preloading)
  - Rocket Loader: **OFF** (can break storefront runtime JS)

- **Speed > Optimization > Image Optimization**
  - Polish: **Lossless** (free optimization on top of our WebP)
  - WebP: **ON** (Cloudflare serves WebP to supported browsers)

## 5. Cache Purge Strategy

### On site publish:
Call Cloudflare API to purge the site's URLs:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://addict.xdigix.com/","https://addict.xdigix.com/products"]}'
```

### On product update:
Purge product-related pages:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  --data '{"prefixes":["https://addict.xdigix.com/products"]}'
```

### Emergency full purge:
```bash
curl -X POST ".../purge_cache" --data '{"purge_everything":true}'
```

## 6. Cloudflare R2 (Already Configured)

The platform uses Cloudflare R2 for image storage:
- **Bucket**: configured via `S3_BUCKET` env var
- **Public URL**: configured via `S3_PUBLIC_URL` env var
- **Cache headers**: `public, max-age=31536000, immutable` (set on upload)
- **Multi-size variants**: Images uploaded in 3 sizes (400w, 800w, 2048w)

R2 is S3-compatible, so the same SDK works:
```env
S3_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=madas-storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://pub-{hash}.r2.dev
```

## 7. Security Headers (via Cloudflare)

Already handled by Helmet.js in the backend:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

Optional Cloudflare additions:
- **Security > WAF** — Enable managed rules (free tier includes basic protection)
- **Security > Bot Fight Mode** — ON (blocks known bad bots)
- **Security > DDoS** — Automatic (Cloudflare default)

## 8. Performance Monitoring

- **Analytics > Web Analytics** — Free, no-JS analytics
- **Speed > Observatory** — Run Lighthouse tests from Cloudflare
- Check Core Web Vitals: LCP, FID, CLS

## Summary

| Layer | Cache TTL | Location |
|-------|-----------|----------|
| Browser | 0 (HTML) / 1y (static) | Client |
| Cloudflare Edge | 5min (HTML) / 1mo (static) | CDN |
| Application (Redis) | 30-300s (API responses) | Server |
| MongoDB | - | Database |
