import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────────────────── */

export type ShipmentStatus =
  | 'created'
  | 'label_generated'
  | 'carrier_booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'failed_delivery'
  | 'returned_to_sender'
  | 'cancelled';

export interface IShippingAddress {
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface IShipment extends Document {
  shipmentId: string;
  tenantId: string;
  businessId: string;
  orderId: string;
  fulfillmentJobId?: string;
  returnId?: string;
  type: 'outbound' | 'return';
  carrierId?: string;
  trackingNumber?: string;
  awb?: string;
  labelUrl?: string;
  status: ShipmentStatus;
  shippingAddress: IShippingAddress;
  codAmount: number;
  codCollected: boolean;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
}

/* ── State machine ─────────────────────────────────────────────── */

export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: ['label_generated', 'cancelled'],
  label_generated: ['carrier_booked', 'cancelled'],
  carrier_booked: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['out_for_delivery', 'exception', 'returned_to_sender'],
  out_for_delivery: ['delivered', 'failed_delivery', 'exception'],
  delivered: [],
  exception: ['in_transit', 'returned_to_sender', 'cancelled'],
  failed_delivery: ['out_for_delivery', 'returned_to_sender'],
  returned_to_sender: [],
  cancelled: [],
};

/** Check whether a shipment status transition is allowed (pure boolean). */
export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Validate a shipment status transition — throws if invalid. */
export function validateShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) {
    throw new Error(`Invalid shipment transition: ${from} -> ${to}`);
  }
}

/* ── Mongoose Schema ───────────────────────────────────────────── */

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
  },
  { _id: false },
);

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'created', 'label_generated', 'carrier_booked', 'picked_up',
  'in_transit', 'out_for_delivery', 'delivered', 'exception',
  'failed_delivery', 'returned_to_sender', 'cancelled',
];

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentId: { type: String, required: true },
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    orderId: { type: String, required: true },
    fulfillmentJobId: { type: String },
    returnId: { type: String },
    type: { type: String, required: true, enum: ['outbound', 'return'], default: 'outbound' },
    carrierId: { type: String },
    trackingNumber: { type: String },
    awb: { type: String },
    labelUrl: { type: String },
    status: {
      type: String,
      required: true,
      enum: SHIPMENT_STATUSES,
      default: 'created',
    },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    codAmount: { type: Number, required: true, default: 0, min: 0 },
    codCollected: { type: Boolean, required: true, default: false },
    retryCount: { type: Number, required: true, default: 0, min: 0 },
    maxRetries: { type: Number, required: true, default: 3, min: 0 },
    metadata: { type: Schema.Types.Mixed },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'shipments',
  },
);

/* ── Indexes ───────────────────────────────────────────────────── */
ShipmentSchema.index({ tenantId: 1, status: 1 });
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ trackingNumber: 1 }, { unique: true, sparse: true });
ShipmentSchema.index({ carrierId: 1, status: 1 });
ShipmentSchema.index({ type: 1, status: 1 });
ShipmentSchema.index({ shipmentId: 1 }, { unique: true });

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
export default Shipment;
