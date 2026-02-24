import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDb(): Promise<void> {
  const uri = config.mongo.uri;
  const fromEnv = !!process.env.MONGODB_URI;
  console.log('[DB] MONGODB_URI from env:', fromEnv ? 'yes' : 'no (using default localhost)');
  if (uri.startsWith('mongodb://localhost') || uri.startsWith('mongodb://127.0.0.1')) {
    console.error('[DB] MONGODB_URI is not set or still defaulting to localhost. In Railway: Variables → add key MONGODB_URI (exact name) with your Atlas connection string.');
  }
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    throw err;
  }
}
