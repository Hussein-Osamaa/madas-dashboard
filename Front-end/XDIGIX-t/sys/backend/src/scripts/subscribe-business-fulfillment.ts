/**
 * Mark a business as subscribed to fulfillment (XDF) so the client dashboard shows XDF inventory.
 * Run from backend directory:
 *   BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npm run subscribe-fulfillment
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { Business } from '../schemas/business.schema';

const BUSINESS_ID = (process.env.BUSINESS_ID || process.env.BUSINESSID) as string | undefined;

async function run() {
  if (!BUSINESS_ID?.trim()) {
    console.error('Missing BUSINESS_ID. Example: BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npm run subscribe-fulfillment');
    process.exit(1);
  }

  await mongoose.connect(config.mongo.uri);

  const business = await Business.findOne({ businessId: BUSINESS_ID.trim() });
  if (!business) {
    console.error('Business not found:', BUSINESS_ID.trim());
    await mongoose.disconnect();
    process.exit(1);
  }

  const features = (business.features as Record<string, unknown>) || {};
  await Business.updateOne(
    { businessId: BUSINESS_ID.trim() },
    { $set: { features: { ...features, fulfillment: true } } }
  );

  console.log('Done. Business', BUSINESS_ID.trim(), 'is now subscribed to fulfillment (XDF).');
  console.log('The client can refresh the dashboard to see XDF in the Inventory dropdown.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
