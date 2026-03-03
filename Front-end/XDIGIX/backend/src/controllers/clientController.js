const Client = require('../models/Client');
const User = require('../models/User');
const mongoose = require('mongoose');

const applyClientFilter = (req) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    return { _id: req.allowedClientId };
  }
  return {};
};

/**
 * @route   GET /api/clients
 */
exports.getAll = async (req, res, next) => {
  try {
    const filter = applyClientFilter(req);
    const clients = await Client.find(filter).sort({ brandName: 1 }).lean();
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/clients/:id
 * Accepts MongoDB _id or firebaseId (for support URLs from admin).
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let client = null;
    if (id.length === 24 && /^[a-f0-9]{24}$/i.test(id)) {
      const filter = { _id: id, ...applyClientFilter(req) };
      client = await Client.findOne(filter).lean();
    }
    if (!client) {
      client = await Client.findOne({ firebaseId: id }).lean();
    }
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/clients
 * @access  Admin / Staff
 */
exports.create = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/clients/with-owner
 * @access  Admin only
 * Creates a client and owner user atomically (used by digix-admin)
 */
exports.createWithOwner = async (req, res, next) => {
  try {
    const { brandName, owner, password, systemAccess, features, subscriptionPlan } = req.body;
    if (!brandName || !owner?.email) {
      return res.status(400).json({
        success: false,
        message: 'brandName and owner.email are required',
      });
    }

    const existingUser = await User.findOne({ email: owner.email.toLowerCase() });

    // If no existing user, password is required to create the owner account
    if (!existingUser && (!password || password.length < 6)) {
      return res.status(400).json({
        success: false,
        message: 'Password (min 6 characters) is required for new owner accounts',
      });
    }

    const client = await Client.create({
      brandName: brandName.trim(),
      owner: {
        name: (owner.name || owner.email.split('@')[0]).trim(),
        email: owner.email.toLowerCase().trim(),
        phone: owner.phone || undefined,
      },
      contact: { email: owner.email.toLowerCase().trim() },
      subscriptionPlan: subscriptionPlan || 'standard',
      active: true,
      systemAccess: {
        dashboard: systemAccess?.dashboard !== false,
        finance: systemAccess?.finance !== false,
        fulfillment: systemAccess?.fulfillment !== false,
        shipping: systemAccess?.shipping === true,
      },
      features: features || {},
    });

    let user;

    if (existingUser) {
      // Link existing user (e.g. super admin) as owner of this client; do not change password
      existingUser.clientId = client._id;
      if (owner.name && owner.name.trim()) existingUser.name = owner.name.trim();
      await existingUser.save({ validateBeforeSave: false });
      user = existingUser;
    } else {
      user = await User.create({
        name: (owner.name || owner.email.split('@')[0]).trim(),
        email: owner.email.toLowerCase().trim(),
        password,
        role: 'admin',
        active: true,
        clientId: client._id,
      });
    }

    const clientObj = client.toObject ? client.toObject() : client;
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    res.status(201).json({
      success: true,
      data: clientObj,
      user: { _id: userObj._id, email: userObj.email, name: userObj.name, role: userObj.role, clientId: userObj.clientId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/clients/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...applyClientFilter(req) };
    const client = await Client.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/clients/:id
 * @access  Admin
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id, ...applyClientFilter(req) };
    const client = await Client.findOneAndDelete(filter);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    next(error);
  }
};
