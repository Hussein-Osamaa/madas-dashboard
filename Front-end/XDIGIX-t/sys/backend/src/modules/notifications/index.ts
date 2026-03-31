export { NotificationTemplate } from './template.schema';
export type { INotificationTemplate } from './template.schema';

export { NotificationLog } from './notification-log.schema';
export type { INotificationLog, NotificationStatus } from './notification-log.schema';

export { templateService } from './template.service';
export { notificationService } from './notification.service';
export { registerNotificationEventHandlers } from './notification.events';

export { emailProvider } from './providers/email.provider';
export { smsProvider } from './providers/sms.provider';

export { default as notificationRoutes } from './notification.routes';
