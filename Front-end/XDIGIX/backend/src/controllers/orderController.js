const Order = require('../models/Order');
const Product = require('../models/Product');
const { decreaseStockOnOrder } = require('../services/inventoryService');
const mongoose = require('mongoose');

const getClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { clientId: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/orders
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = getClientFilter(req);
    if (req.query.clientId && (req.user.role === 'admin' || req.user.role === 'staff')) {
      filter.clientId = req.query.clientId;
    }
    if (req.query.shippingStatus) filter.shippingStatus = req.query.shippingStatus;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    const orders = await Order.find(filter)
      .populate('clientId', 'brandName')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/orders/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const order = await Order.findOne(filter)
      .populate('clientId', 'brandName owner')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku barcode variants')
      .lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/orders
 */
exports.create = async (req, res, next) => {
  try {
    const clientFilter = getClientFilter(req);
    const { clientId } = req.body;
    if (clientFilter.clientId && clientId !== clientFilter.clientId.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot create order for another client' });
    }

    const itemsWithPrices = [];
    let totalPrice = 0;

    for (const item of req.body.items) {
      const product = await Product.findById(item.product).lean();
      if (!product) throw new Error(`Product ${item.product} not found`);
      if (product.clientId.toString() !== clientId) {
        throw new Error(`Product ${item.product} does not belong to client`);
      }

      let unitPrice, qty = item.quantity || 1;

      if (item.variantId && product.variants?.length) {
        const v = product.variants.find((x) => x._id.toString() === item.variantId.toString());
        if (!v) throw new Error(`Variant ${item.variantId} not found`);
        unitPrice = v.sellingPrice || product.sellingPrice || 0;
        itemsWithPrices.push({
          product: item.product,
          variantId: item.variantId,
          productName: product.name,
          sku: v.sku || product.sku,
          variantInfo: [v.size, v.color].filter(Boolean).join(', '),
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
        });
      } else {
        unitPrice = product.sellingPrice || 0;
        itemsWithPrices.push({
          product: item.product,
          productName: product.name,
          sku: product.sku,
          variantInfo: '',
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
        });
      }
      totalPrice += unitPrice * qty;
    }

    const orderData = {
      ...req.body,
      items: itemsWithPrices,
      totalPrice: req.body.totalPrice ?? totalPrice,
      createdBy: req.user._id,
    };

    const order = await Order.create(orderData);

    try {
      await decreaseStockOnOrder(
        orderData.items.map((i) => ({ product: i.product, variantId: i.variantId, quantity: i.quantity })),
        req.user._id,
        order._id,
        clientId
      );
    } catch (stockErr) {
      await Order.findByIdAndDelete(order._id);
      throw stockErr;
    }

    const created = await Order.findById(order._id)
      .populate('clientId', 'brandName')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku')
      .lean();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/orders/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const allowed = ['shippingStatus', 'paymentStatus', 'notes'];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    const order = await Order.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    })
      .populate('clientId', 'brandName')
      .populate('createdBy', 'name email')
      .lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/orders/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const order = await Order.findOneAndDelete(filter);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    next(error);
  }
};
