const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productName: String,
    sku: String,
    variantInfo: String, // e.g. "Size: M, Color: Red"
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: Number,
    totalPrice: Number,
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: String,
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ clientId: 1, createdAt: -1 });
orderSchema.index({ clientId: 1, paymentStatus: 1 });
orderSchema.index({ clientId: 1, shippingStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
