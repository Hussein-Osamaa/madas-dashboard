import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { rawBodyWebhookMiddleware } from './middleware/raw-body-webhook.middleware';
import './types/external-api.types'; // Express Request augmentation for external API
import './services/orderInventoryIntegration'; // Registers order->inventory event handlers
import {
  renderSite,
  renderAllProductsPage,
  renderProductDetailPage,
} from './modules/sites/services/site-renderer.service';
import { Site } from './schemas/site.schema';
import { Domain } from './schemas/domain.schema';
import { Business } from './schemas/business.schema';
import { FirestoreDoc } from './schemas/document.schema';

/**
 * Create the Express app (no HTTP listen, no Socket.io, no cron).
 * Used by both the traditional server (index.ts) and Vercel serverless (api/index.ts).
 */
export function createApp(): Express {
  const app = express();

  const KNOWN_ORIGINS = [
    'https://xdigix-os.vercel.app',
    'https://xdigix-os-xdigix.vercel.app',
    'https://dist-xdigix.vercel.app',
    'https://xdigix.com',
    'https://www.xdigix.com',
  ];
  const envOrigins = (config.cors.origin || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .filter((o: string) => o !== '*'); // never allow wildcard in CORS list
  const allowedOrigins = [...new Set([...KNOWN_ORIGINS, ...envOrigins])];

  // 1. Security headers (helmet sets X-Content-Type-Options, X-Frame-Options,
  //    Strict-Transport-Security, X-XSS-Protection, and more in one call)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow static file CDN serving
      contentSecurityPolicy: false, // CSP managed at hosting layer (Firebase/Vercel)
    })
  );

  // 2. CORS — strict origin allowlist; credentials only for matched origins
  app.use(
    cors({
      origin: (incoming, callback) => {
        // Server-to-server requests (no Origin header) — block, don't open to all
        if (!incoming) {
          callback(null, false);
          return;
        }
        if (allowedOrigins.includes(incoming)) {
          callback(null, incoming);
          return;
        }
        // Allow any Vercel preview/production deployment under the xdigix team
        if (
          /^https:\/\/[a-z0-9-]+-xdigix\.vercel\.app$/.test(incoming) ||
          /^https:\/\/[a-z0-9-]+-xdigix\.vercel\.app$/.test(incoming.replace(/\/$/, ''))
        ) {
          callback(null, incoming);
          return;
        }
        // Allow any *.xdigix.com subdomain (published storefront sites)
        if (/^https:\/\/[a-z0-9-]+\.xdigix\.com$/.test(incoming)) {
          callback(null, incoming);
          return;
        }
        // Allow localhost / 127.0.0.1 / LAN IPs on any port for local frontend dev
        if (
          incoming.startsWith('http://localhost:') ||
          incoming.startsWith('http://127.0.0.1:') ||
          /^http:\/\/(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(incoming)
        ) {
          callback(null, incoming);
          return;
        }
        callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // 3. Rate limiting BEFORE body parsing — prevents large-payload DoS before parsing cost
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // 4. Capture raw body for external webhook signature verification (must run before json parser)
  app.use(rawBodyWebhookMiddleware);

  // 5. Body parsing
  app.use(express.json({ limit: '10mb' }));

  // 6. Gzip/brotli compression for all responses
  app.use(compression());

  app.use('/api', routes);

  // Serve locally-uploaded files (development fallback when S3 is not configured).
  // Creates the directory on first request if absent so the route is always mounted.
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use(
    '/storage/files',
    express.static(uploadDir, {
      maxAge: '1y',
      immutable: true,
      // Security: never serve index listings
      index: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  /* ── Shared helpers for product pages ──────────────────────────── */
  async function resolveStorefront(idOrSlug: string, bySlug = false) {
    return bySlug
      ? Site.findOne({ slug: idOrSlug, status: 'published' }).lean()
      : Site.findOne({ _id: idOrSlug }).lean();
  }

  async function fetchProducts(tenantId: string, page = 1, search = '', limit = 20) {
    const biz = await Business.findOne({ tenantId }).lean() as { businessId: string } | null;
    if (!biz) return { products: [], total: 0 };
    const filter: Record<string, unknown> = {
      businessId: biz.businessId,
      coll: 'products',
      'data.deleted': { $ne: true },
    };
    if (search) filter['data.name'] = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      FirestoreDoc.find(filter).skip(skip).limit(limit).lean(),
      FirestoreDoc.countDocuments(filter),
    ]);
    return {
      products: docs.map((d: any) => ({ id: d.docId, ...d.data })),
      total,
    };
  }

  async function fetchProduct(tenantId: string, productId: string) {
    const biz = await Business.findOne({ tenantId }).lean() as { businessId: string } | null;
    if (!biz) return null;
    const doc = await FirestoreDoc.findOne({
      businessId: biz.businessId,
      coll: 'products',
      docId: productId,
    }).lean() as { data?: Record<string, unknown>; docId?: string } | null;
    if (!doc) return null;
    return { id: doc.docId, ...doc.data };
  }

  function sendPage(res: Response, html: string) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.send(html);
  }

  // All-products page: /site/:id/products
  app.get('/site/:id/products', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.id);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const page   = Math.max(1, parseInt(req.query.page as string) || 1);
      const search = (req.query.search as string) || '';
      const { products, total } = await fetchProducts((site as any).tenantId, page, search);
      sendPage(res, renderAllProductsPage(site as any, products, total, page));
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // Product detail page: /site/:id/products/:productId
  app.get('/site/:id/products/:productId', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.id);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const product = await fetchProduct((site as any).tenantId, req.params.productId);
      if (!product) { res.status(404).send('<h1>404 — Product not found</h1>'); return; }
      sendPage(res, renderProductDetailPage(site as any, product));
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // All-products page: /:slug/products
  app.get('/:slug([a-z0-9-]+)/products', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.slug, true);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const page   = Math.max(1, parseInt(req.query.page as string) || 1);
      const search = (req.query.search as string) || '';
      const { products, total } = await fetchProducts((site as any).tenantId, page, search);
      sendPage(res, renderAllProductsPage(site as any, products, total, page));
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // Product detail page: /:slug/products/:productId
  app.get('/:slug([a-z0-9-]+)/products/:productId', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.slug, true);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const product = await fetchProduct((site as any).tenantId, req.params.productId);
      if (!product) { res.status(404).send('<h1>404 — Product not found</h1>'); return; }
      sendPage(res, renderProductDetailPage(site as any, product));
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // Storefront sub-pages: cart, favorites, account (by site ID)
  app.get('/site/:id/:page(cart|favorites|account)', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.id);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const html = renderSite(site as any, req.params.page);
      sendPage(res, html);
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // Storefront sub-pages: cart, favorites, account (by slug)
  app.get('/:slug([a-z0-9-]+)/:page(cart|favorites|account)', async (req: Request, res: Response) => {
    try {
      const site = await resolveStorefront(req.params.slug, true);
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const html = renderSite(site as any, req.params.page);
      sendPage(res, html);
    } catch { res.status(500).send('<h1>Error</h1>'); }
  });

  // ── Subdomain-based storefront resolution ─────────────────────
  // Handles requests like madas.xdigix.com → find domain → serve site
  const SITE_ROOT_DOMAIN = process.env.SITE_ROOT_DOMAIN || 'xdigix.com';
  app.use(async (req: Request, res: Response, next) => {
    const host = (req.hostname || req.headers.host || '').split(':')[0]; // strip port
    // Only handle *.xdigix.com subdomains (not the root domain itself, not /api paths)
    if (!host.endsWith(`.${SITE_ROOT_DOMAIN}`) || req.path.startsWith('/api')) {
      return next();
    }
    const subdomain = host.replace(`.${SITE_ROOT_DOMAIN}`, '');
    if (!subdomain || subdomain === 'www' || subdomain === 'api' || subdomain === 'dashboard') {
      return next();
    }
    try {
      // Look up domain record OR slug-based site
      const domainRecord = await Domain.findOne({ domain: host, status: 'active' }).lean();
      let site: any = null;
      if (domainRecord) {
        site = await Site.findOne({ _id: domainRecord.siteId }).lean();
      } else {
        // Try by slug directly
        site = await Site.findOne({ slug: subdomain, status: 'published' }).lean();
      }
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }

      const sdOpts = { subdomain: true };
      // Handle storefront sub-pages under subdomain
      const subPage = req.path.match(/^\/(cart|favorites|account)$/)?.[1];
      if (subPage) {
        const html = renderSite(site, subPage, sdOpts);
        sendPage(res, html);
        return;
      }
      if (req.path === '/products' || req.path.startsWith('/products/')) {
        const productId = req.path.split('/products/')[1];
        if (productId) {
          const product = await fetchProduct(site.tenantId, productId);
          if (!product) { res.status(404).send('<h1>404 — Product not found</h1>'); return; }
          const html = renderProductDetailPage(site, product as any, sdOpts);
          sendPage(res, html);
          return;
        }
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const search = (req.query.search as string) || '';
        const { products, total } = await fetchProducts(site.tenantId, page, search);
        const html = renderAllProductsPage(site, products as any[], page, total, sdOpts);
        sendPage(res, html);
        return;
      }
      // Homepage
      const html = renderSite(site, undefined, sdOpts);
      sendPage(res, html);
    } catch (err) {
      res.status(500).send('<h1>Error rendering site</h1>');
    }
  });

  // Storefront: serve published site by ID at /site/:id
  // Also supports slug-based URLs: /:slug (matched after all /api routes)
  app.get('/site/:id', async (req: Request, res: Response) => {
    try {
      const site = await Site.findOne({ _id: req.params.id }).lean();
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const pageSlug = typeof req.query.page === 'string' ? req.query.page : undefined;
      const etag = `"${(site as any).updatedAt?.getTime?.().toString(36) ?? 'x'}"`;
      if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
      const html = renderSite(site as any, pageSlug);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.send(html);
    } catch (err) {
      res.status(500).send('<h1>Error rendering site</h1>');
    }
  });

  // Slug-based storefront URLs: /:slug
  app.get('/:slug([a-z0-9-]+)', async (req: Request, res: Response) => {
    try {
      const site = await Site.findOne({ slug: req.params.slug, status: 'published' }).lean();
      if (!site) { res.status(404).send('<h1>404 — Site not found</h1>'); return; }
      const pageSlug = typeof req.query.page === 'string' ? req.query.page : undefined;
      const etag = `"${(site as any).updatedAt?.getTime?.().toString(36) ?? 'x'}"`;
      if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
      const html = renderSite(site as any, pageSlug);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.send(html);
    } catch (err) {
      res.status(404).send('<h1>404 — Not found</h1>');
    }
  });

  app.use(errorMiddleware);

  return app;
}
