import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockMovement extends Document {
  tenantId: string;
  businessId: string;
  productId: string;
  variantId: string;
  type:
    | 'reservation'
    | 'release'
    | 'fulfillment'
    | 'receiving'
    | 'damage'
    | 'missing'
    | 'adjustment'
    | 'return';
  qty: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  actor: string;
  correlationId?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'reservation',
        'release',
        'fulfillment',
        'receiving',
        'damage',
        'missing',
        'adjustment',
        'return',
      ],
      required: true,
    },
    qty: { type: Number, required: true },
    referenceType: { type: String },
    referenceId: { type: String },
    reason: { type: String },
    actor: { type: String, required: true },
    correlationId: { type: String },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: false,
  }
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, createdAt: -1 });
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const StockMovement: Model<IStockMovement> = mongoose.model<IStockMovement>(
  'StockMovement',
  StockMovementSchema
);
