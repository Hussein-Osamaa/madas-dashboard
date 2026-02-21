/**
 * Seed a test user for development.
 * Run: npx ts-node src/scripts/seed-user.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User } from '../schemas/user.schema';
import { Tenant } from '../schemas/tenant.schema';
import { Business } from '../schemas/business.schema';

async function seed() {
  await mongoose.connect(config.mongo.uri);

  const email = process.env.SEED_EMAIL || 'admin@test.com';
  const password = process.env.SEED_PASSWORD || 'Test123!';
  const tenantId = uuidv4().replace(/-/g, '').slice(0, 20);
  const businessId = uuidv4().replace(/-/g, '').slice(0, 20);
  const uid = uuidv4().replace(/-/g, '').slice(0, 20);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await Tenant.create({
    tenantId,
    name: 'Test Tenant',
    plan: 'all-in-one',
    features: [],
    status: 'active'
  });

  await Business.create({
    businessId,
    tenantId,
    name: 'Test Business',
    owner: { userId: uid, email }
  });

  await User.create({
    uid,
    email,
    passwordHash,
    displayName: 'Test Admin',
    type: 'client_owner',
    businessId,
    tenantId,
    emailVerified: true
  });

  console.log('Seed complete. Login with:');
  console.log('  Email:', email);
  console.log('  Password:', password);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
