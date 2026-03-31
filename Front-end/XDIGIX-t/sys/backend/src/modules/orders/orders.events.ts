/**
 * Orders event handlers.
 *
 * Consumes shipping events to update order status at the correct milestones:
 * - shipment.picked_up → order status = shipped (Rule 24)
 * - shipment.delivered → order status = delivered (Rule 25)
 * - shipment.returned_to_sender → initiate return flow
 */
import { eventBus } from '../platform-core/event-bus.service';
import { StorefrontOrder } from '../../schemas/storefront-order.schema';
import { createLogger } from '../../lib/logger';
import { auditService } from '../platform-core/audit.service';

const log = createLogger('orders-events');

export function registerOrdersEventHandlers(): void {
  // shipment.picked_up → order status = shipped
  eventBus.subscribe('shipment.picked_up', async (event) => {
    const p = event.payload as Record<string, any>;
    const { orderId, tenantId } = p;
    if (!orderId) return;

    const order = await StorefrontOrder.findOne({ orderId, tenantId });
    if (!order) { log.warn('Order not found for shipment.picked_up', { orderId }); return; }
    if (['shipped', 'delivered', 'cancelled', 'failed', 'expired', 'returned'].includes(order.status as string)) return; // idempotent

    await StorefrontOrder.updateOne({ _id: order._id }, { $set: { status: 'shipped' } });

    await auditService.log({
      actor: 'system', actorType: 'system', module: 'orders',
      action: 'order.shipped', entityType: 'order', entityId: orderId,
      tenantId, correlationId: event.correlationId,
      details: { previousStatus: order.status, trigger: 'shipment.picked_up', shipmentId: p.shipmentId },
    });

    log.info('Order marked shipped on carrier pickup', { orderId, tenantId });
  });

  // shipment.delivered → order status = delivered
  eventBus.subscribe('shipment.delivered', async (event) => {
    const p = event.payload as Record<string, any>;
    const { orderId, tenantId } = p;
    if (!orderId) return;

    const order = await StorefrontOrder.findOne({ orderId, tenantId });
    if (!order) { log.warn('Order not found for shipment.delivered', { orderId }); return; }
    if (['delivered', 'cancelled', 'failed', 'expired', 'returned'].includes(order.status as string)) return; // idempotent

    await StorefrontOrder.updateOne({ _id: order._id }, { $set: { status: 'delivered' } });

    await auditService.log({
      actor: 'system', actorType: 'system', module: 'orders',
      action: 'order.delivered', entityType: 'order', entityId: orderId,
      tenantId, correlationId: event.correlationId,
      details: { previousStatus: order.status, trigger: 'shipment.delivered', shipmentId: p.shipmentId },
    });

    log.info('Order marked delivered on carrier confirmation', { orderId, tenantId });
  });

  // shipment.returned_to_sender → initiate return flow
  eventBus.subscribe('shipment.returned_to_sender', async (event) => {
    const p = event.payload as Record<string, any>;
    const { orderId, tenantId } = p;
    if (!orderId) return;

    log.info('Shipment returned to sender — return flow should be initiated', { orderId, tenantId, shipmentId: p.shipmentId });
    // Foundation: log the event. Full auto-return creation will be added
    // when the return workflow is fully wired (requires merchant decision).
  });

  log.info('Orders event handlers registered');
}
