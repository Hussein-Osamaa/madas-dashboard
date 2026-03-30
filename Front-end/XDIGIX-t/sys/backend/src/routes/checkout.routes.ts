/**
 * Checkout API Routes
 *
 * POST /:tenantId/checkout          — Create order from cart
 * GET  /:tenantId/orders/:orderId   — Order lookup (requires publicLookupToken)
 * POST /:tenantId/orders/:orderId/confirm-manual — Manual payment confirmation
 *
 * Stripe webhook is exported separately and mounted at /api/payments/stripe/webhook
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import { Business } from '../schemas/business.schema';
import { FirestoreDoc } from '../schemas/document.schema';
import {
  StorefrontOrder,
  generateOrderId,
  generatePublicLookupToken,
} from '../schemas/storefront-order.schema';
import { getCart, clearCart } from '../modules/storefront/cart.service';
import { orderEvents, ORDER_CREATED } from '../events/orderEvents';
import {
  CheckoutRequestSchema,
  ManualPaymentConfirmSchema,
} from '../schemas/checkout-validation';

const router = Router();

/* ── Rate limiters ──────────────────────────────────────────────── */
const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts, please try again later.', code: 'checkout/rate-limit' },
});

/* ── Helpers ────────────────────────────────────────────────────── */
async function resolveBusiness(tenantId: string) {
  return Business.findOne({ tenantId }).select('businessId currency').lean();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   POST /:tenantId/checkout — Main checkout endpoint
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post('/:tenantId/checkout', checkoutLimiter, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // 1. Validate payload
    const parsed = CheckoutRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      res.status(422).json({ error: `Validation failed — ${issues}`, code: 'checkout/validation' });
      return;
    }
    const data = parsed.data;

    // 2. Resolve business
    const biz = await resolveBusiness(tenantId);
    if (!biz) { res.status(404).json({ error: 'Store not found', code: 'checkout/store-not-found' }); return; }

    // 3. Load cart
    const cart = await getCart(data.cartToken, tenantId, biz.businessId, (biz as any).currency || 'SAR');
    if (!cart || !cart.items || cart.items.length === 0) {
      res.status(400).json({ error: 'Cart is empty', code: 'checkout/empty-cart' });
      return;
    }

    // 4. Idempotency check — return existing order if same key
    if (data.idempotencyKey) {
      const existing = await StorefrontOrder.findOne({
        tenantId,
        idempotencyKey: data.idempotencyKey,
      }).lean();
      if (existing) {
        res.json({
          orderId: existing.orderId,
          publicLookupToken: existing.publicLookupToken,
          status: existing.status,
          duplicate: true,
        });
        return;
      }
    }

    // 5. Duplicate cart check — prevent double-submit
    const existingCartOrder = await StorefrontOrder.findOne({
      tenantId,
      cartToken: data.cartToken,
      status: { $nin: ['failed', 'expired', 'cancelled'] },
    }).lean();
    if (existingCartOrder) {
      res.json({
        orderId: existingCartOrder.orderId,
        publicLookupToken: existingCartOrder.publicLookupToken,
        status: existingCartOrder.status,
        duplicate: true,
      });
      return;
    }

    // 6. Load payment settings
    const paymentDoc = await FirestoreDoc.findOne({
      businessId: biz.businessId,
      coll: 'settings',
      docId: 'payments',
    }).lean();
    const paymentSettings = ((paymentDoc?.data ?? {}) as Record<string, any>);
    const methodConfig = paymentSettings[data.paymentMethod];
    if (!methodConfig || !methodConfig.enabled) {
      res.status(400).json({ error: 'Payment method not available', code: 'checkout/invalid-payment-method' });
      return;
    }

    // 7. Recalculate totals server-side (NEVER trust frontend)
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingCost = 0; // Shipping calculation can be expanded later
    const total = subtotal + shippingCost;
    const currency = cart.currency || (biz as any).currency || 'SAR';

    // 8. Generate identifiers
    const orderId = generateOrderId();
    const publicLookupToken = generatePublicLookupToken();

    // 9. Create order document
    const order = await StorefrontOrder.create({
      orderId,
      tenantId,
      businessId: biz.businessId,
      cartToken: data.cartToken,
      checkoutSource: 'storefront',
      customer: data.customer,
      shipping: { ...data.shipping, cost: shippingCost },
      items: cart.items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        price: i.price,
        imageUrl: i.imageUrl,
        quantity: i.quantity,
      })),
      subtotal,
      shippingCost,
      total,
      currency: currency.toUpperCase(),
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
      publicLookupToken,
      idempotencyKey: data.idempotencyKey,
      notes: data.notes,
      customerNote: data.customerNote,
      locale: data.locale,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      utm: data.utm,
    });

    // 10. Emit ORDER_CREATED for inventory reservation
    orderEvents.emit(ORDER_CREATED, {
      clientId: biz.businessId,
      orderId: order.orderId,
      items: cart.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        size: i.variantId,
      })),
    });

    // 11. Process payment by method
    const response: Record<string, unknown> = { orderId, publicLookupToken };

    switch (data.paymentMethod) {
      /* ── Cash on Delivery ─────────────────────────────────────── */
      case 'cod': {
        await StorefrontOrder.updateOne(
          { _id: order._id },
          { $set: { status: 'confirmed', paymentStatus: 'pending' } },
        );
        await clearCart(data.cartToken, tenantId);
        response.status = 'confirmed';
        break;
      }

      /* ── Stripe ───────────────────────────────────────────────── */
      case 'stripe': {
        const stripeKey = methodConfig.secretKey;
        if (!stripeKey) {
          await StorefrontOrder.updateOne({ _id: order._id }, { $set: { status: 'failed', failedAt: new Date() } });
          res.status(500).json({ error: 'Stripe not configured', code: 'checkout/stripe-not-configured' });
          return;
        }
        try {
          const stripe = new Stripe(stripeKey);
          const pi = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: currency.toLowerCase(),
            metadata: { orderId, tenantId, businessId: biz.businessId },
          });
          await StorefrontOrder.updateOne(
            { _id: order._id },
            { $set: { status: 'awaiting_payment', paymentIntentId: pi.id } },
          );
          response.clientSecret = pi.client_secret;
          response.status = 'awaiting_payment';
        } catch (stripeErr) {
          await StorefrontOrder.updateOne(
            { _id: order._id },
            { $set: { status: 'failed', paymentStatus: 'failed', failedAt: new Date() } },
          );
          console.error('[checkout] Stripe error:', (stripeErr as Error).message);
          res.status(500).json({ error: 'Payment processing failed', code: 'checkout/payment-failed' });
          return;
        }
        break;
      }

      /* ── Manual payment methods ───────────────────────────────── */
      case 'instapay':
      case 'vodafone_cash':
      case 'bank_transfer': {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for manual payments
        await StorefrontOrder.updateOne(
          { _id: order._id },
          { $set: { status: 'awaiting_payment', paymentStatus: 'awaiting_manual_confirmation', expiresAt } },
        );
        response.status = 'awaiting_payment';
        response.instructions = methodConfig.instructions || 'Please complete payment using the provided method.';
        // Include public-safe payment details
        if (data.paymentMethod === 'instapay') {
          if (methodConfig.accountName) response.accountName = methodConfig.accountName;
          if (methodConfig.accountNumber) response.accountNumber = methodConfig.accountNumber;
        }
        if (data.paymentMethod === 'vodafone_cash') {
          if (methodConfig.phoneNumber) response.phoneNumber = methodConfig.phoneNumber;
        }
        if (data.paymentMethod === 'bank_transfer') {
          if (methodConfig.bankName) response.bankName = methodConfig.bankName;
          if (methodConfig.accountName) response.accountName = methodConfig.accountName;
          if (methodConfig.accountNumber) response.accountNumber = methodConfig.accountNumber;
          if (methodConfig.iban) response.iban = methodConfig.iban;
        }
        break;
      }

      /* ── Fawry / Paymob — treat as manual for now ─────────────── */
      default: {
        await StorefrontOrder.updateOne(
          { _id: order._id },
          { $set: { status: 'awaiting_payment', paymentStatus: 'awaiting_manual_confirmation' } },
        );
        response.status = 'awaiting_payment';
        break;
      }
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('[checkout] Error:', (err as Error).message);
    res.status(500).json({ error: 'Checkout failed', code: 'checkout/internal' });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GET /:tenantId/orders/:orderId — Order lookup
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.get('/:tenantId/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { tenantId, orderId } = req.params;
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: 'Lookup token required', code: 'order/missing-token' });
      return;
    }

    const order = await StorefrontOrder.findOne({
      tenantId,
      orderId,
      publicLookupToken: token,
    }).select(
      '-paymentDetails -paymentIntentId -paymentProviderOrderId -ipAddress -userAgent -idempotencyKey -checkoutSessionId -cartSnapshotHash -cartToken'
    ).lean();

    if (!order) {
      res.status(404).json({ error: 'Order not found', code: 'order/not-found' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('[order-lookup] Error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   POST /:tenantId/orders/:orderId/confirm-manual
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post('/:tenantId/orders/:orderId/confirm-manual', async (req: Request, res: Response) => {
  try {
    const { tenantId, orderId } = req.params;
    const parsed = ManualPaymentConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const order = await StorefrontOrder.findOne({
      tenantId,
      orderId,
      paymentStatus: 'awaiting_manual_confirmation',
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found or already confirmed', code: 'order/not-found' });
      return;
    }

    order.paymentReference = parsed.data.paymentReference;
    order.paymentStatus = 'pending'; // Now pending admin review
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    if (parsed.data.notes) {
      order.notes = ((order.notes || '') + '\nCustomer: ' + parsed.data.notes).trim();
    }
    await order.save();

    // Clear cart after manual payment confirmation
    await clearCart(order.cartToken, order.tenantId);

    res.json({
      orderId: order.orderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) {
    console.error('[manual-confirm] Error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Stripe Webhook Handler
   Exported and mounted separately at POST /api/payments/stripe/webhook
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody as Buffer;

  if (!sig || !rawBody) {
    res.status(400).json({ error: 'Missing signature or body' });
    return;
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripe = new Stripe(stripeKey);
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const order = await StorefrontOrder.findOne({ paymentIntentId: pi.id });
        if (!order || order.paymentStatus === 'paid') break; // Already processed
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        order.paymentDetails = {
          stripePaymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        };
        await order.save();
        // Clear cart after successful payment
        await clearCart(order.cartToken, order.tenantId);
        console.log(`[stripe-webhook] Payment succeeded for order ${order.orderId}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const order = await StorefrontOrder.findOne({ paymentIntentId: pi.id });
        if (!order || order.paymentStatus === 'failed') break;
        order.paymentStatus = 'failed';
        order.status = 'failed';
        order.failedAt = new Date();
        await order.save();
        console.log(`[stripe-webhook] Payment failed for order ${order.orderId}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = charge.payment_intent as string;
        if (piId) {
          const order = await StorefrontOrder.findOne({ paymentIntentId: piId });
          if (order && order.paymentStatus !== 'refunded') {
            order.paymentStatus = 'refunded';
            await order.save();
            console.log(`[stripe-webhook] Refund processed for order ${order.orderId}`);
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error:', (err as Error).message);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
}

export default router;
