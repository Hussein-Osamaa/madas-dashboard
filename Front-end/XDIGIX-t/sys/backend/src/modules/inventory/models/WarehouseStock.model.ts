/**
 * WarehouseStock - Materialized cache (NOT source of truth).
 * Updated only by InventoryService.recordTransaction() within MongoDB transaction.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWarehouseStock extends Document {
  productId: string;
  clientId: string;
  availableQuantity: number;
  lastTransactionAt: Date;
  updatedAt: Date;
}

const WarehouseStockSchema = new Schema<IWarehouseStock>(
  {
    productId: { type: String, required: true },
    clientId: { type: String, required: true },
    availableQuantity: { type: Number, required: true, default: 0 },
    lastTransactionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

WarehouseStockSchema.index({ productId: 1, clientId: 1 }, { unique: true });
WarehouseStockSchema.index({ clientId: 1 });

export const WarehouseStockModel: Model<IWarehouseStock> =
  mongoose.models.WarehouseStockModule ??
  mongoose.model<IWarehouseStock>('WarehouseStockModule', WarehouseStockSchema);
