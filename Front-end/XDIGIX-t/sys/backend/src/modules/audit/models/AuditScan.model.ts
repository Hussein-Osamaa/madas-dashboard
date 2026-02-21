import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditScanDoc extends Document {
  auditSessionId: mongoose.Types.ObjectId;
  productId: string;
  barcode: string;
  workerId: string;
  scannedAt: Date;
  productName?: string;
  productSku?: string;
}

const AuditScanSchema = new Schema<IAuditScanDoc>(
  {
    auditSessionId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: { type: String, required: true },
    barcode: { type: String, required: true },
    workerId: { type: String, required: true, index: true },
    scannedAt: { type: Date, default: Date.now },
    productName: { type: String },
    productSku: { type: String },
  },
  { timestamps: true }
);

AuditScanSchema.index({ auditSessionId: 1, workerId: 1, barcode: 1, scannedAt: -1 });

export const AuditScanModel: Model<IAuditScanDoc> =
  mongoose.models.AuditScan ?? mongoose.model<IAuditScanDoc>('AuditScan', AuditScanSchema);
