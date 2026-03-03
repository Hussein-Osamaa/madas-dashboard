const Return = require('../models/Return');
const Order = require('../models/Order');
const { increaseStockOnReturn } = require('../services/inventoryService');

const getClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { clientId: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/returns
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = getClientFilter(req);
    if (req.query.clientId && (req.user.role === 'admin' || req.user.role === 'staff')) {
      filter.clientId = req.query.clientId;
    }
    if (req.query.status) filter.status = req.query.status;

    const returns = await Return.find(filter)
      .populate('orderRef', 'customerName totalPrice createdAt')
      .populate('clientId', 'brandName')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/returns/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const ret = await Return.findOne(filter)
      .populate('orderRef')
      .populate('clientId', 'brandName owner')
      .populate('processedBy', 'name email')
      .populate('items.product', 'name sku variants')
      .lean();
    if (!ret) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }
    res.json({ success: true, data: ret });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/returns
 */
exports.create = async (req, res, next) => {
  try {
    const { orderRef, items } = req.body;
    const order = await Order.findById(orderRef).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const clientFilter = getClientFilter(req);
    if (clientFilter.clientId && order.clientId.toString() !== clientFilter.clientId.toString()) {
      return res.status(403).json({ success: false, message: 'Order does not belong to your client' });
    }

    const ret = await Return.create({
      orderRef,
      clientId: order.clientId,
      items,
    });
    const created = await Return.findById(ret._id)
      .populate('orderRef', 'customerName totalPrice')
      .populate('clientId', 'brandName')
      .lean();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/returns/:id/approve
 */
exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const ret = await Return.findOne(filter);
    if (!ret) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }
    if (ret.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Return already processed' });
    }

    await increaseStockOnReturn(
      ret.items,
      req.user._id,
      ret._id,
      ret.clientId
    );

    ret.status = 'approved';
    ret.processedBy = req.user._id;
    ret.processedAt = new Date();
    await ret.save();

    const updated = await Return.findById(ret._id)
      .populate('orderRef', 'customerName totalPrice')
      .populate('clientId', 'brandName')
      .populate('processedBy', 'name email')
      .lean();
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/returns/:id/reject
 */
exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const ret = await Return.findOneAndUpdate(
      filter,
      {
        status: 'rejected',
        processedBy: req.user._id,
        processedAt: new Date(),
      },
      { new: true }
    )
      .populate('orderRef', 'customerName totalPrice')
      .populate('clientId', 'brandName')
      .populate('processedBy', 'name email')
      .lean();
    if (!ret) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }
    res.json({ success: true, data: ret });
  } catch (error) {
    next(error);
  }
};
