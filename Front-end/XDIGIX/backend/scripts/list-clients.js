/**
 * List all MongoDB clients with their _id, brandName, owner email.
 * Use these MongoDB _id values in "Join as Support" / dashboard URLs.
 *
 * Run: node scripts/list-clients.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../src/models/Client');

async function listClients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    const clients = await Client.find().sort({ brandName: 1 }).lean();
    console.log(`Found ${clients.length} client(s):\n`);
    console.log('MongoDB _id (use this)     | brandName           | owner.email');
    console.log('-'.repeat(80));

    for (const c of clients) {
      const id = String(c._id);
      const name = (c.brandName || '–').padEnd(20).slice(0, 20);
      const email = (c.owner?.email || '–').padEnd(30).slice(0, 30);
      console.log(`${id.padEnd(26)} | ${name} | ${email}`);
    }

    console.log('\nUse the MongoDB _id in URLs: /?business=<_id>&support=true');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

listClients();
