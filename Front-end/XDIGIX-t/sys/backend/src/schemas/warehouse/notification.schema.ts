/**
 * Notification - Report notifications (email/WhatsApp sent).
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  clientId: string; // businessId
  type: 'inventory_report';
  reportId: mongoose.Types.ObjectId;
  channel: 'email' | 'whatsapp';
  recipient: string;
  sentAt: Date;
  success: boolean;
  error?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    clientId: { type: String, required: true },
    type: { type: String, enum: ['inventory_report'], required: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'InventoryReport', required: true },
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    recipient: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
    error: String,
  },
  { timestamps: true }
);

NotificationSchema.index({ clientId: 1 });
NotificationSchema.index({ reportId: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>('Notification', NotificationSchema);
