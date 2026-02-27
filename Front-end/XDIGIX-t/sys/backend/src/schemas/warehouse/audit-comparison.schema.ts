/**
 * Physical count vs system stock comparison record.
 * System stock is computed from inventory_movements only at time of record.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditComparison extends Document {
  clientId: string;
  sku: string;
  physicalCount: number;
  systemStock: number;
  difference: number; // physicalCount - systemStock
  /** Responsible shift identifier (e.g. shift id or name). */
  shiftId?: string;
  shiftName?: string;
  performedBy?: string;
  note?: string;
  thresholdUsed: number;
  /** True if |difference| exceeded threshold (alert was created). */
  alertTriggered: boolean;
  createdAt: Date;
}

const AuditComparisonSchema = new Schema<IAuditComparison>(
  {
    clientId: { type: String, required: true, index: true },
    sku: { type: String, required: true, index: true },
    physicalCount: { type: Number, required: true },
    systemStock: { type: Number, required: true },
    difference: { type: Number, required: true },
    shiftId: { type: String },
    shiftName: { type: String },
    performedBy: { type: String },
    note: { type: String },
    thresholdUsed: { type: Number, required: true },
    alertTriggered: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditComparisonSchema.index({ clientId: 1, createdAt: -1 });
AuditComparisonSchema.index({ clientId: 1, sku: 1, createdAt: -1 });

export const AuditComparisonModel: Model<IAuditComparison> =
  mongoose.models.AuditComparison ??
  mongoose.model<IAuditComparison>('AuditComparison', AuditComparisonSchema);
