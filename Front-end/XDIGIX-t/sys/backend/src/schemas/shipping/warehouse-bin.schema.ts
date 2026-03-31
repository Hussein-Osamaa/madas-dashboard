import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWarehouseBin extends Document {
  warehouseId: string;
  binCode: string;        // "A1", "B2"
  zoneId?: string;        // shipping zone this bin handles
  cityId?: string;
  description?: string;
  capacity: number;       // max packages
  currentCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseBinSchema = new Schema<IWarehouseBin>(
  {
    warehouseId:  { type: String, required: true },
    binCode:      { type: String, required: true, uppercase: true, trim: true },
    zoneId:       { type: String },
    cityId:       { type: String },
    description:  { type: String, trim: true },
    capacity:     { type: Number, default: 100, min: 1 },
    currentCount: { type: Number, default: 0, min: 0 },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

WarehouseBinSchema.index({ warehouseId: 1, binCode: 1 }, { unique: true });
WarehouseBinSchema.index({ zoneId: 1 });

export const WarehouseBin: Model<IWarehouseBin> = (mongoose.models.ShippingWarehouseBin as mongoose.Model<IWarehouseBin>) || mongoose.model<IWarehouseBin>('ShippingWarehouseBin', WarehouseBinSchema);

// ─── Package scan record ──────────────────────────────────────────────────────

export interface IPackageScan extends Document {
  shipmentId: string;
  trackingNumber: string;
  binId: string;
  warehouseId: string;
  scannedBy?: string;
  scannedAt: Date;
}

const PackageScanSchema = new Schema<IPackageScan>(
  {
    shipmentId:     { type: String, required: true },
    trackingNumber: { type: String, required: true },
    binId:          { type: String, required: true },
    warehouseId:    { type: String, required: true },
    scannedBy:      { type: String },
    scannedAt:      { type: Date, default: Date.now },
  },
  { timestamps: false }
);

PackageScanSchema.index({ shipmentId: 1 });
PackageScanSchema.index({ binId: 1, scannedAt: -1 });

export const PackageScan: Model<IPackageScan> = (mongoose.models.PackageScan as mongoose.Model<IPackageScan>) || mongoose.model<IPackageScan>('PackageScan', PackageScanSchema);
