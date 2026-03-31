import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttemptResult = 'delivered' | 'customer_not_home' | 'wrong_address' | 'refused' | 'postponed' | 'other';

export interface IDeliveryAttempt extends Document {
  shipmentId: string;
  trackingNumber: string;
  courierId: string;
  attemptNumber: number;    // 1, 2, 3
  result: AttemptResult;
  notes?: string;
  photoUrl?: string;        // proof of delivery / attempt
  recipientLat?: number;
  recipientLng?: number;
  timestamp: Date;
}

const DeliveryAttemptSchema = new Schema<IDeliveryAttempt>(
  {
    shipmentId:     { type: String, required: true },
    trackingNumber: { type: String, required: true },
    courierId:      { type: String, required: true },
    attemptNumber:  { type: Number, required: true, min: 1 },
    result:         { type: String, enum: ['delivered','customer_not_home','wrong_address','refused','postponed','other'], required: true },
    notes:          { type: String },
    photoUrl:       { type: String },
    recipientLat:   { type: Number },
    recipientLng:   { type: Number },
    timestamp:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DeliveryAttemptSchema.index({ shipmentId: 1 });
DeliveryAttemptSchema.index({ courierId: 1, timestamp: -1 });

export const DeliveryAttempt: Model<IDeliveryAttempt> = (mongoose.models.DeliveryAttempt as mongoose.Model<IDeliveryAttempt>) || mongoose.model<IDeliveryAttempt>('DeliveryAttempt', DeliveryAttemptSchema);
