import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRestockItem {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
}

export interface IRestockReport extends Document {
  clientId: string;
  clientName?: string;
  staffId?: string;
  staffEmail?: string;
  items: IRestockItem[];
  totalItems: number;
  sessionNote?: string;
  emailSent: boolean;
  finishedAt: Date;
  createdAt: Date;
}

const RestockReportSchema = new Schema<IRestockReport>(
  {
    clientId: { type: String, required: true, index: true },
    clientName: { type: String },
    staffId: { type: String },
    staffEmail: { type: String },
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String },
        sku: { type: String },
        quantity: { type: Number, required: true },
      },
    ],
    totalItems: { type: Number, default: 0 },
    sessionNote: { type: String },
    emailSent: { type: Boolean, default: false },
    finishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RestockReportSchema.index({ finishedAt: -1 });

export const RestockReport: Model<IRestockReport> =
  mongoose.models.RestockReport ??
  mongoose.model<IRestockReport>('RestockReport', RestockReportSchema);
