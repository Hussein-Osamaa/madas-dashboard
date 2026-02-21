import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  clientId: string;
  type: string;
  reportId: mongoose.Types.ObjectId;
  channel: 'email' | 'whatsapp' | 'dashboard';
  recipient?: string;
  sentAt: Date;
  success: boolean;
  error?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    clientId: { type: String, required: true },
    type: { type: String, required: true },
    reportId: { type: Schema.Types.ObjectId, required: true },
    channel: { type: String, enum: ['email', 'whatsapp', 'dashboard'], required: true },
    recipient: { type: String },
    sentAt: { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
    error: String,
  },
  { timestamps: true }
);

NotificationSchema.index({ clientId: 1 });

export const NotificationModel: Model<INotification> =
  mongoose.models.NotificationModule ?? mongoose.model<INotification>('NotificationModule', NotificationSchema);
