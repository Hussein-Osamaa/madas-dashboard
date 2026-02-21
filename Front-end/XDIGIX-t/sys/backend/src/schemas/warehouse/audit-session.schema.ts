/**
 * AuditSession - Barcode scan audit session.
 * Physical count vs expected, creates MISSING/ADJUSTMENT transactions on finish.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditScan {
  barcode: string;
  productId: string;
  quantity: number;
}

export interface IAuditSession extends Document {
  clientId: string; // businessId
  workerId: string;
  status: 'in_progress' | 'completed';
  scans: IAuditScan[];
  startedAt: Date;
  finishedAt?: Date;
  metadata?: Record<string, unknown>;
}

const AuditScanSchema = new Schema<IAuditScan>(
  {
    barcode: { type: String, required: true },
    productId: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const AuditSessionSchema = new Schema<IAuditSession>(
  {
    clientId: { type: String, required: true },
    workerId: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    scans: { type: [AuditScanSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

AuditSessionSchema.index({ clientId: 1 });
AuditSessionSchema.index({ status: 1 });
AuditSessionSchema.index({ startedAt: 1 });

export const AuditSession: Model<IAuditSession> =
  mongoose.models.AuditSession ??
  mongoose.model<IAuditSession>('AuditSession', AuditSessionSchema);
