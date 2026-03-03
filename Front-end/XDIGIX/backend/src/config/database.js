const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  const uri = config.MONGODB_URI;
  if (!uri) {
    console.error('MongoDB connection error: MONGODB_URI is not set. Create a .env file with MONGODB_URI (see .env.example).');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 6+ no longer needs these options by default
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = connectDB;
