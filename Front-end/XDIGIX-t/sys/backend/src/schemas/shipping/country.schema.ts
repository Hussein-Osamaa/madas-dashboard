import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICountry extends Document {
  code: string;          // ISO 3166-1 alpha-2  e.g. "EG"
  name: string;          // "Egypt"
  currency: string;      // "EGP"
  timezone: string;      // "Africa/Cairo"
  weightUnit: 'kg' | 'lb';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CountrySchema = new Schema<ICountry>(
  {
    code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:       { type: String, required: true, trim: true },
    currency:   { type: String, required: true, trim: true },
    timezone:   { type: String, required: true, trim: true },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

// code already has unique: true in field definition — no duplicate index needed
CountrySchema.index({ isActive: 1 });

export const Country: Model<ICountry> = mongoose.model<ICountry>('ShippingCountry', CountrySchema);
