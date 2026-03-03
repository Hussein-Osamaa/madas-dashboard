const Product = require('../models/Product');
const ScanLog = require('../models/ScanLog');

/**
 * Decrease stock when order is created
 * @param {Object[]} items - Order items [{ product, variantId?, quantity }]
 * @param {string} userId - Staff user ID
 * @param {string} orderId - Order reference
 */
async function decreaseStockOnOrder(items, userId, orderId, clientId) {
  for (const item of items) {
    const product = await Product.findById(item.product).lean();
    if (!product) throw new Error(`Product ${item.product} not found`);

    if (product.clientId.toString() !== clientId.toString()) {
      throw new Error('Product does not belong to client');
    }

    let updatedProduct;
    const qty = item.quantity || 1;

    if (item.variantId && product.variants?.length) {
      const variantIndex = product.variants.findIndex(
        (v) => v._id.toString() === item.variantId.toString()
      );
      if (variantIndex === -1) throw new Error('Variant not found');

      const newQty = product.variants[variantIndex].quantity - qty;
      if (newQty < 0) throw new Error(`Insufficient stock for variant ${item.variantId}`);

      const result = await Product.updateOne(
        { _id: item.product, 'variants._id': item.variantId },
        { $inc: { 'variants.$.quantity': -qty } }
      );
      if (result.modifiedCount === 0) throw new Error('Failed to update variant stock');
    } else {
      if (product.quantity < qty) throw new Error(`Insufficient stock for product ${item.product}`);
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -qty } },
        { new: true }
      );
    }

    await ScanLog.create({
      product: item.product,
      clientId,
      action: 'order',
      quantity: -qty,
      user: userId,
      orderRef: orderId,
      variantId: item.variantId || null,
    });
  }
}

/**
 * Increase stock when return is approved (restock only)
 * @param {Object[]} items - Return items [{ product, variantId?, quantity, condition }]
 * @param {string} userId - Staff user ID
 * @param {string} returnId - Return reference
 */
async function increaseStockOnReturn(items, userId, returnId, clientId) {
  for (const item of items) {
    if (item.condition !== 'restock') continue; // damaged items don't restock

    const product = await Product.findById(item.product).lean();
    if (!product) throw new Error(`Product ${item.product} not found`);
    if (product.clientId.toString() !== clientId.toString()) {
      throw new Error('Product does not belong to client');
    }

    const qty = item.quantity || 1;

    if (item.variantId && product.variants?.length) {
      await Product.updateOne(
        { _id: item.product, 'variants._id': item.variantId },
        { $inc: { 'variants.$.quantity': qty } }
      );
    } else {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: qty } });
    }

    await ScanLog.create({
      product: item.product,
      clientId,
      action: 'return',
      quantity: qty,
      user: userId,
      returnRef: returnId,
      variantId: item.variantId || null,
    });
  }
}

/**
 * Adjust stock on audit scan
 * @param {string} productId
 * @param {number} newQuantity - Scanned quantity
 * @param {string} variantId - Optional
 * @param {string} userId
 */
async function adjustStockOnAudit(productId, newQuantity, variantId, userId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new Error('Product not found');

  let oldQty;
  let diff;

  if (variantId && product.variants?.length) {
    const v = product.variants.find((x) => x._id.toString() === variantId.toString());
    if (!v) throw new Error('Variant not found');
    oldQty = v.quantity;
    diff = newQuantity - oldQty;
    await Product.updateOne(
      { _id: productId, 'variants._id': variantId },
      { $set: { 'variants.$.quantity': newQuantity } }
    );
  } else {
    oldQty = product.quantity;
    diff = newQuantity - oldQty;
    await Product.findByIdAndUpdate(productId, { $set: { quantity: newQuantity } });
  }

  await ScanLog.create({
    product: productId,
    clientId: product.clientId,
    action: 'audit',
    quantity: diff,
    user: userId,
    variantId: variantId || null,
  });
}

module.exports = {
  decreaseStockOnOrder,
  increaseStockOnReturn,
  adjustStockOnAudit,
};
