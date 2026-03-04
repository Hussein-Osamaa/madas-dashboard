/**
 * Bosta Shipping API proxy – avoids browser CORS issues by forwarding
 * requests to the Bosta API server-side.
 */
import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';

const BOSTA_API = 'https://app.bosta.co/api/v2';

const router = Router();
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
