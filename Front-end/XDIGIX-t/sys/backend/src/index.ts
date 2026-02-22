import { createServer, IncomingMessage, ServerResponse } from 'http';
import { config } from './config';
import { connectDb } from './db';
import { setupRealtime } from './realtime';
import { createApp } from './app';
import { startReportCrons } from './cron/reportCron';

const DEFAULT_ORIGIN = 'https://xdigix-os.vercel.app';

function corsHeaders(req?: IncomingMessage) {
  const env = process.env.CORS_ORIGIN;
  const origin = (env && env.trim()) || (req?.headers?.origin as string) || DEFAULT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Vercel serverless handler ───────────────────────────────────────────────
// Vercel loads this file via "main" in package.json; it needs module.exports.
let dbReady: Promise<void> | null = null;
let appFn: ReturnType<typeof createApp> | null = null;

async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();
  const headers = corsHeaders(req);

  if (method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  Object.entries(headers).forEach(([k, v]) => { try { res.setHeader(k, v); } catch {} });

  try {
    if (!dbReady) dbReady = connectDb();
    await dbReady;
    if (!appFn) appFn = createApp();
    await new Promise<void>((resolve, reject) => {
      appFn!(req, res);
      res.once('finish', resolve);
      res.once('error', reject);
    });
  } catch (err: unknown) {
    console.error('[Vercel handler]', err);
    if (!res.headersSent) {
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Server error' }));
  }
}

// Export for Vercel (CommonJS — tsc outputs module: commonjs)
module.exports = vercelHandler;
// Also default export so `import` works
export default vercelHandler;

// ── Traditional long-lived server (local / Railway / Render) ────────────────
// Only start listening when NOT running inside Vercel/Lambda (no AWS_LAMBDA_FUNCTION_NAME)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL) {
  (async () => {
    try {
      await connectDb();
      startReportCrons();

      const app = createApp();
      const httpServer = createServer(app);
      setupRealtime(httpServer);

      httpServer.listen(config.port, () => {
        console.log(`[Server] Listening on port ${config.port}`);
      });
    } catch (err) {
      console.error('[Server] Fatal error:', err);
      process.exit(1);
    }
  })();
}
