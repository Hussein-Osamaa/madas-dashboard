const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: mongoose.Schema.Types.ObjectId,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    condition: {
      type: String,
      enum: ['restock', 'damaged'],
      required: true,
    },
    notes: String,
  },
  { _id: true }
);

const returnSchema = new mongoose.Schema(
  {
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    items: {
      type: [returnItemSchema],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Return must have at least one item',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

returnSchema.index({ clientId: 1, createdAt: -1 });
returnSchema.index({ status: 1 });

module.exports = mongoose.model('Return', returnSchema);
