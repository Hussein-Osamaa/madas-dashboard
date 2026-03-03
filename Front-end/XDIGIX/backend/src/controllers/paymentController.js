const Payment = require('../models/Payment');
const Order = require('../models/Order');

const getClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { clientId: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/payments
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = getClientFilter(req);
    if (req.query.clientId && (req.user.role === 'admin' || req.user.role === 'staff')) {
      filter.clientId = req.query.clientId;
    }
    if (req.query.orderId) filter.order = req.query.orderId;

    const payments = await Payment.find(filter)
      .populate('order', 'customerName totalPrice paymentStatus')
      .populate('clientId', 'brandName')
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/payments/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const payment = await Payment.findOne(filter)
      .populate('order')
      .populate('clientId', 'brandName owner')
      .lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/payments
 */
exports.create = async (req, res, next) => {
  try {
    const { order, amount, paymentMethod, date, reference, notes } = req.body;
    const ord = await Order.findById(order).lean();
    if (!ord) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const clientFilter = getClientFilter(req);
    if (clientFilter.clientId && ord.clientId.toString() !== clientFilter.clientId.toString()) {
      return res.status(403).json({ success: false, message: 'Order does not belong to your client' });
    }

    const payment = await Payment.create({
      order,
      clientId: ord.clientId,
      amount,
      paymentMethod,
      date: date ? new Date(date) : new Date(),
      reference,
      notes,
    });

    // Optionally update order payment status
    const totalPaid = await Payment.aggregate([
      { $match: { order: ord._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paid = totalPaid[0]?.total || 0;
    let paymentStatus = 'partial';
    if (paid >= ord.totalPrice) paymentStatus = 'paid';
    else if (paid > 0) paymentStatus = 'partial';
    await Order.findByIdAndUpdate(order, { paymentStatus });

    const created = await Payment.findById(payment._id)
      .populate('order', 'customerName totalPrice paymentStatus')
      .populate('clientId', 'brandName')
      .lean();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/payments/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const payment = await Payment.findOneAndDelete(filter);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, message: 'Payment deleted' });
  } catch (error) {
    next(error);
  }
};
