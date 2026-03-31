import { eventBus } from '../platform-core/event-bus.service';
import { notificationService } from './notification.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('notification-events');

/**
 * Register event bus handlers that trigger notification delivery.
 * Notifications is a delivery module — it formats and sends, does not own business logic.
 */
export function registerNotificationEventHandlers(): void {
  // ── Customer notifications ──────────────────────────────────────

  eventBus.subscribe('order.confirmed', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.customer?.email) return;
    await notificationService.send(
      'email',
      p.customer.email,
      'order.confirmed',
      {
        firstName: p.customer?.firstName || 'Customer',
        orderId: p.orderId || '',
        total: String(p.total || ''),
        currency: p.currency || '',
      },
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  eventBus.subscribe('shipment.picked_up', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.customerEmail) return;
    await notificationService.send(
      'email',
      p.customerEmail,
      'shipment.picked_up',
      {
        firstName: p.customerFirstName || 'Customer',
        orderId: p.orderId || '',
        trackingNumber: p.trackingNumber || '',
      },
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  eventBus.subscribe('shipment.delivered', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.customerEmail) return;
    await notificationService.send(
      'email',
      p.customerEmail,
      'shipment.delivered',
      {
        firstName: p.customerFirstName || 'Customer',
        orderId: p.orderId || '',
      },
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  // ── Merchant notifications ──────────────────────────────────────

  eventBus.subscribe('stock.low', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.merchantEmail) return;
    await notificationService.send(
      'email',
      p.merchantEmail,
      'stock.low',
      {
        productName: p.productName || '',
        available: String(p.available || 0),
        threshold: String(p.threshold || 0),
      },
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  eventBus.subscribe('tenant.plan_changed', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.email) return;
    await notificationService.send(
      'email',
      p.email,
      'tenant.plan_changed',
      {
        newPlan: p.newPlan || '',
      },
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  eventBus.subscribe('tenant.grace_expired', async (event) => {
    const p = event.payload as Record<string, any>;
    if (!p.email) return;
    await notificationService.send(
      'email',
      p.email,
      'tenant.grace_expired',
      {},
      { tenantId: p.tenantId, correlationId: event.correlationId }
    );
  });

  log.info('Notification event handlers registered');
}
