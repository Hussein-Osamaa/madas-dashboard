/**
 * Bosta Shipping API proxy & webhook receiver.
 *
 * Proxy routes (authenticated — JWT required):
 *   GET  /bosta/cities
 *   POST /bosta/deliveries
 *   GET  /bosta/deliveries/:trackingNumber
 *
 * Webhook (public — Bosta POSTs here on status changes):
 *   POST /bosta/webhook/:businessId
 *
 * Docs: https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
 */
import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { FirestoreDoc } from '../schemas/document.schema';
import { logger } from '../utils/logger';

const BOSTA_API = 'https://app.bosta.co/api/v2';

const router = Router();

/* ──────────────────────────────────────────────────────────────────
   Bosta State Code → XDIGIX Order Status mapping
   https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/
────────────────────────────────────────────────────────────────── */
const BOSTA_STATE_MAP: Record<number, { status: string; label: string }> = {
  10:  { status: 'processing',  label: 'Pickup Requested' },
  11:  { status: 'processing',  label: 'Waiting for Route' },
  20:  { status: 'processing',  label: 'Route Assigned' },
  21:  { status: 'shipped',     label: 'Picked Up from Business' },
  22:  { status: 'shipped',     label: 'Heading to Customer' },
  23:  { status: 'shipped',     label: 'Picked Up from Consignee' },
  24:  { status: 'shipped',     label: 'Received at Warehouse' },
  25:  { status: 'shipped',     label: 'Fulfilled' },
  30:  { status: 'shipped',     label: 'In Transit Between Hubs' },
  40:  { status: 'shipped',     label: 'Heading to Customer' },
  41:  { status: 'shipped',     label: 'Out for Delivery' },
  45:  { status: 'delivered',   label: 'Delivered' },
  46:  { status: 'returned',    label: 'Returned to Business' },
  47:  { status: 'processing',  label: 'Exception' },
  48:  { status: 'cancelled',   label: 'Terminated' },
  49:  { status: 'cancelled',   label: 'Canceled' },
  60:  { status: 'returned',    label: 'Returned to Stock' },
  100: { status: 'cancelled',   label: 'Lost' },
  101: { status: 'cancelled',   label: 'Damaged' },
  102: { status: 'processing',  label: 'Investigation' },
  103: { status: 'processing',  label: 'Awaiting Your Action' },
  104: { status: 'cancelled',   label: 'Archived' },
  105: { status: 'processing',  label: 'On Hold' },
};

/* ──────────────────────────────────────────────────────────────────
   WEBHOOK ENDPOINT — public, no JWT
   POST /api/bosta/webhook/:businessId
────────────────────────────────────────────────────────────────── */
router.post('/webhook/:businessId', async (req: Request, res: Response) => {
  const { businessId } = req.params;
  const payload = req.body as Record<string, unknown>;

  // Respond 200 immediately — Bosta expects a fast acknowledgment
  res.status(200).json({ received: true });

  // Validate minimum payload
  const trackingNumber = payload.trackingNumber != null ? String(payload.trackingNumber) : '';
  const state = Number(payload.state);
  const bostaId = String(payload._id || '');
  const businessReference = String(payload.businessReference || '');

  if (!trackingNumber && !businessReference) {
    logger.warn('[Bosta Webhook] No trackingNumber or businessReference', { businessId, payload });
    return;
  }

  const stateInfo = BOSTA_STATE_MAP[state] || { status: 'processing', label: `Unknown (${state})` };

  logger.info('[Bosta Webhook] Received status update', {
    businessId,
    trackingNumber,
    bostaId,
    state,
    stateLabel: stateInfo.label,
    businessReference,
  });

  try {
    // Find the order by trackingNumber or businessReference (our orderId)
    // Orders store bostaTrackingNumber in data field
    let orderDoc = null;

    if (trackingNumber) {
      orderDoc = await FirestoreDoc.findOne({
        businessId,
        coll: 'orders',
        'data.bostaTrackingNumber': trackingNumber,
      });
    }

    if (!orderDoc && businessReference) {
      // businessReference is the order's docId
      orderDoc = await FirestoreDoc.findOne({
        businessId,
        coll: 'orders',
        docId: businessReference,
      });
    }

    if (!orderDoc && bostaId) {
      orderDoc = await FirestoreDoc.findOne({
        businessId,
        coll: 'orders',
        'data.bostaDeliveryId': bostaId,
      });
    }

    if (!orderDoc) {
      logger.warn('[Bosta Webhook] Order not found', {
        businessId,
        trackingNumber,
        businessReference,
        bostaId,
      });
      return;
    }

    // Build timeline entry
    const timelineEntry = {
      state: { value: state, code: stateInfo.label },
      timestamp: payload.timeStamp ? new Date(Number(payload.timeStamp)).toISOString() : new Date().toISOString(),
      note: (payload.exceptionReason as string) || stateInfo.label,
    };

    // Get current timeline
    const currentData = (orderDoc.data || {}) as Record<string, unknown>;
    const existingTimeline = Array.isArray(currentData.bostaTimeline) ? currentData.bostaTimeline : [];

    // Build the update
    const update: Record<string, unknown> = {
      'data.bostaStatus': stateInfo.label,
      'data.bostaStatusValue': state,
      'data.bostaStatusLabel': stateInfo.label,
      'data.bostaLastUpdate': new Date(),
      'data.bostaTimeline': [...existingTimeline, timelineEntry],
    };

    // Update order status based on Bosta state (only meaningful transitions)
    const currentStatus = (currentData.status as string) || 'pending';
    const newStatus = stateInfo.status;

    // Only update order status if it's a forward transition or special case
    const STATUS_PRIORITY: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      returned: 5,
      cancelled: 6,
    };

    const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
    const newPriority = STATUS_PRIORITY[newStatus] ?? 0;

    // Allow forward transitions, returns, and cancellations
    if (newPriority > currentPriority || newStatus === 'returned' || newStatus === 'cancelled') {
      update['data.status'] = newStatus;
    }

    // If tracking number was not yet saved, save it
    if (trackingNumber && !currentData.bostaTrackingNumber) {
      update['data.bostaTrackingNumber'] = trackingNumber;
    }

    // If Bosta _id was not yet saved
    if (bostaId && !currentData.bostaDeliveryId) {
      update['data.bostaDeliveryId'] = bostaId;
    }

    // If COD was collected on delivery
    if (payload.cod != null && state === 45) {
      update['data.bostaCodCollected'] = Number(payload.cod);
    }

    // Exception info
    if (payload.exceptionReason) {
      update['data.bostaExceptionReason'] = String(payload.exceptionReason);
      update['data.bostaExceptionCode'] = Number(payload.exceptionCode) || 0;
    }

    // Delivery attempts
    if (payload.numberOfAttempts != null) {
      update['data.bostaDeliveryAttempts'] = Number(payload.numberOfAttempts);
    }

    // Delivery promise date
    if (payload.deliveryPromiseDate) {
      update['data.bostaDeliveryPromiseDate'] = String(payload.deliveryPromiseDate);
    }

    // Confirmed delivery flag
    if (payload.isConfirmedDelivery != null) {
      update['data.bostaConfirmedDelivery'] = Boolean(payload.isConfirmedDelivery);
    }

    await FirestoreDoc.updateOne(
      { _id: orderDoc._id },
      { $set: update },
    );

    logger.info('[Bosta Webhook] Order updated', {
      orderId: orderDoc.docId,
      businessId,
      bostaState: state,
      newStatus: update['data.status'] || currentStatus,
      label: stateInfo.label,
    });
  } catch (err) {
    logger.error('[Bosta Webhook] Error processing webhook', {
      businessId,
      trackingNumber,
      error: (err as Error).message,
    });
  }
});

/* ──────────────────────────────────────────────────────────────────
   PROXY ROUTES — JWT authenticated
────────────────────────────────────────────────────────────────── */
router.use(jwtMiddleware);
router.use(tenantMiddleware);

/** Forward upstream JSON transparently, adding only a `success` flag. */
async function proxyResponse(res: Response, upstream: globalThis.Response) {
  const body = await upstream.json() as Record<string, unknown>;
  // Bosta may return { data: {...} } or a flat object.
  // Forward as-is so the frontend receives the same shape the old Cloud
  // Functions proxy returned: { success, data, message }.
  res.status(upstream.status).json({
    success: upstream.ok,
    ...(body.data !== undefined ? { data: body.data } : { data: body }),
    message: body.message ?? (body as Record<string, unknown>).error,
  });
}

router.get('/cities', async (req: Request, res: Response) => {
  const { apiKey, countryId } = req.query as { apiKey?: string; countryId?: string };
  if (!apiKey) {
    res.status(400).json({ success: false, message: 'apiKey is required' });
    return;
  }
  try {
    const url = `${BOSTA_API}/cities?countryId=${encodeURIComponent(countryId || '60e4482c7cb7d4bc4849c4d5')}`;
    const upstream = await fetch(url, {
      headers: { Authorization: apiKey }
    });
    await proxyResponse(res, upstream);
  } catch (err) {
    res.status(502).json({ success: false, message: (err as Error).message });
  }
});

router.post('/deliveries', async (req: Request, res: Response) => {
  const { apiKey, deliveryData } = req.body as { apiKey?: string; deliveryData?: unknown };
  if (!apiKey || !deliveryData) {
    res.status(400).json({ success: false, message: 'apiKey and deliveryData are required' });
    return;
  }
  try {
    const upstream = await fetch(`${BOSTA_API}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey
      },
      body: JSON.stringify(deliveryData)
    });
    await proxyResponse(res, upstream);
  } catch (err) {
    res.status(502).json({ success: false, message: (err as Error).message });
  }
});

router.get('/deliveries/:trackingNumber', async (req: Request, res: Response) => {
  const { apiKey } = req.query as { apiKey?: string };
  const { trackingNumber } = req.params;
  if (!apiKey) {
    res.status(400).json({ success: false, message: 'apiKey is required' });
    return;
  }
  try {
    const upstream = await fetch(`${BOSTA_API}/deliveries/track/${encodeURIComponent(trackingNumber)}`, {
      headers: { Authorization: apiKey }
    });
    await proxyResponse(res, upstream);
  } catch (err) {
    res.status(502).json({ success: false, message: (err as Error).message });
  }
});

export default router;
