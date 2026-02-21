import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  type: string;
  features: string[];
  price?: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    features: [String],
    price: Number,
    currency: String,
  },
  { timestamps: true, _id: true }
);

export const Plan: Model<IPlan> = mongoose.model<IPlan>('Plan', PlanSchema);
