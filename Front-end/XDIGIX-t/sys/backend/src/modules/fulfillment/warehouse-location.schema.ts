import mongoose, { Schema, Document } from 'mongoose';

/* ── Interface ──────────────────────────────────────────────────── */

export interface IWarehouseLocation extends Document {
  tenantId: string;
  businessId: string;
  locationCode: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Mongoose Schema ────────────────────────────────────────────── */

const WarehouseLocationSchema = new Schema<IWarehouseLocation>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    locationCode: { type: String, required: true },
    zone: { type: String },
    aisle: { type: String },
    shelf: { type: String },
    bin: { type: String },
    active: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'warehouse_locations',
  },
);

/* ── Indexes ────────────────────────────────────────────────────── */
WarehouseLocationSchema.index({ tenantId: 1, locationCode: 1 }, { unique: true });
WarehouseLocationSchema.index({ tenantId: 1, zone: 1 });

export const WarehouseLocation = mongoose.model<IWarehouseLocation>('WarehouseLocation', WarehouseLocationSchema);
export default WarehouseLocation;
