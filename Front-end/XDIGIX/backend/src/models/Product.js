const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    size: String,
    color: String,
    sku: String,
    barcode: String,
    quantity: {
      type: Number,
      default: 0,
    },
    costPrice: Number,
    sellingPrice: Number,
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      sparse: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    // Base product cost/sell (used when no variants)
    costPrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockAlert: {
      type: Number,
      default: 5,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ clientId: 1, name: 1 });
productSchema.index({ clientId: 1, sku: 1 });
productSchema.index({ clientId: 1, barcode: 1 });
productSchema.index({ 'variants.barcode': 1 });

module.exports = mongoose.model('Product', productSchema);
