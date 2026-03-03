import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, enum: ['REPORT', 'ALERT', 'STOCK'] },
    channels: [{ type: String, enum: ['dashboard', 'email', 'whatsapp'] }],
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ clientId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
