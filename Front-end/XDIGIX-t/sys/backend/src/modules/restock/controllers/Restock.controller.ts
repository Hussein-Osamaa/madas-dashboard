import { Request, Response } from 'express';
import * as RestockService from '../services/Restock.service';

function getUserId(req: Request): string {
  const payload = (req as any).accountPayload;
  if (payload?.userId) return payload.userId;
  return (req as any).user?.uid as string;
}

/**
 * POST /restock/start
 * Body: { clientId }
 */
export async function start(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.body.clientId as string;
    const createdBy = getUserId(req);
    const { sessionId, joinCode } = await RestockService.startRestock(clientId, createdBy);
    res.json({ sessionId, joinCode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start restock';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /restock/join
 * Body: { joinCode }
 */
export async function join(req: Request, res: Response): Promise<void> {
  try {
    const joinCode = String(req.body.joinCode ?? '').trim();
    const workerId = getUserId(req);
    const session = await RestockService.joinRestock(joinCode, workerId);
    res.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join restock';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /restock/scan
 * Body: { sessionId, barcode }
 */
export async function scan(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, barcode } = req.body;
    const workerId = getUserId(req);
    const result = await RestockService.scanBarcode(sessionId, String(barcode).trim(), workerId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to scan';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /restock/session/:id
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const summary = await RestockService.getSessionSummary(id);
    if (!summary) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get session';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /restock/restore/:id
 */
export async function restore(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = getUserId(req);
    const data = await RestockService.getSessionForRestore(id, userId);
    if (!data) {
      res.status(404).json({ error: 'Session not found, already ended, or you are not in this session' });
      return;
    }
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to restore session';
    res.status(400).json({ error: message });
  }
}

/**
 * POST /restock/finish
 * Body: { sessionId }
 */
export async function finish(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.body;
    const requestedBy = getUserId(req);
    const result = await RestockService.finishRestock(sessionId, requestedBy);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to finish restock';
    const status = message.includes('Only the session creator') ? 403 : 400;
    res.status(status).json({ error: message });
  }
}

/**
 * POST /restock/cancel
 * Body: { sessionId }
 */
export async function cancel(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.body;
    await RestockService.cancelRestock(sessionId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel restock';
    res.status(400).json({ error: message });
  }
}
