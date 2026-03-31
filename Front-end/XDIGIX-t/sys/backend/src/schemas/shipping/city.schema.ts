import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICity extends Document {
  countryCode: string;   // "EG"
  name: string;          // "Cairo"
  nameAr?: string;       // "القاهرة"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema = new Schema<ICity>(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    name:        { type: String, required: true, trim: true },
    nameAr:      { type: String, trim: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

CitySchema.index({ countryCode: 1 });
CitySchema.index({ countryCode: 1, name: 1 }, { unique: true });

export const City: Model<ICity> = (mongoose.models.ShippingCity as mongoose.Model<ICity>) || mongoose.model<ICity>('ShippingCity', CitySchema);
