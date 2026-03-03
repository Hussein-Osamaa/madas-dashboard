import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { InventoryReport } from '../models/InventoryReport.js';
import { runWeeklyReportForClient, runMonthlyReportForClient, runYearlyReportForClient } from '../services/reportService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.join(__dirname, '../../reports');

export const reportsRouter = Router();

reportsRouter.get('/', async (req, res) => {
  try {
    const { clientId, periodType, limit = 50 } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (periodType) filter.periodType = periodType;
    const list = await InventoryReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

reportsRouter.get('/:id', async (req, res) => {
  try {
    const report = await InventoryReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

reportsRouter.post('/trigger/:clientId', async (req, res) => {
  try {
    const { periodType } = req.body;
    const { clientId } = req.params;
    let report;
    if (periodType === 'MONTHLY') report = await runMonthlyReportForClient(clientId);
    else if (periodType === 'YEARLY') report = await runYearlyReportForClient(clientId);
    else report = await runWeeklyReportForClient(clientId);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

reportsRouter.get('/:id/download', (req, res) => {
  const reportId = req.params.id;
  InventoryReport.findById(reportId).then((report) => {
    if (!report || !report.pdfUrl) return res.status(404).json({ error: 'Report or PDF not found' });
    const filename = path.basename(report.pdfUrl);
    const filepath = path.join(reportsDir, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
    res.download(filepath, filename);
  }).catch((e) => res.status(500).json({ error: e.message }));
});
