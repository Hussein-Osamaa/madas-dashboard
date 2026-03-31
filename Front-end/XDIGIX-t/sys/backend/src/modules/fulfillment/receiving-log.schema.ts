import mongoose, { Schema, Document } from 'mongoose';

/* ── Interfaces ─────────────────────────────────────────────────── */

export interface IReceivingItem {
  productId: string;
  variantId?: string;
  name: string;
  qty: number;
  condition?: 'good' | 'damaged' | 'missing';
}

export interface IReceivingLog extends Document {
  tenantId: string;
  businessId: string;
  type: 'purchase_order' | 'return' | 'manual';
  referenceType?: string;
  referenceId?: string;
  items: IReceivingItem[];
  receivedBy: string;
  notes?: string;
  createdAt: Date;
}

/* ── Mongoose Schema ────────────────────────────────────────────── */

const ReceivingItemSchema = new Schema<IReceivingItem>(
  {
    productId: { type: String, required: true },
    variantId: { type: String },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    condition: {
      type: String,
      enum: ['good', 'damaged', 'missing'],
    },
  },
  { _id: false },
);

const ReceivingLogSchema = new Schema<IReceivingLog>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['purchase_order', 'return', 'manual'],
    },
    referenceType: { type: String },
    referenceId: { type: String },
    items: { type: [ReceivingItemSchema], required: true },
    receivedBy: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'receiving_logs',
  },
);

/* ── Indexes ────────────────────────────────────────────────────── */
ReceivingLogSchema.index({ tenantId: 1, createdAt: -1 });
ReceivingLogSchema.index({ referenceType: 1, referenceId: 1 });

export const ReceivingLog = (mongoose.models.ReceivingLog as mongoose.Model<IReceivingLog>) || mongoose.model<IReceivingLog>('ReceivingLog', ReceivingLogSchema);
export default ReceivingLog;
