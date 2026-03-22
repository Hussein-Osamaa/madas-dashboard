import mongoose, { Schema, Document, Model } from 'mongoose';

export type RestockSessionStatus = 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export interface IRestockSession extends Document {
  clientId: string;
  status: RestockSessionStatus;
  /** Staff who started the session (only they can finish). */
  createdBy: string;
  /** 6-digit alphanumeric join code. */
  joinCode: string;
  /** User IDs of workers in this session. */
  participants: string[];
  /** Per-worker scan count. */
  workerScanCounts: Record<string, number>;
  /** Total scan count (denormalised for quick reads). */
  totalScans: number;
  /** Count of scans that didn't match any product barcode. */
  unmatchedScans: number;
  startedAt: Date;
  finishedAt?: Date;
}

const RestockSessionSchema = new Schema<IRestockSession>(
  {
    clientId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'FINISHED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    createdBy: { type: String, required: true },
    joinCode: { type: String, required: true, index: true },
    participants: { type: [String], default: [] },
    workerScanCounts: { type: Schema.Types.Mixed, default: {} },
    totalScans: { type: Number, default: 0 },
    unmatchedScans: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
  },
  { timestamps: true },
);

RestockSessionSchema.index({ status: 1, participants: 1 });

export const RestockSessionModel: Model<IRestockSession> =
  mongoose.models.RestockSession ??
  mongoose.model<IRestockSession>('RestockSession', RestockSessionSchema);
