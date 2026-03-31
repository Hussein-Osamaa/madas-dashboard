import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────────────────── */

export interface IShippingZone extends Document {
  tenantId: string;
  businessId: string;
  name: string;
  regions: string[];
  flatRate?: number;
  codSurcharge?: number;
  currency: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Mongoose Schema ───────────────────────────────────────────── */

const ShippingZoneSchema = new Schema<IShippingZone>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    name: { type: String, required: true },
    regions: { type: [String], required: true, default: [] },
    flatRate: { type: Number, min: 0 },
    codSurcharge: { type: Number, min: 0 },
    currency: { type: String, required: true, default: 'EGP' },
    active: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'shipping_zones',
  },
);

/* ── Indexes ───────────────────────────────────────────────────── */
ShippingZoneSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const ShippingZone = (mongoose.models.ShippingZone as mongoose.Model<IShippingZone>) || mongoose.model<IShippingZone>('ShippingZone', ShippingZoneSchema);
export default ShippingZone;
