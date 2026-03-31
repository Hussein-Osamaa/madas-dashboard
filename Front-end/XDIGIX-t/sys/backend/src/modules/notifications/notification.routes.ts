import { Router, Request, Response } from 'express';
import { notificationService } from './notification.service';

const router = Router();

/**
 * GET /api/notifications/logs
 * Merchant-facing: list notification logs for the authenticated tenant.
 * Supports query params: status, eventType, page, limit.
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status, eventType, page, limit } = req.query as Record<string, string>;
    const result = await notificationService.getLogs(tenantId, {
      status,
      eventType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
});

export default router;
