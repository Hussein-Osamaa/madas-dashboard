/**
 * StockTransaction - Single source of truth for inventory.
 * Stock is NEVER stored manually. All changes go through this ledger.
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
  productId: string;
  clientId: string;
  type: StockTransactionType;
  quantity: number;
  referenceId?: string;
  month: string;
  performedByStaffId?: string;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    productId: { type: String, required: true },
    clientId: { type: String, required: true },
    type: {
      type: String,
      enum: ['INBOUND', 'RESERVED', 'SHIPPING', 'SOLD', 'RETURNED', 'DAMAGED', 'MISSING', 'ADJUSTMENT', 'AUDIT'],
      required: true,
    },
    quantity: { type: Number, required: true }, // positive; 0 allowed for AUDIT
    referenceId: String,
    month: { type: String, required: true },
    performedByStaffId: String,
  },
  { timestamps: true }
);

StockTransactionSchema.index({ productId: 1, clientId: 1, createdAt: 1 });
StockTransactionSchema.index({ clientId: 1 });
StockTransactionSchema.index({ month: 1 });

export const StockTransactionModel: Model<IStockTransaction> =
  mongoose.models.StockTransactionModule ??
  mongoose.model<IStockTransaction>('StockTransactionModule', StockTransactionSchema);
