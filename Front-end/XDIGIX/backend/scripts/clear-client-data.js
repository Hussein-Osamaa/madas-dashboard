/**
 * Delete all client-related data so you can add clients manually.
 * Keeps: super admin users (clientId = null), e.g. hesainosama@gmail.com
 * Deletes: clients, client users, products, orders, payments, returns, scan logs
 *
 * Run: node scripts/clear-client-data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../src/models/Client');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const Return = require('../src/models/Return');
const ScanLog = require('../src/models/ScanLog');

async function clearClientData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    // Delete in dependency order (child collections first)
    const scanLogResult = await ScanLog.deleteMany({});
    console.log(`  ScanLog: deleted ${scanLogResult.deletedCount}`);

    const returnResult = await Return.deleteMany({});
    console.log(`  Return: deleted ${returnResult.deletedCount}`);

    const paymentResult = await Payment.deleteMany({});
    console.log(`  Payment: deleted ${paymentResult.deletedCount}`);

    const orderResult = await Order.deleteMany({});
    console.log(`  Order: deleted ${orderResult.deletedCount}`);

    const productResult = await Product.deleteMany({});
    console.log(`  Product: deleted ${productResult.deletedCount}`);

    // Delete only users that are linked to a client (keep super admins: clientId null)
    const userResult = await User.deleteMany({ clientId: { $ne: null } });
    console.log(`  User (client-linked): deleted ${userResult.deletedCount}`);

    const clientResult = await Client.deleteMany({});
    console.log(`  Client: deleted ${clientResult.deletedCount}`);

    console.log('\n✅ Old client data cleared. Super admin users (e.g. hesainosama@gmail.com) kept.');
    console.log('   You can add clients manually from digix-admin.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

clearClientData();
