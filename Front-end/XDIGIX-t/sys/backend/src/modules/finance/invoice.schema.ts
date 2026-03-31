import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ──────────────────────────────────────────────────────── */

export type InvoiceType = 'subscription' | 'manual' | 'adjustment';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'voided';

/* ── Interfaces ─────────────────────────────────────────────────── */

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  tenantId: string;
  businessId: string;
  invoiceNumber: string;
  type: InvoiceType;
  items: IInvoiceItem[];
  subtotal: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate?: Date;
  issuedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ─────────────────────────────────────────────────────── */

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['subscription', 'manual', 'adjustment'],
    },
    items: { type: [InvoiceItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'SAR' },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'issued', 'paid', 'overdue', 'voided'],
      default: 'draft',
    },
    dueDate: { type: Date },
    issuedAt: { type: Date },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'finance_invoices',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Generate an invoice number in format INV-YYYYMMDD-XXXX.
 * The random suffix uses alphanumeric characters for uniqueness.
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}${day}-${random}`;
}

export const Invoice = (mongoose.models.Invoice as mongoose.Model<IInvoice>) || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
