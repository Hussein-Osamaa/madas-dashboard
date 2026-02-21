/**
 * Seed AdminUser for Staff Management (MongoDB auth - no Firebase)
 * Run: SEED_EMAIL=hesainosama@gmail.com SEED_PASSWORD=YOUR_PASSWORD npx ts-node src/scripts/seed-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { AdminUser } from '../schemas/admin-user.schema';

const SEED_EMAIL = process.env.SEED_EMAIL || 'hesainosama@gmail.com';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Test123!';

async function seedAdmin() {
  await mongoose.connect(config.mongo.uri);

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
