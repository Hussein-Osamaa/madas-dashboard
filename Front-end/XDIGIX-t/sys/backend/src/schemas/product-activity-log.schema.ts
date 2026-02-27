import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductActivityAction = 'created' | 'updated' | 'deleted';

export interface IProductActivityLog extends Document {
  clientId: string;
  productId: string;
  productName?: string;
  action: ProductActivityAction;
  performedByUserId: string;
  performedByEmail: string;
  createdAt: Date;
}

const ProductActivityLogSchema = new Schema<IProductActivityLog>(
  {
    clientId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String },
    action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    performedByUserId: { type: String, required: true },
    performedByEmail: { type: String, required: true },
  },
  { timestamps: true }
);

ProductActivityLogSchema.index({ clientId: 1, createdAt: -1 });

export const ProductActivityLog: Model<IProductActivityLog> = mongoose.model<IProductActivityLog>(
  'ProductActivityLog',
  ProductActivityLogSchema
);
