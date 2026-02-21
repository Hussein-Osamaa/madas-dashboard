/**
 * StockTransaction - The ONLY source of truth for inventory changes.
 * Inventory = sum of transactions. No direct stock editing.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export type StockTransactionType =
  | 'INBOUND'
  | 'RESERVED'
  | 'SHIPPING'
  | 'SOLD'
  | 'RETURNED'
  | 'DAMAGED'
  | 'MISSING'
  | 'ADJUSTMENT'
  | 'AUDIT';

export interface IStockTransaction extends Document {
  clientId: string; // businessId
  productId: string;
  type: StockTransactionType;
  quantity: number; // positive = adds to available, negative = subtracts
  orderId?: string;
  auditSessionId?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    clientId: { type: String, required: true },
    productId: { type: String, required: true },
    type: {
      type: String,
      enum: ['INBOUND', 'RESERVED', 'SHIPPING', 'SOLD', 'RETURNED', 'DAMAGED', 'MISSING', 'ADJUSTMENT', 'AUDIT'],
      required: true,
    },
    quantity: { type: Number, required: true },
    orderId: String,
    auditSessionId: String,
    reference: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

StockTransactionSchema.index({ clientId: 1, productId: 1, createdAt: 1 });
StockTransactionSchema.index({ clientId: 1 });
StockTransactionSchema.index({ productId: 1 });
StockTransactionSchema.index({ orderId: 1 });
StockTransactionSchema.index({ createdAt: 1 });

export const StockTransaction: Model<IStockTransaction> =
  mongoose.models.StockTransaction ??
  mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
