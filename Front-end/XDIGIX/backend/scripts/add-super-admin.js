/**
 * Add or update hesainosama@gmail.com as super admin (full control).
 * Super admin: role=admin, clientId=null
 *
 * Run: node scripts/add-super-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const EMAIL = 'hesainosama@gmail.com';
const NAME = 'Hussein Osama';
const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

async function addSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    const user = await User.findOne({ email: EMAIL.toLowerCase() });

    if (user) {
      user.name = NAME;
      user.role = 'admin';
      user.clientId = null;
      user.active = true;
      await user.save({ validateBeforeSave: false });
      console.log(`✅ Updated ${EMAIL} as super admin (name: ${NAME})`);
    } else {
      await User.create({
        name: NAME,
        email: EMAIL.toLowerCase(),
        password: DEFAULT_PASSWORD,
        role: 'admin',
        active: true,
        clientId: null,
      });
      console.log(`✅ Created ${EMAIL} as super admin`);
    }

    console.log(`   Role: admin, clientId: null (full control)`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log(`   Change password after first login.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

addSuperAdmin();
