/**
 * Add hesainosama@gmail.com as super_admin for XDIGIX Admin
 * Run: SEED_EMAIL=hesainosama@gmail.com SEED_PASSWORD=YOUR_PASSWORD npx ts-node src/scripts/seed-super-admin.ts
 * Or with default password: npx ts-node src/scripts/seed-super-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User } from '../schemas/user.schema';

const SUPER_ADMIN_EMAIL = 'hesainosama@gmail.com';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Test123!';

async function seedSuperAdmin() {
  await mongoose.connect(config.mongo.uri);

  const existingUser = await User.findOne({ email: SUPER_ADMIN_EMAIL });
  const uid = existingUser?.uid ?? uuidv4().replace(/-/g, '').slice(0, 20);

  if (existingUser) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await User.updateOne(
      { email: SUPER_ADMIN_EMAIL },
      {
        type: 'super_admin',
        passwordHash,
        displayName: existingUser.displayName || 'Super Admin',
        emailVerified: true
      }
    );
    console.log('Updated existing user to super_admin:', SUPER_ADMIN_EMAIL);
  } else {
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

  console.log('\nSuper Admin credentials:');
  console.log('  Email:', SUPER_ADMIN_EMAIL);
  console.log('  Password:', DEFAULT_PASSWORD);
  console.log('\nUse these credentials to log in to XDIGIX Admin.');
  await mongoose.disconnect();
}

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
