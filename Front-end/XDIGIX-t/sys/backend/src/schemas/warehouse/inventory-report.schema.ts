/**
 * InventoryReport - Generated reports (weekly/monthly/yearly).
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReportPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface IInventoryReport extends Document {
  clientId: string; // businessId
  period: ReportPeriod;
  periodStart: Date;
  periodEnd: Date;
  opening: number;
  closing: number;
  totals: Record<string, number>;
  pdfUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const InventoryReportSchema = new Schema<IInventoryReport>(
  {
    clientId: { type: String, required: true },
    period: { type: String, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    opening: { type: Number, default: 0 },
    closing: { type: Number, default: 0 },
    totals: { type: Schema.Types.Mixed, default: {} },
    pdfUrl: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

InventoryReportSchema.index({ clientId: 1 });
InventoryReportSchema.index({ clientId: 1, period: 1 });
InventoryReportSchema.index({ periodStart: 1 });
InventoryReportSchema.index({ createdAt: 1 });

export const InventoryReport: Model<IInventoryReport> =
  mongoose.models.InventoryReport ??
  mongoose.model<IInventoryReport>('InventoryReport', InventoryReportSchema);
