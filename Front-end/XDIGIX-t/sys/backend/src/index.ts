import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { connectDb } from './db';
import { setupRealtime } from './realtime';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import './services/orderInventoryIntegration'; // Registers order->inventory event handlers
import { startReportCrons } from './cron/reportCron';

async function main() {
  await connectDb();
  startReportCrons();

  const app = express();
  const httpServer = createServer(app);

  setupRealtime(httpServer);

  app.use(cors({ origin: config.cors.origin }));
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

  httpServer.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
