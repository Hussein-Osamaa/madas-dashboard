/**
 * Initialize a new MongoDB database for XDIGIX.
 * In NoSQL MongoDB, the database is created automatically on first write.
 * This script connects, creates collections, and ensures indexes exist.
 *
 * Run: node scripts/init-database.js
 * Or:  npm run init:db
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Load models so their schemas (and indexes) are registered
const Client = require('../src/models/Client');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');

async function initDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db';
  const dbName = process.env.MONGODB_DATABASE; // optional override

  try {
    const opts = dbName ? { dbName } : {};
    await mongoose.connect(uri, opts);
    const db = mongoose.connection.db;
    const name = db.databaseName;
    console.log(`MongoDB connected: ${name}\n`);

    // Ensure indexes exist from schema definitions
    await Client.syncIndexes();
    await User.syncIndexes();
    await Product.syncIndexes();
    await Order.syncIndexes();

    console.log('Collections & indexes ready.');
    console.log('Database:', name);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
