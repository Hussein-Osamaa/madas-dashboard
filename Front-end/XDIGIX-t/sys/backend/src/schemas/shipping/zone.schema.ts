import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IZone extends Document {
  cityId: string;
  zoneName: string;      // "Nasr City"
  zoneCode?: string;     // "NC"
  isRemote: boolean;
  extraFee: number;      // additional EGP fee for remote areas
  deliverySLADays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    cityId:          { type: String, required: true },
    zoneName:        { type: String, required: true, trim: true },
    zoneCode:        { type: String, trim: true },
    isRemote:        { type: Boolean, default: false },
    extraFee:        { type: Number, default: 0, min: 0 },
    deliverySLADays: { type: Number, default: 1, min: 1 },
    isActive:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

ZoneSchema.index({ cityId: 1 });
ZoneSchema.index({ cityId: 1, zoneName: 1 });
ZoneSchema.index({ isRemote: 1 });

export const Zone: Model<IZone> = mongoose.model<IZone>('ShippingZone', ZoneSchema);
