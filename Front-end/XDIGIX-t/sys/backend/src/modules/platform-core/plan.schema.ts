import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanLimits {
  products: number;   // -1 for unlimited
  staff: number;
  sites: number;
  monthlyOrders: number; // -1 for unlimited
  storageMB: number;
}

export interface IPlan extends Document {
  planId: string;
  name: string;
  limits: IPlanLimits;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanLimitsSchema = new Schema<IPlanLimits>(
  {
    products: { type: Number, required: true },
    staff: { type: Number, required: true },
    sites: { type: Number, required: true },
    monthlyOrders: { type: Number, required: true },
    storageMB: { type: Number, required: true },
  },
  { _id: false }
);

const PlanSchema = new Schema<IPlan>(
  {
    planId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    limits: { type: PlanLimitsSchema, required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan: Model<IPlan> = mongoose.model<IPlan>('Plan', PlanSchema);
