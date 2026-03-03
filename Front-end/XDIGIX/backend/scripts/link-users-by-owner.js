/**
 * Link users without clientId to the client whose owner.email matches the user's email.
 * Run: node scripts/link-users-by-owner.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Client = require('../src/models/Client');

async function linkUsersByOwner() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    const users = await User.find({ $or: [{ clientId: null }, { clientId: { $exists: false } }] }).lean();
    const clients = await Client.find().lean();

    if (users.length === 0) {
      console.log('All users already have a clientId.');
      process.exit(0);
      return;
    }

    let linked = 0;
    for (const u of users) {
      const email = (u.email || '').toLowerCase().trim();
      if (!email) continue;

      const client = clients.find((c) => (c.owner?.email || '').toLowerCase().trim() === email);
      if (!client) {
        console.log(`No client with owner ${email} - skipping user ${email}`);
        continue;
      }

      await User.findByIdAndUpdate(u._id, { $set: { clientId: client._id, role: 'admin' } });
      console.log(`Linked ${email} → ${client.brandName} (${client._id})`);
      linked++;
    }

    if (linked > 0) {
      console.log(`\nLinked ${linked} user(s). Sign out and sign in again to access the dashboard.`);
    }
    if (users.length > linked) {
      console.log(`\nRun npm run seed:workspace to link remaining users to default workspace.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

linkUsersByOwner();
