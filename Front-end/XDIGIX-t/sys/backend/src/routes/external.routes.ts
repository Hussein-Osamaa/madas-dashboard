/**
 * Multi-tenant external API routes.
 * - POST /api/external/:tenantId/orders — create order (Bearer token, validated body, then save + inventory).
 * - POST /api/external/:tenantId/webhook — receive webhook (HMAC + replay protection, return 200 fast).
 *
 * All secrets from env or DB; no secrets in frontend.
 */

import { Router, Request, Response } from 'express';
import { addDocument } from '../services/firestore.service';
import { orderEvents, ORDER_CREATED } from '../events/orderEvents';
import { externalOrderPayloadSchema } from '../schemas/external-order.schema';
import { requestIdMiddleware } from '../middleware/request-id.middleware';
import { requireHttpsMiddleware } from '../middleware/https.middleware';
import { externalAuthMiddleware } from '../middleware/external-auth.middleware';
import { externalTenantValidateMiddleware } from '../middleware/external-tenant-validate.middleware';
import { externalRateLimitMiddleware } from '../middleware/external-rate-limit.middleware';
import { externalWebhookMiddleware } from '../middleware/external-webhook.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Request ID and HTTPS for all external routes
router.use(requestIdMiddleware);
router.use(requireHttpsMiddleware);

// --- Orders: Bearer auth, validate body, save order, emit event ---
router.post(
  '/:tenantId/orders',
  externalAuthMiddleware,
  externalRateLimitMiddleware,
  async (req: Request, res: Response) => {
    const ctx = req.externalContext;
    const requestId = (req as Request & { requestId?: string }).requestId;

    const parsed = externalOrderPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first).flat().join('; ') || 'Validation failed';
      logger.warn('External API: order validation failed', {
        requestId,
        tenantId: ctx?.tenantId,
        errors: parsed.error.flatten(),
      });
      res.status(400).json({ error: message, code: 'external/validation_error', details: first });
      return;
    }

    const { items, source, customerEmail, metadata } = parsed.data;
    const tenantId = ctx!.tenantId;
    const businessId = ctx!.businessId;

    try {
      // Stock availability check — reject if any item is out of stock
      const { FirestoreDoc } = await import('../schemas/document.schema');
      const outOfStock: string[] = [];
      for (const item of items) {
        const doc = await FirestoreDoc.findOne(
          { businessId, coll: 'products', docId: item.productId },
          { 'data.stock': 1, 'data.reservedStock': 1, 'data.name': 1 },
        ).lean();
        const data = (doc as { data?: Record<string, unknown> })?.data ?? {};
        const stockMap = (data.stock ?? {}) as Record<string, number>;
        const reservedMap = (data.reservedStock ?? {}) as Record<string, number>;
        const sizeKey = item.size || Object.keys(stockMap)[0] || '';
        const available = sizeKey
          ? Math.max(0, (Number(stockMap[sizeKey]) || 0) - (Number(reservedMap[sizeKey]) || 0))
          : Object.keys(stockMap).reduce((s, k) => s + Math.max(0, (Number(stockMap[k]) || 0) - (Number(reservedMap[k]) || 0)), 0);
        if (available < item.quantity) {
          outOfStock.push(`${(data.name as string) || item.productId}${item.size ? ` (${item.size})` : ''}: ${available} available`);
        }
      }
      if (outOfStock.length > 0) {
        res.status(400).json({
          error: 'Some items are out of stock',
          code: 'external/out_of_stock',
          outOfStock,
        });
        return;
      }

      const orderData: Record<string, unknown> = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
        status: 'pending',
        source: source ?? 'external',
        customerEmail: customerEmail || undefined,
        metadata: metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await addDocument(
        `businesses/${businessId}/orders`,
        orderData,
        tenantId
      );

      orderEvents.emit(ORDER_CREATED, {
        clientId: businessId,
        orderId: result.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
      });

      logger.info('External API: order created', {
        requestId,
        tenantId,
        orderId: result.id,
      });

      res.status(201).json({
        success: true,
        orderId: result.id,
      });
    } catch (err) {
      logger.error('External API: order create failed', {
        requestId,
        tenantId,
        error: (err as Error).message,
      });
      res.status(500).json({
        error: 'Failed to create order',
        code: 'external/order_create_failed',
      });
    }
  }
);

// --- Webhook: tenant validate, raw body already in req.rawBody, verify signature + replay ---
router.post(
  '/:tenantId/webhook',
  externalTenantValidateMiddleware,
  externalRateLimitMiddleware,
  externalWebhookMiddleware,
  (req: Request, res: Response) => {
    const ctx = req.externalContext;
    const requestId = (req as Request & { requestId?: string }).requestId;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    let payload: unknown = {};
    if (Buffer.isBuffer(rawBody) && rawBody.length > 0) {
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        // leave payload as {}
      }
    }

    logger.info('External webhook: received', {
      requestId,
      tenantId: ctx?.tenantId,
      event: (payload as { event?: string })?.event,
    });

    // Process async if needed; return 200 immediately (best practice).
    res.status(200).json({ received: true });
  }
);

export default router;
