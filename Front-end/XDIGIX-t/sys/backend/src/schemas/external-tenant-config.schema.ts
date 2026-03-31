/**
 * Per-tenant credentials for the external API.
 * Stored in DB; never exposed to frontend. Can be synced from dashboard (Firestore) via internal API.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExternalTenantConfig extends Document {
  tenantId: string;
  /** Plain API token for validation (Bearer). Rotate via dashboard. */
  apiToken: string;
  /** Webhook HMAC secret for signature verification. */
  webhookSecret: string;
  enabled: boolean;
  apiEnabled?: boolean;
  webhookEnabled?: boolean;
  updatedAt: Date;
}

const ExternalTenantConfigSchema = new Schema<IExternalTenantConfig>(
  {
    tenantId: { type: String, required: true, unique: true },
    apiToken: { type: String, required: true },
    webhookSecret: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    apiEnabled: { type: Boolean, default: true },
    webhookEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, _id: true }
);

ExternalTenantConfigSchema.index({ tenantId: 1 });
ExternalTenantConfigSchema.index({ apiToken: 1 });

export const ExternalTenantConfig: Model<IExternalTenantConfig> = (mongoose.models.ExternalTenantConfig as mongoose.Model<IExternalTenantConfig>) || mongoose.model<IExternalTenantConfig>('ExternalTenantConfig', ExternalTenantConfigSchema);
