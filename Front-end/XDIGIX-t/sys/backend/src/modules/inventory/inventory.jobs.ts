import { Reservation } from './reservation.schema';
import { Product, IProduct, IVariantStock } from './product.schema';
import { inventoryService } from './inventory.service';
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('inventory-jobs');

/**
 * Find and release all expired active reservations.
 * Should be called periodically (e.g. every minute via cron or setInterval).
 */
export async function processExpiredReservations(): Promise<number> {
  const now = new Date();
  const expired = await Reservation.find({
    status: 'active',
    expiresAt: { $lt: now },
  });

  if (expired.length === 0) return 0;

  log.info(`Processing ${expired.length} expired reservations`);

  let released = 0;
  for (const reservation of expired) {
    try {
      await inventoryService.releaseReservation(reservation.reservationId);
      // Also mark as expired (releaseReservation sets 'released', override to 'expired')
      await Reservation.findOneAndUpdate(
        { reservationId: reservation.reservationId },
        { $set: { status: 'expired' } }
      );
      released++;
    } catch (err) {
      log.error(`Failed to release expired reservation ${reservation.reservationId}`, {
        error: (err as Error).message,
        reservationId: reservation.reservationId,
      });
    }
  }

  log.info(`Released ${released}/${expired.length} expired reservations`);
  return released;
}

/**
 * Scan all active products for a tenant/business and emit low-stock events.
 * Should be run periodically (e.g. daily) as a safety net.
 */
export async function checkAllLowStock(
  tenantId: string,
  businessId: string
): Promise<number> {
  const products = await Product.find({
    tenantId,
    businessId,
    deleted: { $ne: true },
    status: 'active',
    lowStockThreshold: { $gt: 0 },
  });

  log.info(`Checking low stock for ${products.length} products`, { tenantId, businessId });

  let alertCount = 0;
  for (const product of products) {
    const stock = (product.stock ?? {}) as Record<string, IVariantStock>;
    const lowVariants: Array<{ variant: string; available: number }> = [];

    for (const [key, s] of Object.entries(stock)) {
      const available = s.on_hand - s.reserved - s.damaged - s.missing;
      if (available < product.lowStockThreshold) {
        lowVariants.push({ variant: key, available });
      }
    }

    if (lowVariants.length > 0) {
      await eventBus.publish('stock.low', {
        productId: product._id.toString(),
        tenantId,
        businessId,
        productName: product.name,
        threshold: product.lowStockThreshold,
        lowVariants,
      }, { tenantId });
      alertCount++;
    }
  }

  log.info(`Low stock check complete: ${alertCount} alerts`, { tenantId, businessId });
  return alertCount;
}
