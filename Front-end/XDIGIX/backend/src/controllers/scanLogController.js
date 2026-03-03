const ScanLog = require('../models/ScanLog');

const getClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { clientId: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/scan-logs
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = getClientFilter(req);
    if (req.query.clientId && (req.user.role === 'admin' || req.user.role === 'staff')) {
      filter.clientId = req.query.clientId;
    }
    if (req.query.action) filter.action = req.query.action;
    if (req.query.productId) filter.product = req.query.productId;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;

    const [logs, total] = await Promise.all([
      ScanLog.find(filter)
        .populate('product', 'name sku barcode')
        .populate('user', 'name email')
        .populate('orderRef', '_id totalPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScanLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, total });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/scan-logs/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...getClientFilter(req) };
    const log = await ScanLog.findOne(filter)
      .populate('product', 'name sku barcode variants')
      .populate('user', 'name email')
      .populate('orderRef')
      .populate('returnRef')
      .lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Scan log not found' });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
