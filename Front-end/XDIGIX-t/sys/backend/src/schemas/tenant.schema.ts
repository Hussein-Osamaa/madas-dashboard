import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  tenantId: string;
  name: string;
  plan: 'saas' | 'fulfillment' | 'shipping' | 'all-in-one';
  features: string[];
  status: 'active' | 'suspended' | 'trial';
  ownerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    plan: { type: String, enum: ['saas', 'fulfillment', 'shipping', 'all-in-one'], default: 'saas' },
    features: [{ type: String }],
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
    ownerUserId: String,
  },
  { timestamps: true, _id: true }
);

export const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', TenantSchema);
