import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductActivityAction = 'created' | 'updated' | 'deleted';

export interface IProductActivityLog extends Document {
  clientId: string;
  productId: string;
  productName?: string;
  action: ProductActivityAction;
  performedByUserId: string;
  performedByEmail: string;
  details?: Record<string, unknown>;
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
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ProductActivityLogSchema.index({ clientId: 1, createdAt: -1 });
ProductActivityLogSchema.index({ productId: 1, createdAt: -1 });
ProductActivityLogSchema.index({ action: 1, createdAt: -1 });
ProductActivityLogSchema.index({ performedByUserId: 1, createdAt: -1 });

export const ProductActivityLog: Model<IProductActivityLog> = (mongoose.models.ProductActivityLog as mongoose.Model<IProductActivityLog>) || mongoose.model<IProductActivityLog>('ProductActivityLog', ProductActivityLogSchema);
