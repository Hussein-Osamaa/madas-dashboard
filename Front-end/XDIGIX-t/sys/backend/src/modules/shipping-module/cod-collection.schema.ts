import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────────────────── */

export type CodCollectionStatus = 'pending' | 'reconciled' | 'discrepancy';

export interface ICodCollection extends Document {
  tenantId: string;
  businessId: string;
  carrierId: string;
  reportDate: Date;
  expectedAmount: number;
  actualAmount: number;
  discrepancy: number;
  currency: string;
  status: CodCollectionStatus;
  shipmentIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/* ── Mongoose Schema ───────────────────────────────────────────── */

const CodCollectionSchema = new Schema<ICodCollection>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    carrierId: { type: String, required: true },
    reportDate: { type: Date, required: true },
    expectedAmount: { type: Number, required: true, min: 0 },
    actualAmount: { type: Number, required: true, min: 0 },
    discrepancy: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'EGP' },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'reconciled', 'discrepancy'],
      default: 'pending',
    },
    shipmentIds: { type: [String], required: true, default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'cod_collections',
  },
);

/* ── Indexes ───────────────────────────────────────────────────── */
CodCollectionSchema.index({ tenantId: 1, reportDate: 1 });
CodCollectionSchema.index({ carrierId: 1, status: 1 });

export const CodCollection = (mongoose.models.CodCollection as mongoose.Model<ICodCollection>) || mongoose.model<ICodCollection>('CodCollection', CodCollectionSchema);
export default CodCollection;
