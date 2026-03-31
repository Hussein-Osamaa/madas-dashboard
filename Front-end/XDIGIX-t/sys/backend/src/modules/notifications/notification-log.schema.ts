import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'bounced' | 'skipped' | 'retrying';

export interface INotificationLog extends Document {
  notificationId: string;
  tenantId?: string;
  recipient: string;
  channel: 'email' | 'sms' | 'push';
  templateId?: string;
  eventType?: string;
  subject?: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  nextRetryAt?: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    notificationId: { type: String, required: true },
    tenantId: { type: String },
    recipient: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms', 'push'], required: true },
    templateId: { type: String },
    eventType: { type: String },
    subject: { type: String },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'bounced', 'skipped', 'retrying'],
      required: true,
      default: 'queued',
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String },
    correlationId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    sentAt: { type: Date },
    failedAt: { type: Date },
    nextRetryAt: { type: Date },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ notificationId: 1 }, { unique: true });
NotificationLogSchema.index({ tenantId: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, createdAt: -1 });
NotificationLogSchema.index({ recipient: 1, createdAt: -1 });
NotificationLogSchema.index({ eventType: 1, createdAt: -1 });

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog ??
  mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
