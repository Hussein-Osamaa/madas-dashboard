/**
 * Shared event type definitions for the XDIGIX platform.
 *
 * Every event published through the event bus MUST use one of these types.
 * This file is the single source of truth for event names and payload shapes.
 *
 * Payload rules:
 * - tenantId: always present
 * - correlationId: present when triggered by a request (null for system-triggered)
 * - actor: present for user-initiated actions
 * - entityId: the primary entity affected
 * - timestamps: createdAt for when the entity was created
 */

/* ── Event Type Constants ─────────────────────────────────────── */

// Orders
export const ORDER_CREATED = 'order.created';
export const ORDER_CONFIRMED = 'order.confirmed';
export const ORDER_CANCELLED = 'order.cancelled';
export const ORDER_EXPIRED = 'order.expired';
export const ORDER_FAILED = 'order.failed';
export const ORDER_SHIPPED = 'order.shipped';
export const ORDER_DELIVERED = 'order.delivered';
export const ORDER_REFUNDED = 'order.refunded';

// Returns
export const RETURN_REQUESTED = 'return.requested';
export const RETURN_APPROVED = 'return.approved';
export const RETURN_RESOLVED = 'return.resolved';

// Inventory
export const PRODUCT_CREATED = 'product.created';
export const PRODUCT_UPDATED = 'product.updated';
export const PRODUCT_DELETED = 'product.deleted';
export const STOCK_RESERVED = 'stock.reserved';
export const STOCK_RELEASED = 'stock.released';
export const STOCK_FULFILLED = 'stock.fulfilled';
export const STOCK_ADJUSTED = 'stock.adjusted';
export const STOCK_LOW = 'stock.low';

// Builder
export const SITE_PUBLISHED = 'site.published';
export const SITE_ROLLBACK = 'site.rollback';
export const SITE_UNPUBLISHED = 'site.unpublished';

// Tenant
export const TENANT_CREATED = 'tenant.created';
export const TENANT_SUSPENDED = 'tenant.suspended';
export const TENANT_ACTIVATED = 'tenant.activated';
export const TENANT_CANCELLED = 'tenant.cancelled';
export const TENANT_PLAN_CHANGED = 'tenant.plan_changed';
export const TENANT_GRACE_EXPIRED = 'tenant.grace_expired';

// Auth
export const USER_CREATED = 'user.created';
export const USER_SUSPENDED = 'user.suspended';

/* ── Payload Interfaces ───────────────────────────────────────── */

/** Base payload that all events must include */
export interface BaseEventPayload {
  tenantId: string;
  [key: string]: unknown;
}

/** Base metadata for event publishing */
export interface EventMetadata {
  tenantId: string;
  correlationId?: string;
}

export interface OrderEventPayload extends BaseEventPayload {
  orderId: string;
  businessId: string;
}

export interface StockEventPayload extends BaseEventPayload {
  productId?: string;
  reservationId?: string;
  businessId: string;
}

export interface SiteEventPayload extends BaseEventPayload {
  siteId: string;
  version?: number;
  actor?: string;
}

export interface TenantEventPayload extends BaseEventPayload {
  reason?: string;
  actor?: string;
}
