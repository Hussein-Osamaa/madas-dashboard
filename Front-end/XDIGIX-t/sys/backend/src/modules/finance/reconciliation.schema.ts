import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ──────────────────────────────────────────────────────── */

export type ReconciliationType = 'cod' | 'payment' | 'manual';
export type ReconciliationStatus = 'pending' | 'matched' | 'discrepancy' | 'resolved';

/* ── Interface ──────────────────────────────────────────────────── */

export interface IReconciliation extends Document {
  tenantId: string;
  businessId: string;
  type: ReconciliationType;
  periodStart: Date;
  periodEnd: Date;
  expectedAmount: number;
  actualAmount: number;
  discrepancy: number;
  currency: string;
  status: ReconciliationStatus;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

/* ── Schema ─────────────────────────────────────────────────────── */

const ReconciliationSchema = new Schema<IReconciliation>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['cod', 'payment', 'manual'],
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    expectedAmount: { type: Number, required: true },
    actualAmount: { type: Number, required: true },
    discrepancy: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'SAR' },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'matched', 'discrepancy', 'resolved'],
      default: 'pending',
    },
    notes: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'finance_reconciliations',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

ReconciliationSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

export const Reconciliation = (mongoose.models.Reconciliation as mongoose.Model<IReconciliation>) || mongoose.model<IReconciliation>('Reconciliation', ReconciliationSchema);
export default Reconciliation;
