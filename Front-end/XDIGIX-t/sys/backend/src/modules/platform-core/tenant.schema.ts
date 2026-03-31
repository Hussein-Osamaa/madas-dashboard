import mongoose, { Schema, Document, Model } from 'mongoose';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type PlanActivation = 'paid' | 'grace' | 'default';

export interface ITenant extends Document {
  tenantId: string;
  status: TenantStatus;
  plan: string;
  planActivation: PlanActivation;
  previousPlan?: string | null;
  previousPlanActivation?: string | null;
  graceExpiresAt?: Date | null;
  graceReason?: string | null;
  graceApprovedBy?: string | null;
  graceApprovedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active',
      required: true,
    },
    plan: { type: String, default: 'free', required: true },
    planActivation: {
      type: String,
      enum: ['paid', 'grace', 'default'],
      default: 'default',
      required: true,
    },
    previousPlan: { type: String, default: null },
    previousPlanActivation: { type: String, default: null },
    graceExpiresAt: { type: Date, default: null },
    graceReason: { type: String, default: null },
    graceApprovedBy: { type: String, default: null },
    graceApprovedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TenantSchema.index({ status: 1 });
TenantSchema.index({ plan: 1 });

export const Tenant: Model<ITenant> = (mongoose.models.Tenant as Model<ITenant>) || mongoose.model<ITenant>('Tenant', TenantSchema);
