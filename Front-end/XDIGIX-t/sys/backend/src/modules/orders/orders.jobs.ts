import { StorefrontOrder } from '../../schemas/storefront-order.schema';
import { ordersService } from './orders.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('orders');

/** TTL thresholds for order expiration by payment method. */
const EXPIRATION_TTL: Record<string, number> = {
  stripe: 30 * 60 * 1000,            // 30 minutes
  cod: 30 * 60 * 1000,               // 30 minutes (should be confirmed immediately)
  instapay: 48 * 60 * 60 * 1000,     // 48 hours
  vodafone_cash: 48 * 60 * 60 * 1000,// 48 hours
  bank_transfer: 48 * 60 * 60 * 1000,// 48 hours
  paymob: 48 * 60 * 60 * 1000,       // 48 hours
  fawry: 48 * 60 * 60 * 1000,        // 48 hours
};

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes fallback

/**
 * Find and expire orders stuck in awaiting_payment beyond their TTL.
 * Intended to be called on a recurring schedule (e.g., every 5 minutes).
 *
 * @returns The number of orders expired in this run.
 */
export async function processExpiredOrders(): Promise<number> {
  const now = Date.now();
  let expiredCount = 0;

  try {
    // Build cutoff per payment method — only fetch orders that are past their TTL
    const oldestTTL = Math.max(...Object.values(EXPIRATION_TTL), DEFAULT_TTL);
    const cutoff = new Date(now - oldestTTL);

    const pendingOrders = await StorefrontOrder.find({
      status: 'awaiting_payment',
      createdAt: { $lt: cutoff },
    })
      .select('orderId paymentMethod createdAt')
      .lean();

    for (const order of pendingOrders) {
      const ttl = EXPIRATION_TTL[order.paymentMethod] ?? DEFAULT_TTL;
      const orderAge = now - new Date(order.createdAt).getTime();

      if (orderAge > ttl) {
        try {
          // Atomic claim: only expire if still awaiting_payment
          const claimed = await StorefrontOrder.findOneAndUpdate(
            { orderId: order.orderId, status: 'awaiting_payment' },
            { $set: { status: 'expired' } },
            { new: false },
          );
          if (!claimed) continue; // already changed by another worker or user action

          await ordersService.expireOrder(order.orderId);
          expiredCount++;
        } catch (err) {
          log.error('Failed to expire order', {
            orderId: order.orderId,
            error: (err as Error).message,
          });
        }
      }
    }

    if (expiredCount > 0) {
      log.info('Expired orders processed', { count: String(expiredCount) });
    }
  } catch (err) {
    log.error('processExpiredOrders job failed', { error: (err as Error).message });
  }

  return expiredCount;
}
