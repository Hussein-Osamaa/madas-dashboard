/**
 * Report cron - monthly (1st 00:05), yearly (Jan 1 00:10).
 * Weekly is triggered after audit finish in the audit route.
 */
import cron from 'node-cron';
import { Business } from '../schemas/business.schema';
import { generateMonthlyReport, generateYearlyReport } from './report.service';
import { notifyReportCreated } from './notification.service';
import { InventoryReport } from '../schemas/warehouse';

export function startReportCrons(): void {
  cron.schedule('5 0 1 * *', async () => {
    const businesses = await Business.find({}).select('businessId owner').lean();
    for (const b of businesses) {
      try {
        const reportId = await generateMonthlyReport(b.businessId);
        if (reportId) {
          const report = await InventoryReport.findById(reportId).lean();
          if (report && b.owner?.email) {
            await notifyReportCreated(
              b.businessId,
              reportId,
              report.closing,
              b.owner.email as string
            );
          }
        }
      } catch (err) {
        console.error('[reportCron] Monthly report error for', b.businessId, err);
      }
    }
  }, { timezone: 'UTC' });

  cron.schedule('10 0 1 1 *', async () => {
    const businesses = await Business.find({}).select('businessId owner').lean();
    for (const b of businesses) {
      try {
        const reportId = await generateYearlyReport(b.businessId);
        if (reportId) {
          const report = await InventoryReport.findById(reportId).lean();
          if (report && b.owner?.email) {
            await notifyReportCreated(
              b.businessId,
              reportId,
              report.closing,
              b.owner.email as string
            );
          }
        }
      } catch (err) {
        console.error('[reportCron] Yearly report error for', b.businessId, err);
      }
    }
  }, { timezone: 'UTC' });
}
