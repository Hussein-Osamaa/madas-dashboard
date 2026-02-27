/**
 * Audit comparison API: record physical count, list comparisons, list/acknowledge alerts.
 */
import { Request, Response } from 'express';
import * as AuditComparisonService from '../services/AuditComparison.service';
import { getIo, emitWarehouseUpdate } from '../../../realtime';

function getUserId(req: Request): string {
  const payload = (req as { accountPayload?: { userId?: string } }).accountPayload;
  return payload?.userId ?? '';
}

/**
 * POST /warehouse/audit/record-count - Record physical count for one SKU.
 * Body: clientId, sku, physicalCount, shiftId?, shiftName?, note?
 */
export async function recordCount(req: Request, res: Response): Promise<void> {
  try {
    const clientId = (req.body?.clientId ?? req.query?.clientId ?? (req as { clientId?: string }).clientId) as string;
    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }
    const sku = req.body?.sku != null ? String(req.body.sku).trim() : '';
    const physicalCount = req.body?.physicalCount != null ? Number(req.body.physicalCount) : NaN;
    if (!sku) {
      res.status(400).json({ error: 'sku is required' });
      return;
    }
    if (Number.isNaN(physicalCount) || physicalCount < 0) {
      res.status(400).json({ error: 'physicalCount must be a non-negative number' });
      return;
    }
    const result = await AuditComparisonService.recordPhysicalCount({
      clientId,
      sku,
      physicalCount,
      shiftId: req.body?.shiftId,
      shiftName: req.body?.shiftName,
      performedBy: getUserId(req),
      note: req.body?.note,
    });
    if (result.alertTriggered) {
      emitWarehouseUpdate(getIo(), { type: 'audit_alert', clientId });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

/**
 * POST /warehouse/audit/record-count-bulk - Record physical counts for multiple SKUs.
 * Body: clientId, counts: [{ sku, physicalCount }], shiftId?, shiftName?, note?
 */
export async function recordCountBulk(req: Request, res: Response): Promise<void> {
  try {
    const clientId = (req.body?.clientId ?? (req as { clientId?: string }).clientId) as string;
    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }
    const counts = req.body?.counts;
    if (!Array.isArray(counts) || counts.length === 0) {
      res.status(400).json({ error: 'counts array is required and must not be empty' });
      return;
    }
    const result = await AuditComparisonService.recordBulkPhysicalCount({
      clientId,
      counts,
      shiftId: req.body?.shiftId,
      shiftName: req.body?.shiftName,
      performedBy: getUserId(req),
      note: req.body?.note,
    });
    if (result.comparisons.some((c) => c.alertTriggered)) {
      emitWarehouseUpdate(getIo(), { type: 'audit_alert', clientId });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

/**
 * GET /warehouse/audit/comparisons - List comparison records. Query: clientId, sku?, page?, limit?
 */
export async function listComparisons(req: Request, res: Response): Promise<void> {
  try {
    const clientId = (req.query?.clientId ?? (req as { clientId?: string }).clientId) as string;
    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }
    const sku = (req.query.sku as string) || undefined;
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const data = await AuditComparisonService.listComparisons({ clientId, sku, page, limit });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /warehouse/audit/alerts - List alerts (for dashboard). Query: clientId, acknowledged?, page?, limit?
 */
export async function listAlerts(req: Request, res: Response): Promise<void> {
  try {
    const clientId = (req.query?.clientId ?? (req as { clientId?: string }).clientId) as string;
    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }
    const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const data = await AuditComparisonService.listAlerts({ clientId, acknowledged, page, limit });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * PATCH /warehouse/audit/alerts/:alertId/acknowledge - Mark alert as acknowledged.
 */
export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const alertId = req.params.alertId;
    if (!alertId) {
      res.status(400).json({ error: 'alertId is required' });
      return;
    }
    const acknowledgedBy = getUserId(req);
    const ok = await AuditComparisonService.acknowledgeAlert(alertId, acknowledgedBy);
    if (!ok) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /warehouse/audit/threshold - Get current variance threshold (for UI).
 */
export async function getThreshold(req: Request, res: Response): Promise<void> {
  try {
    const threshold = AuditComparisonService.getAuditThreshold();
    res.json({ threshold });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
