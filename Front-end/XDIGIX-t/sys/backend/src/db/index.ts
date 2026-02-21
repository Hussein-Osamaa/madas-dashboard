import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDb(): Promise<void> {
  try {
    await mongoose.connect(config.mongo.uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    throw err;
  }
}
