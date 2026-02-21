import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditScan {
  barcode: string;
  productId: string;
  quantity: number;
}

export type AuditSessionStatus = 'ACTIVE' | 'FINISHED' | 'in_progress' | 'completed' | 'cancelled';

export interface IAuditSession extends Document {
  clientId: string;
  /** @deprecated use participants/createdBy */
  workerId?: string;
  status: AuditSessionStatus;
  /** @deprecated use AuditScan collection + scannedBarcodes */
  scans: IAuditScan[];
  startedAt: Date;
  finishedAt?: Date;
  /** Admin who started the session (only they can finish). */
  createdBy: string;
  /** 6-digit code for workers to join. */
  joinCode: string;
  /** User IDs of workers in this audit. */
  participants: string[];
  /** All barcodes scanned this session (for quick checks). */
  scannedBarcodes: string[];
  /** Per-worker scan count for leaderboard. */
  workerScanCounts: Record<string, number>;
}

const AuditScanSchema = new Schema<IAuditScan>({ barcode: String, productId: String, quantity: Number }, { _id: false });

const AuditSessionSchema = new Schema<IAuditSession>(
  {
    clientId: { type: String, required: true },
    workerId: { type: String },
    status: {
      type: String,
      enum: ['ACTIVE', 'FINISHED', 'in_progress', 'completed', 'cancelled'],
      default: 'ACTIVE',
    },
    scans: { type: [AuditScanSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    createdBy: { type: String, required: true },
    joinCode: { type: String, required: true, index: true },
    participants: { type: [String], default: [] },
    scannedBarcodes: { type: [String], default: [] },
    workerScanCounts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditSessionSchema.index({ clientId: 1 });
AuditSessionSchema.index({ status: 1, participants: 1 });

export const AuditSessionModel: Model<IAuditSession> =
  mongoose.models.AuditSessionModule ?? mongoose.model<IAuditSession>('AuditSessionModule', AuditSessionSchema);
