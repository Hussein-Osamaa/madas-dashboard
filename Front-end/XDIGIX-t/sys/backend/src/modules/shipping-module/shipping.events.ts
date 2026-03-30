/**
 * Shipping module event consumers.
 *
 * Subscribes to events from other modules (Fulfillment, Orders, Returns)
 * and triggers shipping actions.
 */

import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';
import { shippingService } from './shipping.service';
import { Shipment } from './shipment.schema';

// Lazy import to avoid circular dependency — StorefrontOrder is in schemas/
async function getStorefrontOrder() {
  const { StorefrontOrder } = await import('../../schemas/storefront-order.schema');
  return StorefrontOrder;
}

const log = createLogger('shipping');

export function registerShippingEventHandlers(): void {
  /**
   * fulfillment.packed -> create shipment
   * When fulfillment finishes packing, create an outbound shipment.
   */
  eventBus.subscribe('fulfillment.packed', async (event) => {
    const { orderId, tenantId, businessId, fulfillmentJobId } = event.payload as {
      orderId: string;
      tenantId: string;
      businessId: string;
      fulfillmentJobId: string;
    };

    const StorefrontOrder = await getStorefrontOrder();
    const order = await StorefrontOrder.findOne({ orderId, tenantId }).lean();
    if (!order) {
      log.warn(`fulfillment.packed: order not found for ${orderId}`, { tenantId });
      return;
    }

    const orderData = order as Record<string, unknown>;
    const shipping = (orderData.shipping as Record<string, unknown>) || {};

    await shippingService.createShipment(tenantId, businessId, orderId, {
      fulfillmentJobId,
      shippingAddress: {
        address: (shipping.address as string) || '',
        city: (shipping.city as string) || '',
        state: (shipping.state as string) || undefined,
        postalCode: (shipping.postalCode as string) || undefined,
        country: (shipping.country as string) || 'EG',
      },
      codAmount: orderData.paymentMethod === 'cod' ? (orderData.total as number) || 0 : 0,
    }, event.correlationId);
  });

  /**
   * order.cancelled -> cancel shipment if not yet picked up
   */
  eventBus.subscribe('order.cancelled', async (event) => {
    const { orderId, tenantId } = event.payload as { orderId: string; tenantId: string };

    const shipment = await Shipment.findOne({
      orderId,
      tenantId,
      status: { $in: ['created', 'label_generated', 'carrier_booked'] },
    });

    if (shipment) {
      await shippingService.cancelShipment(
        shipment.shipmentId,
        'Order cancelled',
        'system',
        event.correlationId,
      );
    }
  });

  /**
   * return.approved -> create return shipment
   */
  eventBus.subscribe('return.approved', async (event) => {
    const { returnId, orderId, tenantId, businessId } = event.payload as {
      returnId: string;
      orderId: string;
      tenantId: string;
      businessId: string;
    };

    const StorefrontOrder = await getStorefrontOrder();
    const order = await StorefrontOrder.findOne({ orderId, tenantId }).lean();
    if (!order) {
      log.warn(`return.approved: order not found for ${orderId}`, { tenantId });
      return;
    }

    const orderData = order as Record<string, unknown>;
    const shipping = (orderData.shipping as Record<string, unknown>) || {};

    await shippingService.createReturnShipment(tenantId, businessId, returnId, orderId, {
      shippingAddress: {
        address: (shipping.address as string) || '',
        city: (shipping.city as string) || '',
        state: (shipping.state as string) || undefined,
        postalCode: (shipping.postalCode as string) || undefined,
        country: (shipping.country as string) || 'EG',
      },
    }, event.correlationId);
  });

  log.info('Shipping event handlers registered');
}
