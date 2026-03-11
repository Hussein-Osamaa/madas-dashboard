/**
 * Add a user as super_admin for XDIGIX Admin (digix-admin).
 * Run from backend directory:
 *   SEED_EMAIL=admin@yourcompany.com SEED_PASSWORD=YourPassword npm run seed:super-admin
 * Or with defaults (hesainosama@gmail.com / Test123!):
 *   npm run seed:super-admin
 * Also add SEED_EMAIL to SUPER_ADMIN_EMAILS in digix-admin/src/contexts/RBACContext.tsx so the UI grants super_admin.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User } from '../schemas/user.schema';

const SUPER_ADMIN_EMAIL = (process.env.SEED_EMAIL || 'hesainosama@gmail.com').trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Test123!';

async function seedSuperAdmin() {
  if (!SUPER_ADMIN_EMAIL) {
    console.error('SEED_EMAIL is required. Example: SEED_EMAIL=admin@xdigix.com npm run seed:super-admin');
    process.exit(1);
  }

  if (!config.mongo.uri) {
    console.error('MONGODB_URI is not set. Add it to .env in the backend directory (e.g. from MongoDB Atlas Connection String).');
    process.exit(1);
  }

  try {
    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000
    });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : '';
    const msg = err instanceof Error ? err.message : String(err);
    const reason = (err as { reason?: { type?: string } })?.reason?.type;
    const isConnectionError =
      name === 'MongooseServerSelectionError' ||
      name === 'MongoNetworkTimeoutError' ||
      msg.includes('Server selection timed out') ||
      msg.includes('timed out after');
    if (isConnectionError) {
      console.error('Could not connect to MongoDB.\n');
      if (reason === 'ReplicaSetNoPrimary') {
        console.error('ReplicaSetNoPrimary usually means your Atlas cluster is PAUSED (free tier pauses after inactivity).');
        console.error('  → Go to https://cloud.mongodb.com → Database → your cluster → click "Resume" and wait 1–2 minutes.');
      }
      if (msg.includes('secureConnect') && msg.includes('timed out')) {
        console.error('TLS connection timed out: your network may be blocking outbound port 27017 to *.mongodb.net.');
        console.error('  → Try another network (e.g. mobile hotspot) or run this script where your backend already runs (e.g. Railway one-off run with same MONGODB_URI).');
      }
      console.error('Also check:');
      console.error('  1. Network Access: your IP (or 0.0.0.0/0) is allowed in Atlas → Network Access.');
      console.error('  2. Cluster is running (Resume if paused).');
      console.error('  3. MONGODB_URI in .env is correct (password URL-encoded if it has special chars).');
      console.error('\nThen run the seed again.');
    }
    throw err;
  }

  const existingUser = await User.findOne({ email: SUPER_ADMIN_EMAIL });
  const uid = existingUser?.uid ?? uuidv4().replace(/-/g, '').slice(0, 20);

  if (existingUser) {
    const passwordHash = DEFAULT_PASSWORD ? await bcrypt.hash(DEFAULT_PASSWORD, 10) : existingUser.passwordHash;
    await User.updateOne(
      { email: SUPER_ADMIN_EMAIL },
      {
        type: 'super_admin',
        ...(passwordHash && { passwordHash }),
        displayName: existingUser.displayName || 'Super Admin',
        emailVerified: true
      }
    );
    console.log('Updated existing user to super_admin:', SUPER_ADMIN_EMAIL);
  } else {
    if (!DEFAULT_PASSWORD) {
      console.error('SEED_PASSWORD is required when creating a new user. Example: SEED_PASSWORD=YourPassword npm run seed:super-admin');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await User.create({
      uid,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      displayName: 'Super Admin',
      type: 'super_admin',
      emailVerified: true
    });
    console.log('Created super_admin user:', SUPER_ADMIN_EMAIL);
  }

  console.log('\nSuper Admin:');
  console.log('  Email:', SUPER_ADMIN_EMAIL);
  if (DEFAULT_PASSWORD) console.log('  Password:', DEFAULT_PASSWORD);
  console.log('\nAdd this email to SUPER_ADMIN_EMAILS in digix-admin/src/contexts/RBACContext.tsx, then log in again.');
  await mongoose.disconnect();
}

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
