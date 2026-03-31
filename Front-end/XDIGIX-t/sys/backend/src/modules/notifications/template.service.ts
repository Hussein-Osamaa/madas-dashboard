import { NotificationTemplate, INotificationTemplate } from './template.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('notifications');

export const templateService = {
  /**
   * Find template by eventType + channel + locale, with fallback to 'en'.
   */
  async findTemplate(
    eventType: string,
    channel: string,
    locale = 'en'
  ): Promise<INotificationTemplate | null> {
    let tmpl = await NotificationTemplate.findOne({
      eventType,
      channel,
      locale,
      active: true,
    }).lean();

    if (!tmpl && locale !== 'en') {
      tmpl = await NotificationTemplate.findOne({
        eventType,
        channel,
        locale: 'en',
        active: true,
      }).lean();
    }

    return tmpl as INotificationTemplate | null;
  },

  /**
   * Interpolate {{variable}} placeholders into a template string.
   * Missing variables leave the placeholder intact (safe fallback).
   */
  interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  },

  /**
   * Seed default notification templates (upsert — safe to call repeatedly).
   */
  async seedDefaults(): Promise<void> {
    const defaults = [
      {
        templateId: 'order-confirmed-email',
        channel: 'email' as const,
        eventType: 'order.confirmed',
        locale: 'en',
        subject: 'Order Confirmed — {{orderId}}',
        body: 'Hi {{firstName}},\n\nYour order {{orderId}} has been confirmed.\nTotal: {{total}} {{currency}}\n\nThank you for shopping with us!',
        variables: ['firstName', 'orderId', 'total', 'currency'],
      },
      {
        templateId: 'shipment-picked-up-email',
        channel: 'email' as const,
        eventType: 'shipment.picked_up',
        locale: 'en',
        subject: 'Your order is on its way!',
        body: 'Hi {{firstName}},\n\nYour order {{orderId}} has been shipped.\nTracking: {{trackingNumber}}\n\nEstimated delivery: 2-5 business days.',
        variables: ['firstName', 'orderId', 'trackingNumber'],
      },
      {
        templateId: 'shipment-delivered-email',
        channel: 'email' as const,
        eventType: 'shipment.delivered',
        locale: 'en',
        subject: 'Your order has been delivered!',
        body: 'Hi {{firstName}},\n\nYour order {{orderId}} has been delivered.\n\nWe hope you enjoy your purchase!',
        variables: ['firstName', 'orderId'],
      },
      {
        templateId: 'return-approved-email',
        channel: 'email' as const,
        eventType: 'return.approved',
        locale: 'en',
        subject: 'Return Approved — {{returnId}}',
        body: 'Hi {{firstName}},\n\nYour return {{returnId}} has been approved.\nPlease ship the items back using the provided label.',
        variables: ['firstName', 'returnId'],
      },
      {
        templateId: 'stock-low-email',
        channel: 'email' as const,
        eventType: 'stock.low',
        locale: 'en',
        subject: 'Low Stock Alert — {{productName}}',
        body: 'Your product "{{productName}}" is running low.\nCurrent available: {{available}}\nThreshold: {{threshold}}',
        variables: ['productName', 'available', 'threshold'],
      },
      {
        templateId: 'plan-changed-email',
        channel: 'email' as const,
        eventType: 'tenant.plan_changed',
        locale: 'en',
        subject: 'Your plan has been updated',
        body: 'Your subscription plan has been changed to {{newPlan}}.\nThis change is effective immediately.',
        variables: ['newPlan'],
      },
      {
        templateId: 'grace-expired-email',
        channel: 'email' as const,
        eventType: 'tenant.grace_expired',
        locale: 'en',
        subject: 'Trial period ended',
        body: 'Your trial period has ended. Please subscribe to continue using premium features.',
        variables: [],
      },
    ];

    for (const d of defaults) {
      await NotificationTemplate.updateOne(
        { templateId: d.templateId },
        { $setOnInsert: { ...d, active: true } },
        { upsert: true }
      );
    }

    log.info(`Seeded ${defaults.length} default notification templates`);
  },
};
