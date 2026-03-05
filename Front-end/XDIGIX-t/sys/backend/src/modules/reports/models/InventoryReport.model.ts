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
  /** Detailed per-product, per-size audit breakdown */
  detailedProductBreakdown?: Array<{
    productId: string;
    name: string;
    sku: string;
    mainBarcode: string;
    expectedTotal: number;
    actualTotal: number;
    type: string;
    sizeBreakdown: Array<{
      size: string;
      expectedCount: number;
      scannedCount: number;
      sizeBarcode?: string;
      difference: number;
    }>;
  }>;
  /** Products scanned MORE than expected (extras/unreturned) */
  extraProducts?: Array<{
    productId: string;
    name: string;
    sku: string;
    mainBarcode: string;
    expectedTotal: number;
    actualTotal: number;
    type: string;
    excessQuantity: number;
    sizeBreakdown: Array<{
      size: string;
      expectedCount: number;
      scannedCount: number;
      sizeBarcode?: string;
      difference: number;
    }>;
  }>;
  // Monthly: opening from previous month
  openingBalance?: number;
  // Movement-based weekly: totals from inventory_movements
  stockIn?: number;
  picked?: number;
  shipped?: number;
  returned?: number;
  manualAdjustment?: number;
  topSkus?: Array<{ sku: string; totalMovement: number; in: number; out: number }>;
  reportSource?: 'audit' | 'movements';
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
    detailedProductBreakdown: Schema.Types.Mixed,
    extraProducts: Schema.Types.Mixed,
    openingBalance: Number,
    stockIn: Number,
    picked: Number,
    shipped: Number,
    returned: Number,
    manualAdjustment: Number,
    topSkus: Schema.Types.Mixed,
    reportSource: String,
  },
  { timestamps: true }
);

InventoryReportSchema.index({ clientId: 1 });
InventoryReportSchema.index({ periodStart: 1 });

export const InventoryReportModel: Model<IInventoryReport> =
  mongoose.models.InventoryReportModule ??
  mongoose.model<IInventoryReport>('InventoryReportModule', InventoryReportSchema);
