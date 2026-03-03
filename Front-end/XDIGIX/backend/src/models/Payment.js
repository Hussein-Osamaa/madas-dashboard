const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online', 'other'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reference: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ clientId: 1, date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
