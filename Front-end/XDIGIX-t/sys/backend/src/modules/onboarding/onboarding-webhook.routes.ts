/**
 * Onboarding payment webhook routes — hardened with signature verification.
 *
 * Stripe: verifies stripe-signature header using STRIPE_WEBHOOK_SECRET.
 * Paymob: verifies HMAC-SHA512 using PAYMOB_HMAC_SECRET.
 * Generic: for testing/internal use — no signature required.
 *
 * Mounted at /api/onboarding/webhooks.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { onboardingService } from './onboarding.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding-webhook');
const router = Router();

/* ── Signature verification helpers ───────────────────────────────── */

/**
 * Verify Stripe webhook signature. Returns parsed event or null.
 */
function verifyStripeSignature(
  rawBody: string | Buffer,
  signature: string | undefined,
  secret: string,
): Record<string, unknown> | null {
  if (!signature || !secret) return null;

  try {
    const parts = signature.split(',');
    const tsEntry = parts.find((p) => p.startsWith('t='));
    const sigEntry = parts.find((p) => p.startsWith('v1='));
    if (!tsEntry || !sigEntry) return null;

    const timestamp = tsEntry.slice(2);
    const expectedSig = sigEntry.slice(3);

    // Compute expected signature
    const payload = `${timestamp}.${rawBody}`;
    const computedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(computedSig))) {
      return null;
    }

    // Check timestamp tolerance (5 minutes)
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (age > 300) {
      log.warn('Stripe webhook timestamp too old', { age: String(Math.round(age)) });
      return null;
    }

    return typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
  } catch {
    return null;
  }
}

/**
 * Verify Paymob HMAC-SHA512 signature. Returns true if valid.
 */
function verifyPaymobSignature(body: Record<string, unknown>, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader || !secret) return false;

  try {
    // Paymob HMAC: concatenate specific sorted fields → SHA512
    const fields = [
      'amount_cents', 'created_at', 'currency', 'error_occured',
      'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
      'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
      'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
      'source_data.sub_type', 'source_data.type', 'success',
    ];

    const values = fields.map((f) => {
      const keys = f.split('.');
      let val: unknown = body;
      for (const k of keys) val = (val as Record<string, unknown>)?.[k];
      return String(val ?? '');
    }).join('');

    const computed = crypto.createHmac('sha512', secret).update(values).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(computed));
  } catch {
    return false;
  }
}

/* ── Stripe webhook ──────────────────────────────────────────────── */

router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const rawBody = (req as Record<string, unknown>).rawBody as string | Buffer | undefined;
    let event: Record<string, unknown> | null;

    if (secret && rawBody) {
      // Production: verify signature
      event = verifyStripeSignature(rawBody, req.headers['stripe-signature'] as string, secret);
      if (!event) {
        log.warn('Stripe webhook signature verification failed');
        return res.status(401).json({ ok: false, error: 'Invalid signature' });
      }
    } else {
      // Development fallback: accept without verification (no secret configured)
      event = req.body;
      if (!event || !event.type) {
        return res.status(400).json({ ok: false, error: 'Invalid webhook payload' });
      }
    }

    log.info(`Stripe webhook received: ${event.type}`, { eventId: event.id as string });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        const paymentSessionId = (session?.metadata as Record<string, unknown>)?.paymentSessionId || session?.client_reference_id;
        if (paymentSessionId) {
          await onboardingService.markPaymentSucceeded({
            paymentSessionId: paymentSessionId as string,
            externalPaymentIntentId: session?.payment_intent as string,
            externalSubscriptionId: session?.subscription as string,
          });
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        const paymentSessionId = (session?.metadata as Record<string, unknown>)?.paymentSessionId || session?.client_reference_id;
        if (paymentSessionId) {
          await onboardingService.markPaymentFailed({ paymentSessionId: paymentSessionId as string, failureReason: 'Checkout session expired' });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        const paymentSessionId = (pi?.metadata as Record<string, unknown>)?.paymentSessionId;
        if (paymentSessionId) {
          const lastError = (pi?.last_payment_error as Record<string, unknown>)?.message;
          await onboardingService.markPaymentFailed({ paymentSessionId: paymentSessionId as string, failureReason: (lastError as string) || 'Payment failed' });
        }
        break;
      }
      default:
        log.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    log.error('Stripe webhook error', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

/* ── Paymob webhook ──────────────────────────────────────────────── */

router.post('/paymob', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const secret = process.env.PAYMOB_HMAC_SECRET || '';

    if (secret) {
      const hmacHeader = req.query.hmac as string || req.headers['x-paymob-hmac'] as string;
      if (!verifyPaymobSignature(data, hmacHeader, secret)) {
        log.warn('Paymob webhook HMAC verification failed');
        return res.status(401).json({ ok: false, error: 'Invalid signature' });
      }
    }

    if (!data) {
      return res.status(400).json({ ok: false, error: 'Invalid webhook payload' });
    }

    log.info('Paymob webhook received', { txnId: data.id });

    const paymentSessionId = data.order?.merchant_order_id || data.merchant_order_id;
    const success = data.success === true || data.success === 'true';

    if (paymentSessionId) {
      if (success) {
        await onboardingService.markPaymentSucceeded({
          paymentSessionId,
          externalPaymentIntentId: String(data.id || ''),
        });
      } else {
        await onboardingService.markPaymentFailed({
          paymentSessionId,
          failureReason: data.data_message || 'Payment declined',
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    log.error('Paymob webhook error', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

/* ── Generic webhook (testing / manual) ──────────────────────────── */

router.post('/generic', async (req: Request, res: Response) => {
  try {
    const { paymentSessionId, status, failureReason, externalPaymentIntentId, externalSubscriptionId } = req.body || {};
    if (!paymentSessionId || !status) {
      return res.status(400).json({ ok: false, error: 'paymentSessionId and status are required' });
    }

    if (status === 'success' || status === 'completed') {
      await onboardingService.markPaymentSucceeded({ paymentSessionId, externalPaymentIntentId, externalSubscriptionId });
    } else if (status === 'failed' || status === 'expired') {
      await onboardingService.markPaymentFailed({ paymentSessionId, failureReason: failureReason || status });
    } else {
      return res.status(400).json({ ok: false, error: `Unknown status: ${status}` });
    }

    res.json({ ok: true, received: true });
  } catch (err) {
    log.error('Generic webhook error', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

export default router;
export { verifyStripeSignature, verifyPaymobSignature };
