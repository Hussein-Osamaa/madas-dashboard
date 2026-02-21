import cron from 'node-cron';
import { Business } from '../schemas/business.schema';
import { generateMonthlyReport, generateYearlyReport } from '../modules/reports/services/Report.service';
import { notifyReportReady } from '../modules/notifications/services/Notification.service';
import { InventoryReportModel } from '../modules/reports/models/InventoryReport.model';

export function startReportCrons(): void {
  cron.schedule(
    '5 0 1 * *',
    async () => {
      const businesses = await Business.find({}).select('businessId owner').lean();
      for (const b of businesses) {
        try {
          const reportId = await generateMonthlyReport(b.businessId);
          const report = await InventoryReportModel.findById(reportId).lean();
          if (report && b.owner?.email) {
            await notifyReportReady(b.businessId, reportId, report.closingBalance, b.owner.email as string);
          }
        } catch (err) {
          console.error('[reportCron] Monthly error', b.businessId, err);
        }
      }
    },
    { timezone: 'UTC' }
  );

  cron.schedule(
    '5 0 1 1 *',
    async () => {
      const businesses = await Business.find({}).select('businessId owner').lean();
      for (const b of businesses) {
        try {
          const reportId = await generateYearlyReport(b.businessId);
          const report = await InventoryReportModel.findById(reportId).lean();
          if (report && b.owner?.email) {
            await notifyReportReady(b.businessId, reportId, report.closingBalance, b.owner.email as string);
          }
        } catch (err) {
          console.error('[reportCron] Yearly error', b.businessId, err);
        }
      }
    },
    { timezone: 'UTC' }
  );
}
