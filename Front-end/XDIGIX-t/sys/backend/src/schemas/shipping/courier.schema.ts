import mongoose, { Schema, Document, Model } from 'mongoose';

export type CourierType = 'company' | 'freelancer';
export type VehicleType = 'motorcycle' | 'car' | 'van' | 'truck';
export type CourierStatus = 'available' | 'busy' | 'offline' | 'suspended';

export interface ICourier extends Document {
  name: string;
  phone: string;
  email?: string;
  courierType: CourierType;
  vehicleType: VehicleType;
  maxWeightCapacity: number; // kg
  rating: number;            // 0–5
  status: CourierStatus;
  assignedZoneIds: string[];
  activeOrders: number;
  totalDeliveries: number;
  successRate: number;       // 0–100
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourierSchema = new Schema<ICourier>(
  {
    name:              { type: String, required: true, trim: true },
    phone:             { type: String, required: true, trim: true },
    email:             { type: String, trim: true, lowercase: true },
    courierType:       { type: String, enum: ['company','freelancer'], required: true },
    vehicleType:       { type: String, enum: ['motorcycle','car','van','truck'], required: true },
    maxWeightCapacity: { type: Number, required: true, min: 0.5, default: 20 },
    rating:            { type: Number, default: 5, min: 0, max: 5 },
    status:            { type: String, enum: ['available','busy','offline','suspended'], default: 'offline' },
    assignedZoneIds:   [{ type: String }],
    activeOrders:      { type: Number, default: 0, min: 0 },
    totalDeliveries:   { type: Number, default: 0, min: 0 },
    successRate:       { type: Number, default: 100, min: 0, max: 100 },
    currentLat:        { type: Number },
    currentLng:        { type: Number },
    lastLocationAt:    { type: Date },
    isActive:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

CourierSchema.index({ status: 1 });
CourierSchema.index({ courierType: 1 });
CourierSchema.index({ assignedZoneIds: 1 });
CourierSchema.index({ phone: 1 }, { unique: true });

export const Courier: Model<ICourier> = mongoose.model<ICourier>('Courier', CourierSchema);
