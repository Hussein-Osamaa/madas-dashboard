import mongoose, { Schema, Document, Model } from 'mongoose';

/** Global pricing configuration – single document (singleton). */
export interface IPricingConfig extends Document {
  basePrice: number;              // base delivery price EGP
  volumetricDivisor: number;      // typically 5000
  insuranceFeePercent: number;    // % of declared value
  packagingFee: number;           // optional packaging fee EGP
  fuelSurchargePercent: number;   // fuel surcharge %
  currency: string;
  updatedAt: Date;
}

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    basePrice:              { type: Number, required: true, default: 40, min: 0 },
    volumetricDivisor:      { type: Number, required: true, default: 5000, min: 1 },
    insuranceFeePercent:    { type: Number, default: 0, min: 0 },
    packagingFee:           { type: Number, default: 0, min: 0 },
    fuelSurchargePercent:   { type: Number, default: 0, min: 0 },
    currency:               { type: String, default: 'EGP' },
  },
  { timestamps: true }
);

export const PricingConfig: Model<IPricingConfig> = mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema);
