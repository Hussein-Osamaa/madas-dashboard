import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import './services/orderInventoryIntegration'; // Registers order->inventory event handlers

/**
 * Create the Express app (no HTTP listen, no Socket.io, no cron).
 * Used by both the traditional server (index.ts) and Vercel serverless (api/index.ts).
 */
export function createApp(): Express {
  const app = express();

  const KNOWN_ORIGINS = [
    'https://xdigix-os.vercel.app',
    'https://xdigix-os-xdigix.vercel.app',
  ];
  const envOrigins = (config.cors.origin || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const allowedOrigins = [...new Set([...KNOWN_ORIGINS, ...envOrigins])];

  app.use(
    cors({
      origin: (incoming, callback) => {
        if (
          !incoming ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(incoming)
        ) {
          callback(null, incoming || '*');
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
    })
  );

  app.use('/api', routes);

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadDir)) {
    app.use('/storage/files', express.static(uploadDir));
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use(errorMiddleware);

  return app;
}
