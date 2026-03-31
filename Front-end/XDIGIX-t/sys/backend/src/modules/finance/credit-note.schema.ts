import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ──────────────────────────────────────────────────────── */

export type CreditNoteStatus = 'issued' | 'applied' | 'expired';

/* ── Interface ──────────────────────────────────────────────────── */

export interface ICreditNote extends Document {
  tenantId: string;
  businessId: string;
  creditNoteNumber: string;
  returnId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  reason: string;
  status: CreditNoteStatus;
  createdAt: Date;
}

/* ── Schema ─────────────────────────────────────────────────────── */

const CreditNoteSchema = new Schema<ICreditNote>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    creditNoteNumber: { type: String, required: true },
    returnId: { type: String },
    orderId: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'SAR' },
    reason: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['issued', 'applied', 'expired'],
      default: 'issued',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'finance_credit_notes',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

CreditNoteSchema.index({ tenantId: 1 });
CreditNoteSchema.index({ returnId: 1 }, { sparse: true });
CreditNoteSchema.index({ orderId: 1 }, { sparse: true });

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Generate a credit note number in format CN-YYYYMMDD-XXXX.
 */
export function generateCreditNoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CN-${year}${month}${day}-${random}`;
}

export const CreditNote = (mongoose.models.CreditNote as mongoose.Model<ICreditNote>) || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);
export default CreditNote;
