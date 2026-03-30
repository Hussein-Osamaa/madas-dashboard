import {
  StorefrontOrder,
  IStorefrontOrder,
  generateOrderId,
  generatePublicLookupToken,
} from '../../schemas/storefront-order.schema';
import { CheckoutRequestSchema } from '../../schemas/checkout-validation';
import { PaymentAttempt } from './payment-attempt.schema';
import { Return, IReturnItem } from './return.schema';
import {
  validateTransition,
  canTransition,
  isTerminal,
  OrderStatus,
  PaymentStatus,
} from './order-state-machine';
import { inventoryService } from '../inventory/inventory.service';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { createLogger } from '../../lib/logger';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

const log = createLogger('orders');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

interface CartData {
  items: CartItem[];
  currency?: string;
}

interface PaymentConfig {
  [method: string]: {
    enabled: boolean;
    secretKey?: string;
    instructions?: string;
    accountName?: string;
    accountNumber?: string;
    phoneNumber?: string;
    bankName?: string;
    iban?: string;
    [key: string]: unknown;
  };
}

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  siteId?: string;
  checkoutSessionId?: string;
}

interface CreateOrderResult {
  orderId: string;
  publicLookupToken: string;
  status: string;
  paymentStatus: string;
  duplicate?: boolean;
  clientSecret?: string;
  instructions?: string;
  paymentDetails?: Record<string, unknown>;
}

/** Default revenue recognition policy snapshot (architectural rule 33). */
const DEFAULT_REVENUE_POLICY = {
  version: '1.0',
  prePaid: { recognizeOn: 'shipment' },
  cod: { recognizeOn: 'cod_collection' },
  manual: { recognizeOn: 'payment_confirmation' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRevenuePolicy(paymentMethod: string): Record<string, unknown> {
  return {
    ...DEFAULT_REVENUE_POLICY,
    appliedMethod: paymentMethod,
    snapshotAt: new Date().toISOString(),
  };
}

function getReservationTTL(paymentMethod: string): number {
  // Stripe: 30 min, manual methods: 48h, COD: 30 min (confirmed immediately)
  switch (paymentMethod) {
    case 'stripe':
    case 'cod':
      return 30;
    case 'instapay':
    case 'vodafone_cash':
    case 'bank_transfer':
    case 'paymob':
    case 'fawry':
      return 48 * 60; // 48 hours in minutes
    default:
      return 30;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function createOrder(
  tenantId: string,
  businessId: string,
  checkoutData: Record<string, unknown>,
  cartData: CartData,
  paymentConfig: PaymentConfig,
  requestMeta?: RequestMeta
): Promise<CreateOrderResult> {
  const correlationId = uuidv4();

  // 1. Validate checkout data
  const parsed = CheckoutRequestSchema.safeParse(checkoutData);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    const err = new Error(`Checkout validation failed: ${issues}`);
    (err as any).code = 'ORDER_VALIDATION_FAILED';
    (err as any).statusCode = 422;
    throw err;
  }
  const data = parsed.data;

  // 2. Validate cart is not empty
  if (!cartData.items || cartData.items.length === 0) {
    const err = new Error('Cart is empty');
    (err as any).code = 'ORDER_EMPTY_CART';
    (err as any).statusCode = 400;
    throw err;
  }

  // 3. Validate payment method is enabled
  const methodConfig = paymentConfig[data.paymentMethod];
  if (!methodConfig || !methodConfig.enabled) {
    const err = new Error('Payment method not available');
    (err as any).code = 'ORDER_INVALID_PAYMENT_METHOD';
    (err as any).statusCode = 400;
    throw err;
  }

  // 4. Idempotency check: existing order with same idempotencyKey
  if (data.idempotencyKey) {
    const existing = await StorefrontOrder.findOne({
      tenantId,
      idempotencyKey: data.idempotencyKey,
    }).lean();
    if (existing) {
      log.info('Idempotency hit: returning existing order', { orderId: existing.orderId, tenantId });
      return {
        orderId: existing.orderId,
        publicLookupToken: existing.publicLookupToken,
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        duplicate: true,
      };
    }
  }

  // 5. Duplicate cart check: prevent double-submit for active orders
  const existingCartOrder = await StorefrontOrder.findOne({
    tenantId,
    cartToken: data.cartToken,
    status: { $nin: ['failed', 'expired', 'cancelled'] },
  }).lean();
  if (existingCartOrder) {
    log.info('Cart token hit: returning existing order', { orderId: existingCartOrder.orderId, tenantId });
    return {
      orderId: existingCartOrder.orderId,
      publicLookupToken: existingCartOrder.publicLookupToken,
      status: existingCartOrder.status,
      paymentStatus: existingCartOrder.paymentStatus,
      duplicate: true,
    };
  }

  // 6. Calculate totals server-side (NEVER trust frontend)
  const subtotal = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = 0; // Shipping calculation can be expanded later
  const total = subtotal + shippingCost;
  const currency = (cartData.currency || 'SAR').toUpperCase();

  // 7. Request inventory reservation
  const reservationItems = cartData.items.map(item => ({
    productId: item.productId,
    variantId: item.variantId || 'default',
    qty: item.quantity,
  }));

  let reservationId: string;
  try {
    reservationId = await inventoryService.requestReservation(
      tenantId,
      businessId,
      'pending', // orderId placeholder; updated after order creation
      reservationItems,
      getReservationTTL(data.paymentMethod)
    );
  } catch (reserveErr) {
    log.warn('Reservation failed, order not created', {
      tenantId,
      error: (reserveErr as Error).message,
    });
    const err = new Error((reserveErr as Error).message);
    (err as any).code = 'ORDER_RESERVATION_FAILED';
    (err as any).statusCode = 409;
    throw err;
  }

  // 8. Create order document (compensation: release reservation on failure)
  const orderId = generateOrderId();
  const publicLookupToken = generatePublicLookupToken();
  const revenuePolicy = buildRevenuePolicy(data.paymentMethod);

  let order: IStorefrontOrder;
  try {
    order = await StorefrontOrder.create({
      orderId,
      tenantId,
      businessId,
      siteId: requestMeta?.siteId || tenantId,
      cartToken: data.cartToken,
      checkoutSource: 'storefront',
      customer: data.customer,
      shipping: {
        address: data.shipping.address,
        city: data.shipping.city,
        state: data.shipping.state || '',
        postalCode: data.shipping.postalCode || '',
        country: data.shipping.country,
        method: data.shipping.method || 'standard',
        cost: shippingCost,
      },
      billing: { sameAsShipping: true },
      items: cartData.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      })),
      subtotal,
      shippingCost,
      total,
      currency,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
      publicLookupToken,
      idempotencyKey: data.idempotencyKey,
      notes: data.notes,
      customerNote: data.customerNote,
      locale: data.locale,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
      utm: data.utm,
      checkoutSessionId: requestMeta?.checkoutSessionId,
      paymentDetails: { reservationId, revenuePolicy },
    });
  } catch (createErr) {
    // Compensation: release the reservation we just made
    log.error('Order creation failed, releasing reservation', {
      reservationId,
      tenantId,
      error: (createErr as Error).message,
    });
    try {
      await inventoryService.releaseReservation(reservationId);
    } catch (releaseErr) {
      log.error('CRITICAL: Failed to release reservation after order creation failure', {
        reservationId,
        tenantId,
        error: (releaseErr as Error).message,
      });
    }
    throw createErr;
  }

  // 9. Process payment by method
  const result: CreateOrderResult = {
    orderId,
    publicLookupToken,
    status: 'pending',
    paymentStatus: 'pending',
  };

  try {
    switch (data.paymentMethod) {
      // ── Cash on Delivery ──────────────────────────────────────
      case 'cod': {
        validateTransition(order.status as OrderStatus, 'confirmed');
        await StorefrontOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'confirmed',
              paymentStatus: 'pending',
              confirmedAt: new Date(),
            },
          }
        );

        await PaymentAttempt.create({
          orderId,
          tenantId,
          provider: 'cod',
          type: 'cod_confirm',
          status: 'success',
          correlationId,
        });

        await eventBus.safePublish('order.confirmed', {
          orderId,
          tenantId,
          businessId,
          paymentMethod: 'cod',
          total,
          currency,
        }, { tenantId, correlationId });

        result.status = 'confirmed';
        result.paymentStatus = 'pending';
        break;
      }

      // ── Stripe ────────────────────────────────────────────────
      case 'stripe': {
        const stripeKey = methodConfig.secretKey;
        if (!stripeKey) {
          // Roll back: mark order failed, release reservation
          await StorefrontOrder.updateOne(
            { _id: order._id },
            { $set: { status: 'failed', failedAt: new Date() } }
          );
          await inventoryService.releaseReservation(reservationId);

          const err = new Error('Stripe not configured');
          (err as any).code = 'ORDER_STRIPE_NOT_CONFIGURED';
          (err as any).statusCode = 500;
          throw err;
        }

        try {
          const stripe = new Stripe(stripeKey);
          const pi = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: currency.toLowerCase(),
            metadata: { orderId, tenantId, businessId },
          });

          validateTransition(order.status as OrderStatus, 'awaiting_payment');
          await StorefrontOrder.updateOne(
            { _id: order._id },
            {
              $set: {
                status: 'awaiting_payment',
                paymentIntentId: pi.id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
              },
            }
          );

          await PaymentAttempt.create({
            orderId,
            tenantId,
            provider: 'stripe',
            type: 'create_intent',
            status: 'success',
            response: { paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency },
            correlationId,
          });

          result.status = 'awaiting_payment';
          result.clientSecret = pi.client_secret ?? undefined;
        } catch (stripeErr) {
          await StorefrontOrder.updateOne(
            { _id: order._id },
            { $set: { status: 'failed', paymentStatus: 'failed', failedAt: new Date() } }
          );
          await inventoryService.releaseReservation(reservationId);

          await PaymentAttempt.create({
            orderId,
            tenantId,
            provider: 'stripe',
            type: 'create_intent',
            status: 'failed',
            error: (stripeErr as Error).message,
            correlationId,
          });

          log.error('Stripe PaymentIntent creation failed', {
            orderId,
            tenantId,
            error: (stripeErr as Error).message,
          });

          const err = new Error('Payment processing failed');
          (err as any).code = 'ORDER_PAYMENT_FAILED';
          (err as any).statusCode = 500;
          throw err;
        }
        break;
      }

      // ── Manual payment methods ────────────────────────────────
      case 'instapay':
      case 'vodafone_cash':
      case 'bank_transfer':
      case 'paymob':
      case 'fawry': {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

        validateTransition(order.status as OrderStatus, 'awaiting_payment');
        await StorefrontOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'awaiting_payment',
              paymentStatus: 'awaiting_manual_confirmation',
              expiresAt,
            },
          }
        );

        await PaymentAttempt.create({
          orderId,
          tenantId,
          provider: data.paymentMethod,
          type: 'create_intent',
          status: 'pending',
          correlationId,
        });

        result.status = 'awaiting_payment';
        result.paymentStatus = 'awaiting_manual_confirmation';
        result.instructions = methodConfig.instructions || 'Please complete payment using the provided method.';

        // Include public-safe payment details
        const paymentDetails: Record<string, unknown> = {};
        if (methodConfig.accountName) paymentDetails.accountName = methodConfig.accountName;
        if (methodConfig.accountNumber) paymentDetails.accountNumber = methodConfig.accountNumber;
        if (methodConfig.phoneNumber) paymentDetails.phoneNumber = methodConfig.phoneNumber;
        if (methodConfig.bankName) paymentDetails.bankName = methodConfig.bankName;
        if (methodConfig.iban) paymentDetails.iban = methodConfig.iban;
        if (Object.keys(paymentDetails).length > 0) {
          result.paymentDetails = paymentDetails;
        }
        break;
      }

      default: {
        validateTransition(order.status as OrderStatus, 'awaiting_payment');
        await StorefrontOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'awaiting_payment',
              paymentStatus: 'awaiting_manual_confirmation',
            },
          }
        );
        result.status = 'awaiting_payment';
        result.paymentStatus = 'awaiting_manual_confirmation';
        break;
      }
    }
  } catch (paymentErr) {
    // If it's one of our coded errors, re-throw as is
    if ((paymentErr as any).code) throw paymentErr;

    // Unexpected error during payment: compensate
    log.error('Unexpected payment processing error', {
      orderId,
      tenantId,
      error: (paymentErr as Error).message,
    });
    try {
      await StorefrontOrder.updateOne(
        { _id: order._id },
        { $set: { status: 'failed', failedAt: new Date() } }
      );
      await inventoryService.releaseReservation(reservationId);
    } catch (compErr) {
      log.error('CRITICAL: Compensation failed after payment error', {
        orderId,
        reservationId,
        error: (compErr as Error).message,
      });
    }
    throw paymentErr;
  }

  // 10. Emit order.created
  await eventBus.safePublish('order.created', {
    orderId,
    tenantId,
    businessId,
    total,
    currency,
    paymentMethod: data.paymentMethod,
    itemCount: cartData.items.length,
    reservationId,
  }, { tenantId, correlationId });

  // 11. Audit log
  await auditService.log({
    actor: 'customer',
    actorType: 'user',
    module: 'orders',
    action: 'order.create',
    entityType: 'order',
    entityId: orderId,
    tenantId,
    correlationId,
    details: {
      paymentMethod: data.paymentMethod,
      total,
      currency,
      itemCount: cartData.items.length,
    },
  });

  log.info('Order created', {
    orderId,
    tenantId,
    paymentMethod: data.paymentMethod,
    total: String(total),
  });

  return result;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

async function getOrder(orderId: string, tenantId?: string): Promise<IStorefrontOrder | null> {
  const filter: Record<string, unknown> = { orderId };
  if (tenantId) filter.tenantId = tenantId;
  return StorefrontOrder.findOne(filter);
}

async function getOrderByLookupToken(
  orderId: string,
  publicLookupToken: string
): Promise<Record<string, unknown> | null> {
  return StorefrontOrder.findOne({ orderId, publicLookupToken })
    .select(
      '-paymentDetails -paymentIntentId -paymentProviderOrderId -ipAddress -userAgent -idempotencyKey -checkoutSessionId -cartSnapshotHash -cartToken'
    )
    .lean() as Promise<Record<string, unknown> | null>;
}

// ---------------------------------------------------------------------------
// Status management
// ---------------------------------------------------------------------------

async function updateStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor: string,
  reason?: string,
  correlationId?: string
): Promise<IStorefrontOrder> {
  const order = await StorefrontOrder.findOne({ orderId });
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    (err as any).code = 'ORDER_NOT_FOUND';
    (err as any).statusCode = 404;
    throw err;
  }

  // Enforce state machine
  validateTransition(order.status as OrderStatus, newStatus);

  // Build update
  const $set: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'confirmed') $set.confirmedAt = new Date();
  if (newStatus === 'cancelled') $set.cancelledAt = new Date();
  if (newStatus === 'failed') $set.failedAt = new Date();

  const updated = await StorefrontOrder.findOneAndUpdate(
    { orderId },
    { $set },
    { new: true }
  );
  if (!updated) throw new Error(`Order update failed: ${orderId}`);

  // Emit event
  const eventType = `order.${newStatus}`;
  await eventBus.safePublish(eventType, {
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
    previousStatus: order.status,
    newStatus,
    reason,
  }, { tenantId: order.tenantId, correlationId: correlationId || undefined });

  // Audit log
  await auditService.log({
    actor,
    actorType: 'user',
    module: 'orders',
    action: `order.status.${newStatus}`,
    entityType: 'order',
    entityId: orderId,
    tenantId: order.tenantId,
    details: {
      previousStatus: order.status,
      newStatus,
      reason,
    },
  });

  log.info('Order status updated', {
    orderId,
    from: order.status,
    to: newStatus,
    actor,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

async function cancelOrder(
  orderId: string,
  reason: string,
  actor: string,
  correlationId?: string
): Promise<IStorefrontOrder> {
  const order = await StorefrontOrder.findOne({ orderId });
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    (err as any).code = 'ORDER_NOT_FOUND';
    (err as any).statusCode = 404;
    throw err;
  }

  if (isTerminal(order.status as OrderStatus)) {
    const err = new Error(`Cannot cancel order in terminal status: ${order.status}`);
    (err as any).code = 'ORDER_ALREADY_TERMINAL';
    (err as any).statusCode = 409;
    throw err;
  }

  if (order.status === 'delivered') {
    const err = new Error('Cannot cancel a delivered order; use return flow instead');
    (err as any).code = 'ORDER_DELIVERED_USE_RETURN';
    (err as any).statusCode = 409;
    throw err;
  }

  // Update status through state machine
  const updated = await updateStatus(orderId, 'cancelled', actor, reason, correlationId);

  // Release inventory reservation if active
  const reservationId = (order.paymentDetails as Record<string, unknown>)?.reservationId as string | undefined;
  if (reservationId) {
    try {
      await inventoryService.releaseReservation(reservationId);
      log.info('Reservation released on cancellation', { orderId, reservationId });
    } catch (releaseErr) {
      // Reservation may already be released or expired; log but don't fail
      log.warn('Failed to release reservation on cancellation', {
        orderId,
        reservationId,
        error: (releaseErr as Error).message,
      });
    }
  }

  // Emit specific cancellation event
  await eventBus.safePublish('order.cancelled', {
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
    reason,
    reservationId,
  }, { tenantId: order.tenantId, correlationId: correlationId || undefined });

  return updated;
}

// ---------------------------------------------------------------------------
// Stripe webhook handling
// ---------------------------------------------------------------------------

async function handleStripeWebhook(
  eventType: string,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const piId = paymentIntent.id;
  const correlationId = uuidv4();

  const order = await StorefrontOrder.findOne({ paymentIntentId: piId });
  if (!order) {
    log.warn('Stripe webhook: no matching order for PaymentIntent', { paymentIntentId: piId });
    return;
  }

  const orderId = order.orderId;
  const tenantId = order.tenantId;

  switch (eventType) {
    case 'payment_intent.succeeded': {
      // Idempotency: already paid
      if (order.paymentStatus === 'paid') {
        log.info('Stripe webhook: order already paid, skipping', { orderId });
        return;
      }

      await PaymentAttempt.create({
        orderId,
        tenantId,
        provider: 'stripe',
        type: 'webhook_received',
        status: 'success',
        response: {
          paymentIntentId: piId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        correlationId,
      });

      validateTransition(order.status as OrderStatus, 'confirmed');
      await StorefrontOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: 'paid',
            status: 'confirmed',
            confirmedAt: new Date(),
            paymentDetails: {
              ...(order.paymentDetails as Record<string, unknown> || {}),
              stripePaymentIntentId: piId,
              stripeAmount: paymentIntent.amount,
              stripeCurrency: paymentIntent.currency,
            },
          },
        }
      );

      await eventBus.safePublish('order.confirmed', {
        orderId,
        tenantId,
        businessId: order.businessId,
        paymentMethod: 'stripe',
        total: order.total,
      }, { tenantId, correlationId });

      await auditService.log({
        actor: 'stripe_webhook',
        actorType: 'system' as any,
        module: 'orders',
        action: 'order.payment.succeeded',
        entityType: 'order',
        entityId: orderId,
        tenantId,
        correlationId,
        details: { paymentIntentId: piId },
      });

      log.info('Stripe payment succeeded', { orderId, paymentIntentId: piId });
      break;
    }

    case 'payment_intent.payment_failed': {
      // Idempotency: already failed
      if (order.paymentStatus === 'failed' && order.status === 'failed') {
        log.info('Stripe webhook: order already failed, skipping', { orderId });
        return;
      }

      await PaymentAttempt.create({
        orderId,
        tenantId,
        provider: 'stripe',
        type: 'webhook_received',
        status: 'failed',
        error: paymentIntent.last_payment_error?.message || 'Payment failed',
        correlationId,
      });

      if (canTransition(order.status as OrderStatus, 'failed')) {
        await StorefrontOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'failed',
              failedAt: new Date(),
            },
          }
        );

        // Release reservation
        const reservationId = (order.paymentDetails as Record<string, unknown>)?.reservationId as string | undefined;
        if (reservationId) {
          try {
            await inventoryService.releaseReservation(reservationId);
          } catch (releaseErr) {
            log.warn('Failed to release reservation on payment failure', {
              orderId,
              reservationId,
              error: (releaseErr as Error).message,
            });
          }
        }

        await eventBus.safePublish('order.failed', {
          orderId,
          tenantId,
          businessId: order.businessId,
          reason: 'stripe_payment_failed',
        }, { tenantId, correlationId });
      }

      await auditService.log({
        actor: 'stripe_webhook',
        actorType: 'system' as any,
        module: 'orders',
        action: 'order.payment.failed',
        entityType: 'order',
        entityId: orderId,
        tenantId,
        correlationId,
        details: {
          paymentIntentId: piId,
          error: paymentIntent.last_payment_error?.message,
        },
      });

      log.warn('Stripe payment failed', { orderId, paymentIntentId: piId });
      break;
    }

    case 'charge.refunded': {
      if (order.paymentStatus === 'refunded') {
        log.info('Stripe webhook: order already refunded, skipping', { orderId });
        return;
      }

      await PaymentAttempt.create({
        orderId,
        tenantId,
        provider: 'stripe',
        type: 'refund',
        status: 'success',
        response: { paymentIntentId: piId },
        correlationId,
      });

      await StorefrontOrder.updateOne(
        { _id: order._id },
        { $set: { paymentStatus: 'refunded' } }
      );

      await eventBus.safePublish('order.refunded', {
        orderId,
        tenantId,
        businessId: order.businessId,
      }, { tenantId, correlationId });

      await auditService.log({
        actor: 'stripe_webhook',
        actorType: 'system' as any,
        module: 'orders',
        action: 'order.payment.refunded',
        entityType: 'order',
        entityId: orderId,
        tenantId,
        correlationId,
      });

      log.info('Stripe refund processed', { orderId, paymentIntentId: piId });
      break;
    }

    default:
      log.debug('Stripe webhook: unhandled event type', { eventType, orderId });
  }
}

// ---------------------------------------------------------------------------
// Manual payment confirmation
// ---------------------------------------------------------------------------

async function confirmManualPayment(
  orderId: string,
  paymentReference: string,
  notes: string | undefined,
  actor: string
): Promise<IStorefrontOrder> {
  const correlationId = uuidv4();

  const order = await StorefrontOrder.findOne({ orderId });
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    (err as any).code = 'ORDER_NOT_FOUND';
    (err as any).statusCode = 404;
    throw err;
  }

  if (order.paymentStatus !== 'awaiting_manual_confirmation') {
    const err = new Error(`Order payment status is ${order.paymentStatus}, expected awaiting_manual_confirmation`);
    (err as any).code = 'ORDER_WRONG_PAYMENT_STATUS';
    (err as any).statusCode = 409;
    throw err;
  }

  // Validate transition
  validateTransition(order.status as OrderStatus, 'confirmed');

  // Update order
  const updateNotes = notes
    ? ((order.notes || '') + '\nCustomer: ' + notes).trim()
    : order.notes;

  const updated = await StorefrontOrder.findOneAndUpdate(
    { orderId },
    {
      $set: {
        paymentReference,
        paymentStatus: 'pending', // Now pending admin review
        status: 'confirmed',
        confirmedAt: new Date(),
        notes: updateNotes,
      },
    },
    { new: true }
  );
  if (!updated) throw new Error(`Order update failed: ${orderId}`);

  // Record payment attempt
  await PaymentAttempt.create({
    orderId,
    tenantId: order.tenantId,
    provider: order.paymentMethod,
    type: 'manual_confirm',
    status: 'success',
    request: { paymentReference, notes },
    correlationId,
  });

  // Emit event
  await eventBus.safePublish('order.confirmed', {
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
    paymentMethod: order.paymentMethod,
    paymentReference,
  }, { tenantId: order.tenantId, correlationId });

  // Audit
  await auditService.log({
    actor,
    actorType: 'user',
    module: 'orders',
    action: 'order.manual_payment_confirmed',
    entityType: 'order',
    entityId: orderId,
    tenantId: order.tenantId,
    correlationId,
    details: { paymentReference, paymentMethod: order.paymentMethod },
  });

  log.info('Manual payment confirmed', {
    orderId,
    paymentMethod: order.paymentMethod,
    actor,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Return initiation
// ---------------------------------------------------------------------------

async function initiateReturn(
  orderId: string,
  items: Array<{
    lineItemIndex: number;
    returnQuantity: number;
    reason?: string;
  }>,
  reason: string,
  actor: string
): Promise<{ returnId: string }> {
  const correlationId = uuidv4();

  const order = await StorefrontOrder.findOne({ orderId });
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    (err as any).code = 'ORDER_NOT_FOUND';
    (err as any).statusCode = 404;
    throw err;
  }

  // Verify order status allows return
  const allowedForReturn: OrderStatus[] = ['delivered', 'shipped'];
  if (!allowedForReturn.includes(order.status as OrderStatus)) {
    const err = new Error(`Cannot initiate return for order in status: ${order.status}`);
    (err as any).code = 'ORDER_RETURN_NOT_ALLOWED';
    (err as any).statusCode = 409;
    throw err;
  }

  // Validate items against order line items
  const returnItems: IReturnItem[] = [];
  for (const reqItem of items) {
    if (reqItem.lineItemIndex < 0 || reqItem.lineItemIndex >= order.items.length) {
      const err = new Error(`Invalid line item index: ${reqItem.lineItemIndex}`);
      (err as any).code = 'ORDER_RETURN_INVALID_ITEM';
      (err as any).statusCode = 400;
      throw err;
    }

    const orderItem = order.items[reqItem.lineItemIndex];
    if (reqItem.returnQuantity > orderItem.quantity) {
      const err = new Error(
        `Return quantity (${reqItem.returnQuantity}) exceeds ordered quantity (${orderItem.quantity}) for item at index ${reqItem.lineItemIndex}`
      );
      (err as any).code = 'ORDER_RETURN_EXCEEDS_QUANTITY';
      (err as any).statusCode = 400;
      throw err;
    }

    returnItems.push({
      lineItemIndex: reqItem.lineItemIndex,
      productId: orderItem.productId,
      variantId: orderItem.variantId,
      name: orderItem.name,
      orderedQuantity: orderItem.quantity,
      returnQuantity: reqItem.returnQuantity,
    });
  }

  // Determine return type
  const totalOrderedQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalReturnQty = returnItems.reduce((sum, i) => sum + i.returnQuantity, 0);
  const returnType = totalReturnQty >= totalOrderedQty ? 'full' : 'partial';

  // Create return record
  const returnDoc = await Return.create({
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
    type: returnType,
    status: 'requested',
    items: returnItems,
    reason,
    createdBy: actor,
  });

  // Emit event
  await eventBus.safePublish('return.requested', {
    returnId: returnDoc.returnId,
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
    type: returnType,
    itemCount: returnItems.length,
  }, { tenantId: order.tenantId, correlationId });

  // Audit
  await auditService.log({
    actor,
    actorType: 'user',
    module: 'orders',
    action: 'return.initiate',
    entityType: 'return',
    entityId: returnDoc.returnId,
    tenantId: order.tenantId,
    correlationId,
    details: {
      orderId,
      type: returnType,
      itemCount: returnItems.length,
      reason,
    },
  });

  log.info('Return initiated', {
    returnId: returnDoc.returnId,
    orderId,
    type: returnType,
  });

  return { returnId: returnDoc.returnId };
}

// ---------------------------------------------------------------------------
// Expire order
// ---------------------------------------------------------------------------

async function expireOrder(orderId: string): Promise<void> {
  const order = await StorefrontOrder.findOne({ orderId });
  if (!order) {
    log.warn('Expire: order not found', { orderId });
    return;
  }

  if (order.status !== 'awaiting_payment') {
    log.debug('Expire: order not in awaiting_payment status, skipping', {
      orderId,
      status: order.status,
    });
    return;
  }

  // Validate transition
  validateTransition(order.status as OrderStatus, 'expired');

  await StorefrontOrder.updateOne(
    { _id: order._id },
    { $set: { status: 'expired' } }
  );

  // Release reservation
  const reservationId = (order.paymentDetails as Record<string, unknown>)?.reservationId as string | undefined;
  if (reservationId) {
    try {
      await inventoryService.releaseReservation(reservationId);
      log.info('Reservation released on expiration', { orderId, reservationId });
    } catch (releaseErr) {
      log.warn('Failed to release reservation on expiration', {
        orderId,
        reservationId,
        error: (releaseErr as Error).message,
      });
    }
  }

  await eventBus.safePublish('order.expired', {
    orderId,
    tenantId: order.tenantId,
    businessId: order.businessId,
  }, { tenantId: order.tenantId });

  await auditService.log({
    actor: 'system',
    actorType: 'system' as any,
    module: 'orders',
    action: 'order.expired',
    entityType: 'order',
    entityId: orderId,
    tenantId: order.tenantId,
  });

  log.info('Order expired', { orderId });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ordersService = {
  createOrder,
  getOrder,
  getOrderByLookupToken,
  updateStatus,
  cancelOrder,
  handleStripeWebhook,
  confirmManualPayment,
  initiateReturn,
  expireOrder,
};
