const Product = require('../models/Product');
const Client = require('../models/Client');
const { adjustStockOnAudit } = require('../services/inventoryService');
const mongoose = require('mongoose');

const getClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { clientId: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/products
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = getClientFilter(req);
    if (req.query.clientId && (req.user.role === 'admin' || req.user.role === 'staff')) {
      filter.clientId = req.query.clientId;
    }
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$lowStockAlert'] };
    }
    const products = await Product.find(filter)
      .populate('clientId', 'brandName')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/products/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const product = await Product.findOne(filter)
      .populate('clientId', 'brandName owner')
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/products/barcode/:barcode
 */
exports.getByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const filter = getClientFilter(req);
    const product = await Product.findOne({
      ...filter,
      $or: [{ barcode }, { 'variants.barcode': barcode }],
    })
      .populate('clientId', 'brandName')
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/products
 */
exports.create = async (req, res, next) => {
  try {
    const clientFilter = getClientFilter(req);
    if (clientFilter.clientId && req.body.clientId !== clientFilter.clientId.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot create product for another client' });
    }
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/products/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const product = await Product.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('clientId', 'brandName')
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/products/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const product = await Product.findOneAndDelete(filter);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/products/audit
 */
exports.audit = async (req, res, next) => {
  try {
    const { productId, quantity, variantId } = req.body;
    await adjustStockOnAudit(productId, quantity, variantId, req.user._id);
    const product = await Product.findById(productId)
      .populate('clientId', 'brandName')
      .lean();
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};
