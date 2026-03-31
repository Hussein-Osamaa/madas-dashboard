import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBusiness extends Document {
  businessId: string;
  tenantId: string;
  name: string;
  owner?: { userId: string; email?: string };
  linkedBusinessIds?: string[];
  plan?: { type: string; status?: string; currency?: string };
  features?: Record<string, unknown>;
  systemAccess?: { dashboard?: boolean; finance?: boolean };
  suspensionReason?: string | null;
  // Onboarding profile fields (Wave 3)
  contactEmail?: string | null;
  contactPhone?: string | null;
  country?: string | null;
  currency?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    businessId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    owner: {
      userId: String,
      email: String,
    },
    linkedBusinessIds: [String],
    plan: {
      type: { type: String },
      status: { type: String },
      currency: { type: String },
    },
    features: { type: Schema.Types.Mixed },
    systemAccess: {
      dashboard: { type: Boolean },
      finance: { type: Boolean },
    },
    suspensionReason: { type: String },
    // Onboarding profile fields (Wave 3) — all optional, additive
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
    country: { type: String, default: null },
    currency: { type: String, default: null },
    slug: { type: String, default: null },
    logoUrl: { type: String, default: null },
  },
  { timestamps: true, _id: true }
);

BusinessSchema.index({ tenantId: 1 });
BusinessSchema.index({ 'owner.userId': 1 });

export const Business: Model<IBusiness> = (mongoose.models.Business as mongoose.Model<IBusiness>) || mongoose.model<IBusiness>('Business', BusinessSchema);
