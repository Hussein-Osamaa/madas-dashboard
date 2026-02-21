import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReportPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface IInventoryReport extends Document {
  clientId: string;
  period: ReportPeriod;
  periodLabel: string; // YYYY-WXX | YYYY-MM | YYYY
  periodStart: Date;
  periodEnd: Date;
  inbound: number;
  sold: number;
  damaged: number;
  missing: number;
  closingBalance: number;
  pdfUrl?: string;
  // Weekly (operational): audit totals and comparison
  totalMissingThisAudit?: number;
  totalAdjustmentsThisAudit?: number;
  totalDamagedLast7Days?: number;
  previousWeekClosingBalance?: number;
  productBreakdown?: Array<{ productId: string; availableStock: number }>;
  // Monthly: opening from previous month
  openingBalance?: number;
  createdAt: Date;
}

const InventoryReportSchema = new Schema<IInventoryReport>(
  {
    clientId: { type: String, required: true },
    period: { type: String, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'], required: true },
    periodLabel: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    inbound: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    missing: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    pdfUrl: String,
    totalMissingThisAudit: Number,
    totalAdjustmentsThisAudit: Number,
    totalDamagedLast7Days: Number,
    previousWeekClosingBalance: Number,
    productBreakdown: Schema.Types.Mixed,
    openingBalance: Number,
  },
  { timestamps: true }
);

InventoryReportSchema.index({ clientId: 1 });
InventoryReportSchema.index({ periodStart: 1 });

export const InventoryReportModel: Model<IInventoryReport> =
  mongoose.models.InventoryReportModule ??
  mongoose.model<IInventoryReport>('InventoryReportModule', InventoryReportSchema);
