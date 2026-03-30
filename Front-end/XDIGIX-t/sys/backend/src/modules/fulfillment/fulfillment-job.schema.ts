import mongoose, { Schema, Document } from 'mongoose';

/* ── Interfaces ─────────────────────────────────────────────────── */

export interface IFulfillmentItem {
  lineItemIndex: number;
  productId: string;
  variantId?: string;
  sku?: string;
  name: string;
  qty: number;
  pickedQty: number;
  packedQty: number;
  shortQty: number;
}

export type FulfillmentJobStatus =
  | 'created'
  | 'picking'
  | 'picked'
  | 'packing'
  | 'packed'
  | 'handed_to_shipping'
  | 'short_pick'
  | 'cancelled';

export interface IFulfillmentJob extends Document {
  fulfillmentJobId: string;
  tenantId: string;
  businessId: string;
  orderId: string;
  status: FulfillmentJobStatus;
  items: IFulfillmentItem[];
  assignedTo?: string;
  priority: 'normal' | 'high' | 'urgent';
  notes?: string;
  shortPickReason?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  pickedAt?: Date;
  packedAt?: Date;
  handedToShippingAt?: Date;
}

/* ── State machine ──────────────────────────────────────────────── */

export const VALID_TRANSITIONS: Record<FulfillmentJobStatus, FulfillmentJobStatus[]> = {
  created: ['picking', 'cancelled'],
  picking: ['picked', 'short_pick', 'cancelled'],
  picked: ['packing', 'cancelled'],
  short_pick: ['picking', 'cancelled'],
  packing: ['packed', 'cancelled'],
  packed: ['handed_to_shipping'],
  handed_to_shipping: [],
  cancelled: [],
};

/** Check whether a transition is allowed (pure boolean). */
export function canTransitionJob(from: FulfillmentJobStatus, to: FulfillmentJobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Validate a transition — throws if invalid. */
export function validateJobTransition(from: FulfillmentJobStatus, to: FulfillmentJobStatus): void {
  if (!canTransitionJob(from, to)) {
    throw new Error(`Invalid fulfillment job transition: ${from} -> ${to}`);
  }
}

/* ── Mongoose Schema ────────────────────────────────────────────── */

const FulfillmentItemSchema = new Schema<IFulfillmentItem>(
  {
    lineItemIndex: { type: Number, required: true },
    productId: { type: String, required: true },
    variantId: { type: String },
    sku: { type: String },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    pickedQty: { type: Number, required: true, default: 0, min: 0 },
    packedQty: { type: Number, required: true, default: 0, min: 0 },
    shortQty: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const FulfillmentJobSchema = new Schema<IFulfillmentJob>(
  {
    fulfillmentJobId: { type: String, required: true },
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    orderId: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['created', 'picking', 'picked', 'packing', 'packed', 'handed_to_shipping', 'short_pick', 'cancelled'],
      default: 'created',
    },
    items: { type: [FulfillmentItemSchema], required: true },
    assignedTo: { type: String },
    priority: {
      type: String,
      required: true,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    notes: { type: String },
    shortPickReason: { type: String },
    startedAt: { type: Date },
    pickedAt: { type: Date },
    packedAt: { type: Date },
    handedToShippingAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'fulfillment_jobs',
  },
);

/* ── Indexes ────────────────────────────────────────────────────── */
FulfillmentJobSchema.index({ tenantId: 1, status: 1 });
FulfillmentJobSchema.index({ orderId: 1 }, { unique: true });
FulfillmentJobSchema.index({ assignedTo: 1, status: 1 });
FulfillmentJobSchema.index({ priority: -1, createdAt: 1 });
FulfillmentJobSchema.index({ fulfillmentJobId: 1 }, { unique: true });

export const FulfillmentJob = mongoose.model<IFulfillmentJob>('FulfillmentJob', FulfillmentJobSchema);
export default FulfillmentJob;
