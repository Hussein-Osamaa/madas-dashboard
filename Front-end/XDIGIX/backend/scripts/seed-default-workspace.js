/**
 * Create a default workspace (client) and link all users who have no clientId.
 * Run this after migration so users can access the dashboard normally.
 *
 * Run: node scripts/seed-default-workspace.js
 * Or:  npm run seed:workspace
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Client = require('../src/models/Client');

const DEFAULT_BRAND_NAME = process.env.DEFAULT_WORKSPACE_NAME || 'Default Business';

async function seedDefaultWorkspace() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected');

    let client;
    const existingClients = await Client.find().limit(1).lean();

    if (existingClients.length === 0) {
      client = await Client.create({
        brandName: DEFAULT_BRAND_NAME,
        owner: { name: 'Owner', email: 'owner@xdigix.local' },
        subscriptionPlan: 'standard',
        active: true,
      });
      console.log('Created default client:', client.brandName, '(' + client._id + ')');
    } else {
      client = existingClients[0];
      console.log('Using existing client:', client.brandName, '(' + client._id + ')');
    }

    const result = await User.updateMany(
      { $or: [{ clientId: null }, { clientId: { $exists: false } }] },
      { $set: { clientId: client._id, role: 'admin' } }
    );

    if (result.modifiedCount > 0) {
      console.log('Linked', result.modifiedCount, 'user(s) to workspace with full access (admin role)');
    } else {
      console.log('All users already linked to a workspace');
    }

    console.log('Done. Users can now sign in and access the dashboard.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedDefaultWorkspace();
