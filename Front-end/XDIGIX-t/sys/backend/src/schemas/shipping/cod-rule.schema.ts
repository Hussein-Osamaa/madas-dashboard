import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICODRule extends Document {
  percentageFee: number;   // e.g. 1.5 = 1.5%
  minimumFee: number;      // e.g. 10 EGP
  maximumFee: number;      // e.g. 50 EGP
  threshold: number;       // COD amounts above this get 1% extra
  thresholdExtraPercent: number; // extra % above threshold
  enabled: boolean;
  currency: string;
  updatedAt: Date;
}

const CODRuleSchema = new Schema<ICODRule>(
  {
    percentageFee:          { type: Number, required: true, min: 0, default: 1.5 },
    minimumFee:             { type: Number, required: true, min: 0, default: 10 },
    maximumFee:             { type: Number, required: true, min: 0, default: 50 },
    threshold:              { type: Number, default: 2000, min: 0 },
    thresholdExtraPercent:  { type: Number, default: 1, min: 0 },
    enabled:                { type: Boolean, default: true },
    currency:               { type: String, default: 'EGP' },
  },
  { timestamps: true }
);

export const CODRule: Model<ICODRule> = mongoose.model<ICODRule>('CODRule', CODRuleSchema);
