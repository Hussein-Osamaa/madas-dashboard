import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
  },
  { timestamps: true }
);

productSchema.index({ clientId: 1, sku: 1 }, { unique: true });
productSchema.index({ clientId: 1, barcode: 1 }, { unique: true });

export const Product = mongoose.model('Product', productSchema);
