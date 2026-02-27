import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDb(): Promise<void> {
  const uri = (config.mongo.uri || '').trim();
  if (!uri) {
    throw new Error(
      'MONGODB_URI is required. Set it in .env (e.g. mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority) or in your deployment environment.'
    );
  }
  if (uri.startsWith('mongodb://localhost') || uri.startsWith('mongodb://127.0.0.1')) {
    throw new Error(
      'Local MongoDB is disabled. Set MONGODB_URI to a remote instance (e.g. MongoDB Atlas).'
    );
  }
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    throw err;
  }
}
