import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRestockScan extends Document {
  restockSessionId: mongoose.Types.ObjectId;
  productId: string;
  barcode: string;
  workerId: string;
  scannedAt: Date;
  productName?: string;
  size?: string;
  /** true when barcode matched a product, false for unmatched scans */
  matched: boolean;
}

const RestockScanSchema = new Schema<IRestockScan>(
  {
    restockSessionId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: { type: String, default: '' },
    barcode: { type: String, required: true },
    workerId: { type: String, required: true, index: true },
    scannedAt: { type: Date, default: Date.now },
    productName: { type: String },
    size: { type: String },
    matched: { type: Boolean, default: true },
  },
  { timestamps: true },
);

RestockScanSchema.index({ restockSessionId: 1, workerId: 1, barcode: 1, scannedAt: -1 });

export const RestockScanModel: Model<IRestockScan> =
  mongoose.models.RestockScan ??
  mongoose.model<IRestockScan>('RestockScan', RestockScanSchema);
