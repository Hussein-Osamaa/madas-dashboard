import mongoose, { Schema, Document } from 'mongoose';

/* ── Ledger Entry Types ─────────────────────────────────────────── */

export type LedgerEntryType =
  | 'revenue_receivable'
  | 'revenue_recognized'
  | 'payment_received'
  | 'refund'
  | 'expense'
  | 'cod_receipt'
  | 'cod_adjustment'
  | 'write_off';

export type LedgerEntryStatus =
  | 'pending'
  | 'accrued'
  | 'recognized'
  | 'voided'
  | 'reversed';

export type LedgerReferenceType = 'order' | 'invoice' | 'return' | 'manual';

/* ── Interface ──────────────────────────────────────────────────── */

export interface ILedgerEntry extends Document {
  tenantId: string;
  businessId: string;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  referenceType: LedgerReferenceType;
  referenceId: string;
  orderId?: string;
  invoiceId?: string;
  status: LedgerEntryStatus;
  revenuePolicy?: Record<string, unknown>;
  details?: Record<string, unknown>;
  correlationId?: string;
  createdBy?: string;
  createdAt: Date;
}

/* ── Schema ─────────────────────────────────────────────────────── */

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'revenue_receivable',
        'revenue_recognized',
        'payment_received',
        'refund',
        'expense',
        'cod_receipt',
        'cod_adjustment',
        'write_off',
      ],
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true, default: 'SAR' },
    referenceType: {
      type: String,
      required: true,
      enum: ['order', 'invoice', 'return', 'manual'],
    },
    referenceId: { type: String, required: true },
    orderId: { type: String },
    invoiceId: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accrued', 'recognized', 'voided', 'reversed'],
      default: 'pending',
    },
    revenuePolicy: { type: Schema.Types.Mixed },
    details: { type: Schema.Types.Mixed },
    correlationId: { type: String },
    createdBy: { type: String },
  },
  {
    // Append-mostly: createdAt only, no updatedAt by default.
    // Status can change but entries are never deleted.
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'finance_ledger_entries',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

LedgerEntrySchema.index({ tenantId: 1, createdAt: -1 });
LedgerEntrySchema.index({ tenantId: 1, type: 1 });
LedgerEntrySchema.index({ orderId: 1 }, { sparse: true });
LedgerEntrySchema.index({ referenceType: 1, referenceId: 1 });

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
export default LedgerEntry;
