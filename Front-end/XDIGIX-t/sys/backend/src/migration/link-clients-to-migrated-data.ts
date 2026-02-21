/**
 * Link New Client Accounts to Migrated Firebase Data
 *
 * Use this after:
 * 1. You created new client accounts via create-client (Digix Admin) for each old Firebase client.
 * 2. You ran the Firebase → MongoDB migration (DRY_RUN=false) so products, orders, etc. are in MongoDB.
 *
 * This script links each new client User (by matching owner email) to the migrated Business,
 * so when they log in they see their products, orders, and all data.
 *
 * Dry run by default. Set DRY_RUN=false to execute.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { User, Business, Tenant, FirestoreDoc } from '../schemas';

const DRY_RUN = process.env.DRY_RUN !== 'false';

function normalizeEmail(email: string): string {
  return (email || '').toLowerCase().trim();
}

async function run() {
  console.log('[LinkClients] Starting... DRY_RUN=', DRY_RUN);
  await mongoose.connect(config.mongo.uri);

  const linked: Array<{ email: string; oldBid: string; newBid: string }> = [];
  const skipped: Array<{ email: string; reason: string }> = [];
  const errors: Array<{ email: string; err: string }> = [];

  try {
    // Users created via create-client: client_owner with passwordHash
    const newClientUsers = await User.find({
      type: 'client_owner',
      passwordHash: { $exists: true, $nin: [null, ''] }
    }).lean();

    console.log('[LinkClients] Found', newClientUsers.length, 'new client owner(s) with password');

    for (const user of newClientUsers) {
      const email = normalizeEmail(user.email);
      if (!email) {
        skipped.push({ email: user.email || user.uid, reason: 'no email' });
        continue;
      }

      // Find migrated business with matching owner email (from Firebase)
      const candidates = await Business.find({
        $or: [
          { 'owner.email': email },
          { 'owner.email': user.email }
        ]
      }).lean();

      if (candidates.length === 0) {
        skipped.push({ email, reason: 'no migrated business with this owner email' });
        continue;
      }

      // Prefer the business that has data (products/orders) = the migrated one
      let migratedBusiness = candidates[0];
      if (candidates.length > 1) {
        for (const c of candidates) {
          const hasData = await FirestoreDoc.exists({ businessId: c.businessId, coll: { $in: ['products', 'orders'] } });
          if (hasData) {
            migratedBusiness = c;
            break;
          }
        }
      }

      const oldBusinessId = user.businessId;
      const oldTenantId = user.tenantId;
      const newBusinessId = migratedBusiness.businessId;
      const newTenantId = migratedBusiness.tenantId;

      if (oldBusinessId === newBusinessId) {
        skipped.push({ email, reason: 'already linked to this business' });
        continue;
      }

      if (DRY_RUN) {
        linked.push({ email, oldBid: oldBusinessId || '', newBid: newBusinessId });
        continue;
      }

      try {
        // 1. Point user to migrated business
        await User.updateOne(
          { uid: user.uid },
          { $set: { businessId: newBusinessId, tenantId: newTenantId } }
        );

        // 2. Delete FirestoreDocs for the empty business (staff, etc.)
        const deletedDocs = await FirestoreDoc.deleteMany({
          businessId: oldBusinessId
        });

        // 3. Delete the empty Business created by create-client
        await Business.deleteOne({ businessId: oldBusinessId });

        // 4. Delete the empty Tenant only if no other business uses it
        const otherBusinessWithTenant = await Business.findOne({ tenantId: oldTenantId }).lean();
        if (!otherBusinessWithTenant) {
          await Tenant.deleteOne({ tenantId: oldTenantId });
        }

        linked.push({ email, oldBid: oldBusinessId || '', newBid: newBusinessId });
        console.log('[LinkClients] Linked', email, '-> business', newBusinessId, '(removed empty business,', deletedDocs.deletedCount, 'sub-docs)');
      } catch (err) {
        errors.push({ email, err: (err as Error).message });
      }
    }

    console.log('[LinkClients] Linked:', linked.length);
    console.log('[LinkClients] Skipped:', skipped.length);
    if (errors.length) console.log('[LinkClients] Errors:', errors.length);
    if (linked.length) linked.forEach((l) => console.log('  -', l.email, '->', l.newBid));
    if (skipped.length) skipped.forEach((s) => console.log('  skip', s.email, s.reason));
    if (errors.length) errors.forEach((e) => console.error('  err', e.email, e.err));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[LinkClients] Fatal:', err);
  process.exit(1);
});
