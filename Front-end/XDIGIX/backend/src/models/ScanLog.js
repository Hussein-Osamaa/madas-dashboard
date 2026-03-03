const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['order', 'return', 'audit'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    returnRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Return',
      default: null,
    },
    variantId: mongoose.Schema.Types.ObjectId,
    barcode: String,
  },
  {
    timestamps: true,
  }
);

scanLogSchema.index({ clientId: 1, createdAt: -1 });
scanLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);
