import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IReturnItem {
  lineItemIndex: number;
  productId: string;
  variantId?: string;
  name: string;
  orderedQuantity: number;
  returnQuantity: number;
  condition?: 'good' | 'damaged' | 'missing' | null;
  resolution?: 'refund' | 'store_credit' | 'exchange' | 'no_refund' | null;
  resolutionAmount?: number;
  resolutionNote?: string;
}

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'in_transit_back'
  | 'received'
  | 'inspected'
  | 'resolved';

export interface IReturn extends Document {
  returnId: string;
  orderId: string;
  tenantId: string;
  businessId: string;
  type: 'full' | 'partial';
  status: ReturnStatus;
  items: IReturnItem[];
  totalRefundAmount?: number;
  reason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    lineItemIndex: { type: Number, required: true },
    productId: { type: String, required: true },
    variantId: { type: String },
    name: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 1 },
    returnQuantity: { type: Number, required: true, min: 1 },
    condition: {
      type: String,
      enum: ['good', 'damaged', 'missing', null],
      default: null,
    },
    resolution: {
      type: String,
      enum: ['refund', 'store_credit', 'exchange', 'no_refund', null],
      default: null,
    },
    resolutionAmount: { type: Number, min: 0 },
    resolutionNote: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const ReturnSchema = new Schema<IReturn>(
  {
    returnId: {
      type: String,
      required: true,
      unique: true,
      default: () => `RET-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    orderId: {
      type: String,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    businessId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['full', 'partial'],
    },
    status: {
      type: String,
      required: true,
      enum: ['requested', 'approved', 'rejected', 'in_transit_back', 'received', 'inspected', 'resolved'],
      default: 'requested',
    },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: [(val: IReturnItem[]) => val.length > 0, 'At least one return item required'],
    },
    totalRefundAmount: {
      type: Number,
      min: 0,
    },
    reason: {
      type: String,
      maxlength: 1000,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'returns',
  }
);

// Indexes
ReturnSchema.index({ returnId: 1 }, { unique: true });
ReturnSchema.index({ orderId: 1 });
ReturnSchema.index({ tenantId: 1, status: 1 });

export const Return: Model<IReturn> = mongoose.model<IReturn>('Return', ReturnSchema);
