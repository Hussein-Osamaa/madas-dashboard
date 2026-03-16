import mongoose, { Schema, Document, Model } from 'mongoose';

export type SLAType = 'same_day_super_fast' | 'same_day' | 'next_day' | 'two_to_three_days' | 'custom';

export interface ISLARule extends Document {
  name: string;              // "Same Day Super Fast"
  type: SLAType;
  maxDeliveryHours: number;  // 6
  price: number;             // 70 EGP
  fallbackSLAId?: string;    // ID of fallback SLA if this one is breached
  isActive: boolean;
  priority: number;          // lower = faster / more expensive
  createdAt: Date;
  updatedAt: Date;
}

const SLARuleSchema = new Schema<ISLARule>(
  {
    name:             { type: String, required: true, trim: true },
    type:             { type: String, enum: ['same_day_super_fast','same_day','next_day','two_to_three_days','custom'], required: true },
    maxDeliveryHours: { type: Number, required: true, min: 1 },
    price:            { type: Number, required: true, min: 0 },
    fallbackSLAId:    { type: String },
    isActive:         { type: Boolean, default: true },
    priority:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

SLARuleSchema.index({ type: 1 });
SLARuleSchema.index({ isActive: 1 });

export const SLARule: Model<ISLARule> = mongoose.model<ISLARule>('SLARule', SLARuleSchema);
