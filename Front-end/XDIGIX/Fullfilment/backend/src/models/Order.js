import mongoose from 'mongoose';

const ORDER_STATUSES = ['DRAFT', 'RESERVED', 'SHIPPING', 'DELIVERED', 'RETURNED', 'CANCELLED'];

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    status: { type: String, required: true, enum: ORDER_STATUSES, default: 'DRAFT' },
    reference: { type: String, default: '' },
    items: [orderItemSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.index({ clientId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model('Order', orderSchema);
export { ORDER_STATUSES };
