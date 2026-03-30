import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteVersion extends Document {
  siteId: string;
  tenantId: string;
  version: number;
  configSnapshot: Record<string, unknown>; // sections + pageSections + theme at time of publish
  createdAt: Date;
  createdBy: string; // actor who published
}

const SiteVersionSchema = new Schema<ISiteVersion>({
  siteId: { type: String, required: true },
  tenantId: { type: String, required: true },
  version: { type: Number, required: true },
  configSnapshot: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

SiteVersionSchema.index({ siteId: 1, version: 1 }, { unique: true });
SiteVersionSchema.index({ tenantId: 1 });

export const SiteVersion = mongoose.model<ISiteVersion>('SiteVersion', SiteVersionSchema);
