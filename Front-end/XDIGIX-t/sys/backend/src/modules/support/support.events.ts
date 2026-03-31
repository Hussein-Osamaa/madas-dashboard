/**
 * Support event handlers — notifies via Notifications module.
 */
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('support-events');

export function registerSupportEventHandlers(): void {
  // Acknowledge new ticket to the creator
  eventBus.subscribe('ticket.created', async (payload) => {
    const { ticketId, tenantId, subject, priority } = payload;
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send(
        'email',
        '', // recipient resolved via template or ticket creator
        'ticket.created',
        { ticketId, subject, priority: priority || 'medium' },
        { tenantId, correlationId: ticketId },
      );
    } catch (err) {
      log.error('ticket.created notification failed', { ticketId, error: (err as Error).message });
    }
  });

  // Alert assigned agent
  eventBus.subscribe('ticket.assigned', async (payload) => {
    const { ticketId, tenantId, assignedTo } = payload;
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send(
        'email',
        '',
        'ticket.assigned',
        { ticketId, assignedTo: assignedTo || '' },
        { tenantId, correlationId: ticketId },
      );
    } catch (err) {
      log.error('ticket.assigned notification failed', { ticketId, error: (err as Error).message });
    }
  });

  // Escalation alert
  eventBus.subscribe('ticket.escalated', async (payload) => {
    const { ticketId, tenantId, priority, reason } = payload;
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send(
        'email',
        '',
        'ticket.escalated',
        { ticketId, priority: priority || 'urgent', reason: reason || '' },
        { tenantId, correlationId: ticketId },
      );
    } catch (err) {
      log.error('ticket.escalated notification failed', { ticketId, error: (err as Error).message });
    }
  });

  // Resolution notification
  eventBus.subscribe('ticket.resolved', async (payload) => {
    const { ticketId, tenantId } = payload;
    try {
      const { notificationService } = await import('../notifications/notification.service');
      await notificationService.send(
        'email',
        '',
        'ticket.resolved',
        { ticketId },
        { tenantId, correlationId: ticketId },
      );
    } catch (err) {
      log.error('ticket.resolved notification failed', { ticketId, error: (err as Error).message });
    }
  });

  log.info('Support event handlers registered');
}
