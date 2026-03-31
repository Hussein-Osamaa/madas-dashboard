import mongoose, { Schema, Document, Model } from 'mongoose';

export type ShipmentStatus =
  | 'pending'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_warehouse'
  | 'sorted'
  | 'assigned_to_courier'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'return_initiated'
  | 'returned'
  | 'cancelled';

export type ShipmentType = 'deliver' | 'exchange' | 'return' | 'cash_collection';

export interface IShipment extends Document {
  trackingNumber: string;
  merchantId: string;         // businessId of merchant
  courierId?: string;
  zoneId?: string;
  cityId?: string;
  countryCode: string;

  // Package details
  weight: number;             // actual weight kg
  length?: number;            // cm
  width?: number;             // cm
  height?: number;            // cm
  volumetricWeight?: number;  // calculated
  chargeableWeight?: number;  // max(actual, volumetric)
  description?: string;
  packageCount: number;

  // Recipient
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  recipientEmail?: string;    // optional — used for email notifications
  recipientAddress: string;
  recipientCityId?: string;
  recipientZoneId?: string;
  recipientLat?: number;
  recipientLng?: number;

  // Pricing
  slaId?: string;
  shipmentType: ShipmentType;
  codAmount: number;           // cash on delivery amount
  shippingFee: number;
  codFee: number;
  totalFee: number;
  merchantReceives: number;   // cod - fees
  currency: string;

  // Status
  status: ShipmentStatus;
  deliveryAttempts: number;
  maxAttempts: number;
  isReturn: boolean;

  // Metadata
  notes?: string;
  merchantNotes?: string;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  returnedAt?: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    trackingNumber:    { type: String, required: true, unique: true },
    merchantId:        { type: String, required: true },
    courierId:         { type: String },
    zoneId:            { type: String },
    cityId:            { type: String },
    countryCode:       { type: String, required: true, default: 'EG' },

    weight:            { type: Number, required: true, min: 0.1 },
    length:            { type: Number, min: 0 },
    width:             { type: Number, min: 0 },
    height:            { type: Number, min: 0 },
    volumetricWeight:  { type: Number, min: 0 },
    chargeableWeight:  { type: Number, min: 0 },
    description:       { type: String, trim: true },
    packageCount:      { type: Number, default: 1, min: 1 },

    recipientName:     { type: String, required: true, trim: true },
    recipientPhone:    { type: String, required: true, trim: true },
    recipientPhone2:   { type: String, trim: true },
    recipientEmail:    { type: String, trim: true },
    recipientAddress:  { type: String, required: true, trim: true },
    recipientCityId:   { type: String },
    recipientZoneId:   { type: String },
    recipientLat:      { type: Number },
    recipientLng:      { type: Number },

    slaId:             { type: String },
    shipmentType:      { type: String, enum: ['deliver','exchange','return','cash_collection'], default: 'deliver' },
    codAmount:         { type: Number, default: 0, min: 0 },
    shippingFee:       { type: Number, default: 0, min: 0 },
    codFee:            { type: Number, default: 0, min: 0 },
    totalFee:          { type: Number, default: 0, min: 0 },
    merchantReceives:  { type: Number, default: 0 },
    currency:          { type: String, default: 'EGP' },

    status:            { type: String, enum: ['pending','pickup_scheduled','picked_up','in_warehouse','sorted','assigned_to_courier','out_for_delivery','delivered','failed','return_initiated','returned','cancelled'], default: 'pending' },
    deliveryAttempts:  { type: Number, default: 0, min: 0 },
    maxAttempts:       { type: Number, default: 3 },
    isReturn:          { type: Boolean, default: false },
    slaBreached:       { type: Boolean, default: false },

    notes:             { type: String },
    merchantNotes:     { type: String },
    specialInstructions: { type: String },
    pickedUpAt:        { type: Date },
    deliveredAt:       { type: Date },
    returnedAt:        { type: Date },
  },
  { timestamps: true }
);

// trackingNumber already has unique: true in field definition — no duplicate index
ShipmentSchema.index({ merchantId: 1, createdAt: -1 });
ShipmentSchema.index({ courierId: 1, status: 1 });
ShipmentSchema.index({ status: 1, createdAt: -1 });
ShipmentSchema.index({ zoneId: 1, status: 1 });
ShipmentSchema.index({ recipientPhone: 1 });

export const Shipment: Model<IShipment> = (mongoose.models.Shipment as mongoose.Model<IShipment>) || mongoose.model<IShipment>('Shipment', ShipmentSchema);
