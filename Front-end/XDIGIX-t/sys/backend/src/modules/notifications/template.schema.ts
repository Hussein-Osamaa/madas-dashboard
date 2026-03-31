import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationTemplate extends Document {
  templateId: string;
  channel: 'email' | 'sms' | 'push';
  eventType: string;
  locale: string;
  subject: string;
  body: string;
  variables: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    templateId: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms', 'push'], required: true },
    eventType: { type: String, required: true },
    locale: { type: String, required: true, default: 'en' },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    variables: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NotificationTemplateSchema.index({ templateId: 1 }, { unique: true });
NotificationTemplateSchema.index({ eventType: 1, channel: 1, locale: 1 }, { unique: true });

export const NotificationTemplate: Model<INotificationTemplate> =
  mongoose.models.NotificationTemplate ??
  mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema);
