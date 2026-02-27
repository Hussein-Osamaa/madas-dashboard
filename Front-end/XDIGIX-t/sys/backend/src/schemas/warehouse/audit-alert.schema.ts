/**
 * Dashboard alert when physical vs system variance exceeds threshold.
 * Created when recording a physical count and |difference| > threshold.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditAlert extends Document {
  clientId: string;
  comparisonId: mongoose.Types.ObjectId;
  sku: string;
  physicalCount: number;
  systemStock: number;
  difference: number;
  threshold: number;
  shiftId?: string;
  shiftName?: string;
  performedBy?: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

const AuditAlertSchema = new Schema<IAuditAlert>(
  {
    clientId: { type: String, required: true, index: true },
    comparisonId: { type: Schema.Types.ObjectId, required: true, ref: 'AuditComparison' },
    sku: { type: String, required: true },
    physicalCount: { type: Number, required: true },
    systemStock: { type: Number, required: true },
    difference: { type: Number, required: true },
    threshold: { type: Number, required: true },
    shiftId: { type: String },
    shiftName: { type: String },
    performedBy: { type: String },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditAlertSchema.index({ clientId: 1, acknowledged: 1, createdAt: -1 });

export const AuditAlertModel: Model<IAuditAlert> =
  mongoose.models.AuditAlert ?? mongoose.model<IAuditAlert>('AuditAlert', AuditAlertSchema);
