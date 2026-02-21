import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { InventoryReportModel } from '../models/InventoryReport.model';

/**
 * GET /client/warehouse/reports - List reports (client read-only)
 */
export async function list(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const reports = await InventoryReportModel.find({ clientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({
    reports: reports.map((r) => ({
      id: r._id,
      period: r.period,
      periodLabel: r.periodLabel,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      inbound: r.inbound,
      sold: r.sold,
      damaged: r.damaged,
      missing: r.missing,
      closingBalance: r.closingBalance,
      pdfUrl: r.pdfUrl,
      createdAt: r.createdAt,
    })),
  });
}

/**
 * GET /client/warehouse/reports/:id/download - Download PDF
 */
export async function download(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const reportId = req.params.id;
  const report = await InventoryReportModel.findOne({ _id: reportId, clientId }).lean();
  if (!report || !report.pdfUrl) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  const reportsDir = process.env.REPORTS_DIR || path.join(process.cwd(), 'uploads', 'reports');
  const filename = report.pdfUrl.split('/').pop();
  const filepath = path.join(reportsDir, filename || '');
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Report file not found' });
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filepath).pipe(res);
}
