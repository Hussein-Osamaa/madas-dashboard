import { v4 as uuidv4 } from 'uuid';
import { NotificationLog, INotificationLog } from './notification-log.schema';
import { templateService } from './template.service';
import { emailProvider } from './providers/email.provider';
import { smsProvider } from './providers/sms.provider';
import { createLogger } from '../../lib/logger';

const log = createLogger('notifications');

export const notificationService = {
  /**
   * Send a notification using a template looked up by eventType + channel.
   * Returns the generated notificationId.
   */
  async send(
    channel: 'email' | 'sms' | 'push',
    recipient: string,
    eventType: string,
    variables: Record<string, string>,
    context?: { tenantId?: string; correlationId?: string; locale?: string }
  ): Promise<string> {
    const notificationId = uuidv4();
    const locale = context?.locale || 'en';

    // Find template
    const template = await templateService.findTemplate(eventType, channel, locale);
    if (!template || !template.active) {
      // No template found — skip (not an error)
      await NotificationLog.create({
        notificationId,
        tenantId: context?.tenantId,
        recipient,
        channel,
        eventType,
        status: 'skipped',
        attempts: 0,
        maxAttempts: 3,
        lastError: 'No active template found',
        correlationId: context?.correlationId,
      });
      log.info('Notification skipped — no template', { eventType, channel, locale });
      return notificationId;
    }

    // Interpolate variables into template
    const subject = templateService.interpolate(template.subject, variables);
    const body = templateService.interpolate(template.body, variables);

    // Create log entry as queued
    await NotificationLog.create({
      notificationId,
      tenantId: context?.tenantId,
      recipient,
      channel,
      templateId: template.templateId,
      eventType,
      subject,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      correlationId: context?.correlationId,
    });

    // Attempt delivery
    return this._deliver(notificationId, channel, recipient, subject, body);
  },

  /**
   * Send a raw notification (no template lookup).
   * Useful for one-off or system-generated messages.
   */
  async sendRaw(
    channel: 'email' | 'sms' | 'push',
    recipient: string,
    subject: string,
    body: string,
    context?: { tenantId?: string; correlationId?: string; eventType?: string }
  ): Promise<string> {
    const notificationId = uuidv4();

    await NotificationLog.create({
      notificationId,
      tenantId: context?.tenantId,
      recipient,
      channel,
      eventType: context?.eventType,
      subject,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      correlationId: context?.correlationId,
    });

    return this._deliver(notificationId, channel, recipient, subject, body);
  },

  /**
   * Internal: attempt delivery through the appropriate channel provider.
   */
  async _deliver(
    notificationId: string,
    channel: string,
    recipient: string,
    subject: string,
    body: string
  ): Promise<string> {
    let success = false;
    let error: string | undefined;

    if (channel === 'email') {
      const result = await emailProvider.send(recipient, subject, body);
      success = result.success;
      error = result.error;
    } else if (channel === 'sms') {
      const result = await smsProvider.send(recipient, body);
      success = result.success;
      error = result.error;
    } else {
      error = `Unsupported channel: ${channel}`;
    }

    if (success) {
      await NotificationLog.updateOne(
        { notificationId },
        {
          $set: { status: 'sent', sentAt: new Date() },
          $inc: { attempts: 1 },
        }
      );
    } else {
      await NotificationLog.updateOne(
        { notificationId },
        {
          $set: {
            status: 'failed',
            lastError: error,
            failedAt: new Date(),
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min initial backoff
          },
          $inc: { attempts: 1 },
        }
      );
    }

    return notificationId;
  },

  /**
   * Retry failed notifications that are eligible (under maxAttempts, past nextRetryAt).
   * Uses exponential backoff: 5min, 10min, 20min.
   * Returns the count of successfully retried notifications.
   */
  async retryFailed(): Promise<number> {
    const now = new Date();
    const failedLogs = await NotificationLog.find({
      status: 'failed',
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
      nextRetryAt: { $lte: now },
    }).limit(50);

    let retried = 0;

    for (const logEntry of failedLogs) {
      // Re-fetch template body for retry (if template-based)
      const template = logEntry.templateId
        ? await templateService.findTemplate(logEntry.eventType || '', logEntry.channel)
        : null;
      const subject = logEntry.subject || '';
      const body = template ? template.body : '';

      let success = false;
      let retryError: string | undefined;

      if (logEntry.channel === 'email') {
        const result = await emailProvider.send(logEntry.recipient, subject, body);
        success = result.success;
        retryError = result.error;
      } else if (logEntry.channel === 'sms') {
        const result = await smsProvider.send(logEntry.recipient, body);
        success = result.success;
        retryError = result.error;
      }

      if (success) {
        await NotificationLog.updateOne(
          { _id: logEntry._id },
          {
            $set: { status: 'sent', sentAt: new Date() },
            $inc: { attempts: 1 },
          }
        );
        retried++;
      } else {
        const attempts = logEntry.attempts + 1;
        const isFinal = attempts >= (logEntry.maxAttempts || 3);
        await NotificationLog.updateOne(
          { _id: logEntry._id },
          {
            $set: {
              lastError: retryError,
              failedAt: new Date(),
              // Exponential backoff: 5min * 2^(attempt-1)
              nextRetryAt: isFinal
                ? undefined
                : new Date(Date.now() + 5 * 60 * 1000 * Math.pow(2, attempts - 1)),
            },
            $inc: { attempts: 1 },
          }
        );
        if (isFinal) {
          log.error('Notification permanently failed', {
            notificationId: logEntry.notificationId,
            recipient: logEntry.recipient,
            attempts: String(attempts),
          });
        }
      }
    }

    return retried;
  },

  /**
   * Get notification logs for a tenant (paginated, filterable).
   */
  async getLogs(
    tenantId: string,
    filters?: { status?: string; eventType?: string; page?: number; limit?: number }
  ) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const filter: Record<string, unknown> = { tenantId };
    if (filters?.status) filter.status = filters.status;
    if (filters?.eventType) filter.eventType = filters.eventType;

    const [logs, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationLog.countDocuments(filter),
    ]);

    return { logs, total, page, limit };
  },
};
