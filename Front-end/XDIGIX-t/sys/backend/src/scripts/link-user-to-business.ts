/**
 * Link a user (by uid) to a business so the backend can resolve tenant → fixes 403 "No tenant associated".
 * Run from backend directory:
 *   UID=8834ffc011394d609919 BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npx ts-node src/scripts/link-user-to-business.ts
 * Or with email to find user:
 *   EMAIL=user@example.com BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npx ts-node src/scripts/link-user-to-business.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../schemas/user.schema';
import { Business } from '../schemas/business.schema';

// Use USER_UID to avoid zsh's read-only UID variable (bash users can use UID or USER_UID)
const USER_UID = (process.env.USER_UID || process.env.UID) as string | undefined;
const EMAIL = process.env.EMAIL as string | undefined;
const BUSINESS_ID = (process.env.BUSINESS_ID || process.env.BUSINESSID) as string | undefined;

async function run() {
  if (!BUSINESS_ID?.trim()) {
    console.error('Missing BUSINESS_ID. Example: USER_UID=8834ffc011394d609919 BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npm run link-user');
    process.exit(1);
  }
  if (!USER_UID?.trim() && !EMAIL?.trim()) {
    console.error('Provide either USER_UID (or UID on bash) or EMAIL. Example: USER_UID=8834ffc011394d609919 or EMAIL=user@example.com');
    process.exit(1);
  }

  await mongoose.connect(config.mongo.uri);

  let user = null as InstanceType<typeof User> | null;
  if (USER_UID?.trim()) {
    user = await User.findOne({ uid: USER_UID.trim() });
    if (!user) console.warn('No user found with uid:', USER_UID);
  }
  if (!user && EMAIL?.trim()) {
    user = await User.findOne({ email: EMAIL.trim().toLowerCase() });
    if (!user) console.warn('No user found with email:', EMAIL);
  }

  if (!user) {
    console.error('No User record found in MongoDB. Create one first (e.g. sign up via API or run seed script with same uid/email).');
    await mongoose.disconnect();
    process.exit(1);
  }

  let business = await Business.findOne({ businessId: BUSINESS_ID.trim() });
  if (!business) {
    await Business.create({
      businessId: BUSINESS_ID.trim(),
      tenantId: BUSINESS_ID.trim(),
      name: `Business ${BUSINESS_ID.trim()}`,
    });
    business = await Business.findOne({ businessId: BUSINESS_ID.trim() });
    console.log('Created Business:', BUSINESS_ID.trim(), 'with tenantId:', BUSINESS_ID.trim());
  } else {
    console.log('Business already exists:', business.businessId, 'tenantId:', business.tenantId);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { businessId: BUSINESS_ID.trim(), tenantId: business!.tenantId } }
  );
  console.log('Updated User', user.uid, user.email, '→ businessId:', BUSINESS_ID.trim(), ', tenantId:', business!.tenantId);
  console.log('Done. User should no longer get 403 "No tenant associated". Have them log in again and reload the app.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
