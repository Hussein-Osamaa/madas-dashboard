import { Request, Response } from 'express';
import * as AuditService from '../services/Audit.service';
import { generateWeeklyReport } from '../../reports/services/Report.service';
import { notifyReportReady } from '../../notifications/services/Notification.service';
import { InventoryReportModel } from '../../reports/models/InventoryReport.model';
import { Business } from '../../../schemas/business.schema';

function getUserId(req: Request): string {
  const payload = (req as any).accountPayload;
  if (payload?.userId) return payload.userId;
  return (req as any).user?.uid as string;
}

/**
 * POST /audit/start - Admin starts session. Returns sessionId and 6-digit joinCode.
 */
export async function start(req: Request, res: Response): Promise<void> {
  const clientId = req.body.clientId as string;
  const createdBy = getUserId(req);
  const { sessionId, joinCode } = await AuditService.startAudit(clientId, createdBy);
  res.json({ sessionId, joinCode });
}

/**
 * POST /audit/join - Worker joins existing audit by 6-digit code.
 */
export async function join(req: Request, res: Response): Promise<void> {
  const joinCode = String(req.body.joinCode ?? '').trim();
  const workerId = getUserId(req);
  const session = await AuditService.joinAudit(joinCode, workerId);
  res.json(session);
}

/**
 * POST /audit/scan - body: barcode, auditSessionId (or sessionId).
 * Worker from auth. Creates AuditScan, updates session, broadcasts scan_update.
 */
export async function scan(req: Request, res: Response): Promise<void> {
  const auditSessionId = req.body.auditSessionId || req.body.sessionId;
  const { barcode, productId, quantity } = req.body;
  const workerId = getUserId(req);

  if (auditSessionId && workerId && barcode != null) {
    try {
      const product = await AuditService.scanBarcodeMultiWorker(auditSessionId, String(barcode).trim(), workerId);
      res.json({ success: true, product: { id: product.productId, name: product.name, sku: product.sku } });
      return;
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code === 'UNKNOWN_BARCODE') {
        res.status(404).json({ error: 'Unknown barcode', code: 'UNKNOWN_BARCODE' });
        return;
      }
      throw err;
    }
  }

  const sessionId = auditSessionId;
  if (productId) {
    await AuditService.scanBarcode(sessionId, barcode, productId, quantity ?? 1);
    res.json({ success: true });
    return;
  }
  try {
    const product = await AuditService.scanBarcodeByCode(sessionId, barcode);
    res.json({ success: true, product: { id: product.productId, name: product.name, sku: product.sku } });
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'UNKNOWN_BARCODE') {
      res.status(404).json({ error: 'Unknown barcode', code: 'UNKNOWN_BARCODE' });
      return;
    }
    throw err;
  }
}

/**
 * GET /audit/session/:id - Session summary (workers, counts, recent scans).
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const summary = await AuditService.getSessionSummary(id);
  if (!summary) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(summary);
}

/**
 * GET /audit/restore/:id - Restore active session after refresh/reopen. Only if user is participant or creator.
 */
export async function restore(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = getUserId(req);
  const data = await AuditService.getSessionForRestore(id, userId);
  if (!data) {
    res.status(404).json({ error: 'Session not found, already ended, or you are not in this session' });
    return;
  }
  res.json(data);
}

/**
 * POST /audit/finish - Creator or platform admin can finish. Compare physical vs expected, create MISSING/ADJUSTMENT, generate weekly report.
 * Sends response immediately after reconciliation; report generation runs in background so the client does not hang.
 */
export async function finish(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.body;
    const requestedBy = getUserId(req);
    const accountType = (req as any).accountPayload?.accountType;
    const allowAnyAdmin = accountType === 'ADMIN';
    const { adjustments, clientId } = await AuditService.finishAudit(sessionId, requestedBy, { allowAnyAdmin });
    res.json({ success: true, adjustments });

    // Run report generation in background so the client gets a fast response
    setImmediate(async () => {
      try {
        const reportId = await generateWeeklyReport(clientId, { adjustments });
        const report = await InventoryReportModel.findById(reportId).lean();
        const business = await Business.findOne({ businessId: clientId }).select('owner').lean();
        if (report && business?.owner?.email) {
          await notifyReportReady(clientId, reportId, report.closingBalance, business.owner.email as string);
        }
      } catch (err) {
        console.error('[audit] Weekly report error:', err);
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to finish audit';
    const status = message.includes('Only the person who started') ? 403 : 400;
    res.status(status).json({ error: message });
  }
}

/**
 * POST /audit/cancel - Cancel session without reconciliation (admin only).
 */
export async function cancel(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body;
  await AuditService.cancelAudit(sessionId);
  res.json({ success: true });
}
