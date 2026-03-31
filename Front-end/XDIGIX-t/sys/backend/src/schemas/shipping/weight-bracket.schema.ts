import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeightBracket extends Document {
  minWeight: number;    // kg, inclusive
  maxWeight: number;    // kg, exclusive (null = unlimited)
  extraPrice: number;   // EGP added on top of base price
  label?: string;       // "0–1 kg"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WeightBracketSchema = new Schema<IWeightBracket>(
  {
    minWeight:  { type: Number, required: true, min: 0 },
    maxWeight:  { type: Number, required: true, min: 0 },
    extraPrice: { type: Number, required: true, min: 0, default: 0 },
    label:      { type: String, trim: true },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

WeightBracketSchema.index({ minWeight: 1, maxWeight: 1 });

export const WeightBracket: Model<IWeightBracket> = (mongoose.models.WeightBracket as mongoose.Model<IWeightBracket>) || mongoose.model<IWeightBracket>('WeightBracket', WeightBracketSchema);
