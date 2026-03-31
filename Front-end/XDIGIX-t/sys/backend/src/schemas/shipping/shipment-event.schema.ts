import mongoose, { Schema, Document, Model } from 'mongoose';

export type ShipmentEventType =
  | 'ORDER_CREATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_WAREHOUSE'
  | 'SORTED'
  | 'ASSIGNED_TO_COURIER'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_ATTEMPT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURN_INITIATED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'NOTE_ADDED';

export interface IShipmentEvent extends Document {
  shipmentId: string;
  trackingNumber: string;
  eventType: ShipmentEventType;
  description: string;
  location?: string;
  performedBy?: string;    // userId or courierId
  performedByRole?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    shipmentId:      { type: String, required: true },
    trackingNumber:  { type: String, required: true },
    eventType:       { type: String, required: true },
    description:     { type: String, required: true },
    location:        { type: String },
    performedBy:     { type: String },
    performedByRole: { type: String },
    metadata:        { type: Schema.Types.Mixed },
    timestamp:       { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ShipmentEventSchema.index({ shipmentId: 1, timestamp: 1 });
ShipmentEventSchema.index({ trackingNumber: 1, timestamp: 1 });

export const ShipmentEvent: Model<IShipmentEvent> = (mongoose.models.ShipmentEvent as mongoose.Model<IShipmentEvent>) || mongoose.model<IShipmentEvent>('ShipmentEvent', ShipmentEventSchema);
