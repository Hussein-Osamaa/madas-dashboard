/**
 * Link hesainyt@gmail.com to the madas client/workspace.
 * Run: node scripts/link-user-to-madas.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Client = require('../src/models/Client');

const EMAIL = 'hesainyt@gmail.com';
const CLIENT_NAME_PATTERN = /madas/i;

async function linkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected');

    const user = await User.findOne({ email: EMAIL.toLowerCase() });
    if (!user) {
      console.log('User not found:', EMAIL);
      console.log('Create the user first via the signup API.');
      process.exit(1);
    }

    const client = await Client.findOne({ brandName: CLIENT_NAME_PATTERN });
    if (!client) {
      console.log('No client found matching "madas".');
      console.log('Creating default "Madas" client...');
      const newClient = await Client.create({
        brandName: 'Madas',
        owner: { name: 'Owner', email: EMAIL },
        subscriptionPlan: 'standard',
        active: true,
      });
      user.clientId = newClient._id;
      user.role = 'admin';
      await user.save({ validateBeforeSave: false });
      console.log('Created Madas client and linked', EMAIL, 'as admin');
    } else {
      user.clientId = client._id;
      user.role = 'admin';
      await user.save({ validateBeforeSave: false });
      console.log('Linked', EMAIL, 'to client:', client.brandName, '(' + client._id + ')');
    }

    console.log('Done. Sign out and sign in again to access the dashboard.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

linkUser();
