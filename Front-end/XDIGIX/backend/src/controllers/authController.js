const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * @route   POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }
    const token = signToken(user._id);
    const userObj = user.toJSON();
    res.status(200).json({
      success: true,
      token,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register
 * @access  Admin only (enforce in route)
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, clientId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }
    const userData = { name, email, password, role: role || 'staff', phone };
    if (role === 'client' && clientId) userData.clientId = clientId;

    const user = await User.create(userData);
    const token = signToken(user._id);
    const userObj = user.toJSON();
    res.status(201).json({
      success: true,
      token,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 */
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('clientId', 'brandName owner systemAccess subscriptionPlan features')
      .lean();
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const baseUrl = process.env.FRONTEND_URL || process.env.RESET_LINK_BASE || 'http://localhost:5174';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    // TODO: Send email with resetUrl (configure nodemailer/SendGrid)
    // For now, return the link so the frontend can show it (dev/testing)
    res.status(200).json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/ensure-workspace
 * Creates a default client/workspace if none exist and links the current user.
 */
exports.ensureWorkspace = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.clientId) {
      const populated = await User.findById(userId).populate('clientId', 'brandName owner').lean();
      return res.json({ success: true, user: populated });
    }

    let client = await Client.findOne();
    if (!client) {
      client = await Client.create({
        brandName: process.env.DEFAULT_WORKSPACE_NAME || 'Default Business',
        owner: { name: 'Owner', email: user.email || 'owner@xdigix.local' },
        subscriptionPlan: 'standard',
        active: true,
      });
    }

    user.clientId = client._id;
    user.role = 'admin';
    await user.save({ validateBeforeSave: false });

    const updated = await User.findById(userId).populate('clientId', 'brandName owner').lean();
    res.json({ success: true, user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in.',
    });
  } catch (error) {
    next(error);
  }
};
