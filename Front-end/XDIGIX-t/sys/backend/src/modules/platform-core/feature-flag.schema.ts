import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeatureFlag extends Document {
  tenantId: string;
  flagName: string;
  enabled: boolean;
  updatedAt: Date;
  updatedBy: string;
}

const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    tenantId: { type: String, required: true },
    flagName: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound unique index: one flag per tenant
FeatureFlagSchema.index({ tenantId: 1, flagName: 1 }, { unique: true });

export const FeatureFlag: Model<IFeatureFlag> = mongoose.model<IFeatureFlag>(
  'FeatureFlag',
  FeatureFlagSchema
);
