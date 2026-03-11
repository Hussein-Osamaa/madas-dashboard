/**
 * Seed AdminUser for digix-admin login (POST /auth/admin/login).
 * Run from backend directory:
 *   SEED_EMAIL=admin@xdigix.com SEED_PASSWORD=YourPassword npm run seed:admin
 * Then use that email/password to sign in at the digix-admin app.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { AdminUser } from '../schemas/admin-user.schema';

const SEED_EMAIL = (process.env.SEED_EMAIL || 'hesainosama@gmail.com').trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Test123!';

async function seedAdmin() {
  if (!config.mongo.uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 60000, connectTimeoutMS: 60000 });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : '';
    const msg = err instanceof Error ? err.message : String(err);
    if (name === 'MongooseServerSelectionError' || name === 'MongoNetworkTimeoutError' || msg.includes('timed out')) {
      console.error('Could not connect to MongoDB. Check Network Access, cluster is resumed, and MONGODB_URI in .env.');
    }
    throw err;
  }

  const existing = await AdminUser.findOne({ email: SEED_EMAIL });
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  if (existing) {
    await AdminUser.updateOne(
      { email: SEED_EMAIL },
      { passwordHash, active: true }
    );
    console.log('Updated admin:', SEED_EMAIL);
  } else {
    await AdminUser.create({
      fullName: 'Super Admin',
      email: SEED_EMAIL,
      passwordHash,
      role: 'super_admin',
      active: true,
    });
    console.log('Created admin:', SEED_EMAIL);
  }

  console.log('\nAdmin credentials (Staff Management):');
  console.log('  Email:', SEED_EMAIL);
  console.log('  Password:', DEFAULT_PASSWORD);
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
