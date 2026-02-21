/**
 * Order lifecycle events for inventory integration.
 * Orders emit events; inventory service handles stock via transactions.
 * Never modify stock directly in order controller.
 */
import { EventEmitter } from 'events';

export interface OrderCreatedPayload {
  clientId: string;
  orderId: string;
  items: Array<{ productId: string; quantity: number; size?: string }>;
}

export interface OrderStatusPayload {
  clientId: string;
  orderId: string;
  previousStatus?: string;
  newStatus: string;
  items: Array<{ productId: string; quantity: number; size?: string }>;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  size?: string;
}

export const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(20);

export const ORDER_CREATED = 'order:created';
export const ORDER_STATUS_CHANGED = 'order:status_changed';
