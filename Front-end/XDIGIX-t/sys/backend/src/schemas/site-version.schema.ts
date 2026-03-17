import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISiteVersion extends Document {
  siteId:      string;
  tenantId:    string;
  publishedBy: string;
  snapshot:    Record<string, unknown>;  // Full site data at time of publish
  createdAt:   Date;
}

const SiteVersionSchema = new Schema<ISiteVersion>(
  {
    siteId:      { type: String, required: true, index: true },
    tenantId:    { type: String, required: true, index: true },
    publishedBy: { type: String, default: 'unknown' },
    snapshot:    { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SiteVersionSchema.index({ siteId: 1, createdAt: -1 });

export const SiteVersion: Model<ISiteVersion> =
  mongoose.model<ISiteVersion>('SiteVersion', SiteVersionSchema);
