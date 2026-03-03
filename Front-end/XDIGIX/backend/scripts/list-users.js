/**
 * List all users with email, role, clientId.
 * Run: node scripts/list-users.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    const users = await User.find().select('email role clientId').lean();
    console.log(`Found ${users.length} user(s):\n`);
    console.log('email                        | role    | clientId');
    console.log('-'.repeat(80));

    for (const u of users) {
      const email = (u.email || '–').padEnd(28).slice(0, 28);
      const role = (u.role || '–').padEnd(8).slice(0, 8);
      const cid = u.clientId ? String(u.clientId) : '(none)';
      console.log(`${email} | ${role} | ${cid}`);
    }

    const noClient = users.filter((u) => !u.clientId);
    if (noClient.length > 0) {
      console.log(`\n⚠️  ${noClient.length} user(s) have no clientId - run: npm run seed:workspace`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

listUsers();
