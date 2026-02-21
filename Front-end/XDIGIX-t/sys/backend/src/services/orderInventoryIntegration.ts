/**
 * Order lifecycle → inventory. Uses new InventoryService.recordTransaction.
 */
import { orderEvents, ORDER_CREATED, ORDER_STATUS_CHANGED } from '../events/orderEvents';
import {
  onOrderCreated,
  onOrderHandedToCourier,
  onOrderDelivered,
  onOrderReturned,
  onOrderLost,
  onOrderDamaged,
} from '../modules/orders-integration/services/OrderInventory.service';
import { recordTransaction } from '../modules/inventory/services/Inventory.service';

orderEvents.on(ORDER_CREATED, async (payload: { clientId: string; orderId: string; items: Array<{ productId: string; quantity: number; size?: string }> }) => {
  try {
    const items = payload.items.map((i: { productId: string; quantity: number; size?: string }) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
    await onOrderCreated(payload.clientId, payload.orderId, items);
  } catch (err) {
    console.error('[orderInventoryIntegration] ORDER_CREATED:', err);
  }
});

orderEvents.on(ORDER_STATUS_CHANGED, async (payload: { clientId: string; orderId: string; previousStatus?: string; newStatus: string; items: Array<{ productId: string; quantity: number; size?: string }> }) => {
  try {
    const { clientId, orderId, previousStatus, newStatus, items } = payload;
    const itemList = items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
    const wasReserved = ['pending', 'processing', 'ready_for_pickup'].includes(previousStatus || '');
    const wasShipping = ['shipped', 'ready_for_shipment'].includes(previousStatus || '');

    if (newStatus === 'shipped' || newStatus === 'ready_for_shipment') {
      for (const item of itemList) {
        if (item.productId && item.quantity > 0 && wasReserved) {
          await recordTransaction({
            productId: item.productId,
            clientId,
            type: 'ADJUSTMENT',
            quantity: item.quantity,
            referenceId: `reverse-reserved:${orderId}`,
          });
        }
      }
      await onOrderHandedToCourier(clientId, orderId, itemList);
    } else if (newStatus === 'delivered' || newStatus === 'completed') {
      for (const item of itemList) {
        if (item.productId && item.quantity > 0) {
          if (wasShipping) {
            await recordTransaction({
              productId: item.productId,
              clientId,
              type: 'ADJUSTMENT',
              quantity: item.quantity,
              referenceId: `reverse-shipping:${orderId}`,
            });
          } else if (wasReserved) {
            await recordTransaction({
              productId: item.productId,
              clientId,
              type: 'ADJUSTMENT',
              quantity: item.quantity,
              referenceId: `reverse-reserved:${orderId}`,
            });
          }
        }
      }
      await onOrderDelivered(clientId, orderId, itemList);
    } else if (newStatus === 'returned') {
      await onOrderReturned(clientId, orderId, itemList);
    } else if (newStatus === 'damaged') {
      await onOrderDamaged(clientId, orderId, itemList);
    } else if (newStatus === 'lost') {
      await onOrderLost(clientId, orderId, itemList);
    } else if (newStatus === 'cancelled') {
      for (const item of itemList) {
        if (item.productId && item.quantity > 0) {
          if (wasReserved || wasShipping) {
            await recordTransaction({
              productId: item.productId,
              clientId,
              type: 'ADJUSTMENT',
              quantity: item.quantity,
              referenceId: `cancelled:${orderId}`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[orderInventoryIntegration] ORDER_STATUS_CHANGED:', err);
  }
});
