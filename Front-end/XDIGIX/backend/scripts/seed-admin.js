/**
 * Seed script to create initial admin user
 * Run: node scripts/seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Client = require('../src/models/Client');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected');

    const email = process.env.ADMIN_EMAIL || 'admin@xdigix.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin',
      email,
      password,
      role: 'admin',
      active: true,
    });
    console.log('Admin user created:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
