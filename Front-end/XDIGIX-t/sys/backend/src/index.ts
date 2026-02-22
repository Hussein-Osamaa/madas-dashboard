import { createServer } from 'http';
import { config } from './config';
import { connectDb } from './db';
import { setupRealtime } from './realtime';
import { createApp } from './app';
import { startReportCrons } from './cron/reportCron';

async function main() {
  await connectDb();
  startReportCrons();

  const app = createApp();
  const httpServer = createServer(app);

  setupRealtime(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
