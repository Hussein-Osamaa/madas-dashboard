/**
 * Order lifecycle → inventory. Uses new InventoryService.recordTransaction.
 * Also updates product data.stock directly so storefront sees real-time availability.
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
import { FirestoreDoc } from '../schemas/document.schema';

type OrderItem = { productId: string; quantity: number; size?: string };

/**
 * Adjust product data.stock for a specific size.
 * delta < 0 = deduct (order placed), delta > 0 = restore (cancel/return).
 */
async function adjustProductStock(clientId: string, items: OrderItem[], delta: 1 | -1): Promise<void> {
  for (const item of items) {
    if (!item.productId || !item.quantity) continue;
    const doc = await FirestoreDoc.findOne(
      { businessId: clientId, coll: 'products', docId: item.productId },
      { 'data.stock': 1 },
    ).lean();
    if (!doc) continue;
    const stockMap = (((doc as { data?: Record<string, unknown> }).data ?? {}).stock ?? {}) as Record<string, number>;
    const sizeKey = item.size || Object.keys(stockMap)[0] || '_default';
    const current = Number(stockMap[sizeKey]) || 0;
    const updated = Math.max(0, current + (item.quantity * delta));
    await FirestoreDoc.updateOne(
      { businessId: clientId, coll: 'products', docId: item.productId },
      { $set: { [`data.stock.${sizeKey}`]: updated } },
    );
  }
}

orderEvents.on(ORDER_CREATED, async (payload: { clientId: string; orderId: string; items: OrderItem[] }) => {
  try {
    const items = payload.items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
    await onOrderCreated(payload.clientId, payload.orderId, items);
    // Deduct from product data.stock so storefront shows updated availability
    await adjustProductStock(payload.clientId, items, -1);
  } catch (err) {
    console.error('[orderInventoryIntegration] ORDER_CREATED:', err);
  }
});

orderEvents.on(ORDER_STATUS_CHANGED, async (payload: { clientId: string; orderId: string; previousStatus?: string; newStatus: string; items: Array<{ productId: string; quantity: number; size?: string }> }) => {
  try {
    const { clientId, orderId, previousStatus, newStatus, items } = payload;
    const itemList = items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
    const wasReserved = ['pending', 'processing', 'preparing_for_pickup', 'ready_for_pickup'].includes(previousStatus || '');
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
      // Restore product data.stock so items become available again
      await adjustProductStock(clientId, itemList, +1);
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
      // Restore product data.stock so items become available again
      await adjustProductStock(clientId, itemList, +1);
    }
  } catch (err) {
    console.error('[orderInventoryIntegration] ORDER_STATUS_CHANGED:', err);
  }
});
