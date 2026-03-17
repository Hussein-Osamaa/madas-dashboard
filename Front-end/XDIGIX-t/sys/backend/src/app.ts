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
import { renderSite } from './modules/sites/services/site-renderer.service';
import { Site } from './schemas/site.schema';

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
