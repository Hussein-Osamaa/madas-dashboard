/**
 * OrderInventoryService - Order lifecycle → stock transactions.
 * Never directly edit stock. All changes via recordTransaction.
 */
import { recordTransaction } from '../../inventory/services/Inventory.service';
import type { StockTransactionType } from '../../inventory/models/StockTransaction.model';

export interface OrderItem {
  productId: string;
  quantity: number;
  size?: string;
}

export async function onOrderCreated(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'RESERVED',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}

export async function onOrderPicked(
  _clientId: string,
  _orderId: string,
  _items: OrderItem[]
): Promise<void> {
  // No stock change - still RESERVED
}

export async function onOrderHandedToCourier(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'SHIPPING',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}

export async function onOrderDelivered(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'SOLD',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}

export async function onOrderReturned(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'RETURNED',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}

export async function onOrderLost(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'MISSING',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}

export async function onOrderDamaged(
  clientId: string,
  orderId: string,
  items: OrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.productId && item.quantity > 0) {
      await recordTransaction({
        productId: item.productId,
        clientId,
        type: 'DAMAGED',
        quantity: item.quantity,
        referenceId: orderId,
      });
    }
  }
}
