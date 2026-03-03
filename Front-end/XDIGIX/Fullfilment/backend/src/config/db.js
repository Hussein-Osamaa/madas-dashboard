import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fulfilment';
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.name === 'MongooseServerSelectionError') {
      console.error('\n  MongoDB connection refused. Either:\n');
      console.error('  1. Use MongoDB Atlas (free): https://www.mongodb.com/atlas — then set MONGODB_URI in .env\n');
      console.error('  2. Or install locally: brew tap mongodb/brew && brew install mongodb-community');
      console.error('     Then: brew services start mongodb-community\n');
    }
    throw err;
  }
}

export function disconnectDB() {
  return mongoose.disconnect();
}
