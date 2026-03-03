import mongoose from 'mongoose';

const TYPES = [
  'INBOUND',
  'SOLD',
  'DAMAGED',
  'MISSING',
  'ADJUSTMENT',
  'AUDIT',
  'RESERVED',
  'SHIPPING',
  'RETURNED',
];

const stockTransactionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, required: true, enum: TYPES },
    quantity: { type: Number, required: true },
    reference: { type: String, default: '' },
    month: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ productId: 1, createdAt: 1 });
stockTransactionSchema.index({ clientId: 1, month: 1 });
stockTransactionSchema.index({ clientId: 1, type: 1, createdAt: 1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
export { TYPES as STOCK_TRANSACTION_TYPES };
