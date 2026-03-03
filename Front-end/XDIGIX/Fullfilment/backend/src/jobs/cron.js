import 'dotenv/config';
import cron from 'node-cron';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runMonthlyReportsForAllClients, runYearlyReportsForAllClients } from '../services/reportService.js';

async function main() {
  await connectDB();

  // At 00:05 on the 1st day of every month
  cron.schedule('5 0 1 * *', async () => {
    console.log('[Cron] Running monthly reports...');
    await runMonthlyReportsForAllClients();
    console.log('[Cron] Monthly reports done.');
  });

  // Jan 1 at 00:10
  cron.schedule('10 0 1 1 *', async () => {
    console.log('[Cron] Running yearly reports...');
    await runYearlyReportsForAllClients();
    console.log('[Cron] Yearly reports done.');
  });

  console.log('Cron jobs scheduled: monthly (1st 00:05), yearly (Jan 1 00:10)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
