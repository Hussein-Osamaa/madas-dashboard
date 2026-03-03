/**
 * Test MongoDB Atlas connection (uses same Mongoose connection as the API)
 * Run: node scripts/test-connection.js
 * Ensure .env has MONGODB_URI set with your real password.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db';

async function run() {
  try {
    await mongoose.connect(uri);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB Atlas!');
    console.log('Database:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
