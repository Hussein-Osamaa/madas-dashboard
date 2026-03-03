/**
 * Order lifecycle → StockTransaction:
 * DRAFT → RESERVED: create RESERVED +qty per item
 * RESERVED → SHIPPING: create RESERVED -qty (release), SHIPPING +qty per item
 * SHIPPING → DELIVERED: create SHIPPING -qty (release), SOLD +qty per item
 * * → RETURNED: create RETURNED +qty (release SHIPPING or RESERVED if needed)
 * RESERVED/SHIPPING → CANCELLED: release RESERVED or SHIPPING (-qty)
 */

import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { createTransaction } from './stockService.js';

function getMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function createOrder(clientId, items, reference = '') {
  const order = await Order.create({
    clientId,
    status: 'DRAFT',
    reference,
    items: items.filter((i) => i.quantity > 0),
  });
  return order;
}

/** Confirm order: DRAFT → RESERVED, create RESERVED transactions */
export async function confirmOrder(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (order.status !== 'DRAFT') throw new Error('Order already confirmed or closed');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'RESERVED',
      quantity: item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'RESERVED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Move to SHIPPING: release RESERVED, create SHIPPING */
export async function shipOrder(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (order.status !== 'RESERVED') throw new Error('Order must be RESERVED to ship');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'RESERVED',
      quantity: -item.quantity,
      reference: ref,
      month,
    });
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'SHIPPING',
      quantity: item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'SHIPPING';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Mark delivered: release SHIPPING, create SOLD */
export async function deliverOrder(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (order.status !== 'SHIPPING') throw new Error('Order must be SHIPPING to deliver');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'SHIPPING',
      quantity: -item.quantity,
      reference: ref,
      month,
    });
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'SOLD',
      quantity: item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'DELIVERED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Mark returned: create RETURNED; release SHIPPING or RESERVED if needed */
export async function returnOrder(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (!['RESERVED', 'SHIPPING', 'DELIVERED'].includes(order.status)) throw new Error('Cannot return this order');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    if (order.status === 'SHIPPING') {
      await createTransaction({
        productId: product._id,
        clientId: order.clientId,
        type: 'SHIPPING',
        quantity: -item.quantity,
        reference: ref,
        month,
      });
    } else if (order.status === 'RESERVED') {
      await createTransaction({
        productId: product._id,
        clientId: order.clientId,
        type: 'RESERVED',
        quantity: -item.quantity,
        reference: ref,
        month,
      });
    } else if (order.status === 'DELIVERED') {
      // was sold; return adds stock back
      await createTransaction({
        productId: product._id,
        clientId: order.clientId,
        type: 'RETURNED',
        quantity: item.quantity,
        reference: ref,
        month,
      });
    }
  }

  order.status = 'RETURNED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Mark as lost in transit: release SHIPPING, create MISSING */
export async function markOrderLost(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (order.status !== 'SHIPPING') throw new Error('Order must be SHIPPING to mark as lost');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'SHIPPING',
      quantity: -item.quantity,
      reference: ref,
      month,
    });
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'MISSING',
      quantity: item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'CANCELLED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Mark as damaged in transit: release SHIPPING, create DAMAGED */
export async function markOrderDamaged(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (order.status !== 'SHIPPING') throw new Error('Order must be SHIPPING to mark as damaged');

  const month = getMonth();
  const ref = String(orderId);

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'SHIPPING',
      quantity: -item.quantity,
      reference: ref,
      month,
    });
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: 'DAMAGED',
      quantity: item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'CANCELLED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}

/** Cancel: release RESERVED or SHIPPING */
export async function cancelOrder(orderId) {
  const order = await Order.findById(orderId).populate('items.productId');
  if (!order) throw new Error('Order not found');
  if (!['DRAFT', 'RESERVED', 'SHIPPING'].includes(order.status)) throw new Error('Cannot cancel this order');

  if (order.status === 'DRAFT') {
    order.status = 'CANCELLED';
    order.updatedAt = new Date();
    await order.save();
    return order;
  }

  const month = getMonth();
  const ref = String(orderId);
  const releaseType = order.status === 'SHIPPING' ? 'SHIPPING' : 'RESERVED';

  for (const item of order.items) {
    const product = item.productId;
    if (!product) continue;
    await createTransaction({
      productId: product._id,
      clientId: order.clientId,
      type: releaseType,
      quantity: -item.quantity,
      reference: ref,
      month,
    });
  }

  order.status = 'CANCELLED';
  order.updatedAt = new Date();
  await order.save();
  return order;
}
