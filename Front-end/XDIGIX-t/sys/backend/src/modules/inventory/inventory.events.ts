/**
 * Inventory event handlers.
 *
 * Consumes shipping/return events to update stock:
 * - shipment.delivered → confirmFulfillment (on_hand -= qty, reserved -= qty)
 * - return.inspected → adjustStock based on condition
 */
import { eventBus } from '../platform-core/event-bus.service';
import { inventoryService } from './inventory.service';
import { StorefrontOrder } from '../../schemas/storefront-order.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('inventory-events');

export function registerInventoryEventHandlers(): void {
  // shipment.delivered → confirm fulfillment (convert reserved → sold)
  eventBus.subscribe('shipment.delivered', async (event) => {
    const p = event.payload as Record<string, any>;
    const { orderId, tenantId } = p;
    if (!orderId) return;

    // Find reservation from order
    const order = await StorefrontOrder.findOne({ orderId, tenantId }).lean();
    if (!order) { log.warn('Order not found for fulfillment confirmation', { orderId }); return; }

    const reservationId = (order as any).reservationId || (order as any).paymentDetails?.reservationId;
    if (!reservationId) {
      log.warn('No reservationId found on order for fulfillment confirmation', { orderId });
      return;
    }

    try {
      await inventoryService.confirmFulfillment(reservationId);
      log.info('Inventory fulfillment confirmed on delivery', { orderId, reservationId, tenantId });
    } catch (err) {
      // May already be fulfilled (idempotent) — log and continue
      log.warn('Fulfillment confirmation failed (may already be fulfilled)', {
        orderId, reservationId, error: (err as Error).message,
      });
    }
  });

  // return.inspected → adjust stock based on condition
  eventBus.subscribe('return.inspected', async (event) => {
    const p = event.payload as Record<string, any>;
    const { returnId, tenantId, businessId, productId, variantId, qty, condition } = p;
    if (!productId || !condition) {
      log.warn('return.inspected missing productId or condition', { returnId });
      return;
    }

    try {
      if (condition === 'good') {
        await inventoryService.adjustStock(tenantId, productId, variantId || '', qty || 1, 'return', `Return ${returnId} - good condition`, 'system');
        log.info('Stock restocked from return (good condition)', { returnId, productId, variantId, qty });
      } else if (condition === 'damaged') {
        await inventoryService.recordDamage(tenantId, productId, variantId || '', qty || 1, `Return ${returnId} - damaged`, 'system');
        log.info('Stock recorded as damaged from return', { returnId, productId, variantId, qty });
      } else if (condition === 'missing') {
        await inventoryService.recordMissing(tenantId, productId, variantId || '', qty || 1, `Return ${returnId} - missing`, 'system');
        log.info('Stock recorded as missing from return', { returnId, productId, variantId, qty });
      }
    } catch (err) {
      log.error('Failed to adjust stock from return inspection', {
        returnId, productId, error: (err as Error).message,
      });
    }
  });

  log.info('Inventory event handlers registered');
}
