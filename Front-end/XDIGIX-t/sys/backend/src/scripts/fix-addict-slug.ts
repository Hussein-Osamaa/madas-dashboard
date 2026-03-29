/**
 * One-time script: Delete the orphaned "addict" site (tenant 1c312dfdb2064b8a816b)
 * and update the real Addict site (69c6d6471f5c4f47d9718e5d) to use slug "addict".
 *
 * Run: npx ts-node src/scripts/fix-addict-slug.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';

// Import Site model
import '../schemas/site.schema';
const Site = mongoose.model('Site');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongo.uri);
  console.log('Connected.');

  // Step 1: Find the orphaned site with slug "addict"
  const orphan = await Site.findOne({ slug: 'addict' }).lean();
  if (orphan) {
    console.log(`Found orphaned site: _id=${(orphan as any)._id}, tenantId=${(orphan as any).tenantId}, slug=${(orphan as any).slug}`);
    // Delete it
    const deleteResult = await Site.deleteOne({ _id: (orphan as any)._id });
    console.log(`Deleted orphaned site: ${deleteResult.deletedCount} document(s) removed.`);
  } else {
    console.log('No orphaned site with slug "addict" found — may have already been deleted.');
  }

  // Step 2: Update the real Addict site to use slug "addict"
  const realSiteId = '69c6d6471f5c4f47d9718e5d';
  const realSite = await Site.findById(realSiteId).lean();
  if (realSite) {
    console.log(`Found real site: _id=${(realSite as any)._id}, current slug="${(realSite as any).slug}"`);
    const updateResult = await Site.updateOne(
      { _id: realSiteId },
      { $set: { slug: 'addict' } }
    );
    console.log(`Updated slug to "addict": ${updateResult.modifiedCount} document(s) modified.`);
  } else {
    console.log(`Real site ${realSiteId} not found!`);
  }

  // Verify
  const verify = await Site.findOne({ slug: 'addict' }).lean();
  if (verify) {
    console.log(`\nVerification: slug "addict" now points to _id=${(verify as any)._id}, tenantId=${(verify as any).tenantId}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
