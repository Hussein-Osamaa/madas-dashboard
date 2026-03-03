const User = require('../models/User');

/**
 * @route   POST /api/users
 * @access  Admin only - create staff/admin without logging in as them
 */
exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password (min 6 characters) are required',
      });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' || role === 'staff' ? role : 'staff',
      phone: phone || undefined,
      permissions: Array.isArray(permissions) ? permissions : [],
    };
    const user = await User.create(userData);
    const userObj = user.toJSON();
    delete userObj.password;
    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users
 * @access  Admin only
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.clientId) filter.clientId = req.query.clientId;

    const users = await User.find(filter)
      .select('-password')
      .populate('clientId', 'brandName')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @access  Admin only
 */
exports.getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('clientId', 'brandName owner')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/users/:id
 * @access  Admin only
 */
exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'role', 'active', 'clientId', 'permissions'];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .populate('clientId', 'brandName')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
