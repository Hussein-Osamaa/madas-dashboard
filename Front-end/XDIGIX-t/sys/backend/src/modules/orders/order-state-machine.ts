import { createLogger } from '../../lib/logger';

const log = createLogger('order-state-machine');

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'returned';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'awaiting_manual_confirmation';

// Valid transitions: from -> [allowed targets]
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['awaiting_payment', 'confirmed', 'failed', 'cancelled'],
  awaiting_payment: ['confirmed', 'failed', 'expired', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],   // terminal
  failed: [],      // terminal
  expired: [],     // terminal
  returned: [],    // terminal
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid order transition: ${from} -> ${to}`);
    (err as any).code = 'ORDER_INVALID_TRANSITION';
    log.warn(`Rejected transition: ${from} -> ${to}`);
    throw err;
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

// Valid payment status transitions
const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed', 'awaiting_manual_confirmation'],
  awaiting_manual_confirmation: ['paid', 'failed'],
  paid: ['refunded'],
  failed: ['pending'], // retry
  refunded: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return VALID_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
