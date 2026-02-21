/**
 * Migration Validation
 * Compares Firebase and MongoDB document counts.
 * Run after migration: npm run migrate:validate
 * Exits with code 1 if any mismatch.
 */
import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import mongoose from 'mongoose';
import { config } from '../config';
import { FirestoreDoc, Business, User, Tenant, Domain } from '../schemas';

async function initFirebase(): Promise<admin.firestore.Firestore> {
  if (!admin.apps.length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS required for validation. Set in .env');
    }
    admin.initializeApp({ credential: admin.credential.cert(require(credPath)) });
  }
  return admin.firestore();
}

async function countFirebase(firestore: admin.firestore.Firestore) {
  const tenantsSnap = await firestore.collection('tenants').get();
  const businessesSnap = await firestore.collection('businesses').get();
  const usersSnap = await firestore.collection('users').get();
  const domainsSnap = await firestore.collection('customDomains').get();

  let products = 0;
  let orders = 0;
  let deposits = 0;
  for (const doc of businessesSnap.docs) {
    const productsSnap = await firestore.collection('businesses').doc(doc.id).collection('products').get();
    const ordersSnap = await firestore.collection('businesses').doc(doc.id).collection('orders').get();
    const depositsSnap = await firestore.collection('businesses').doc(doc.id).collection('deposits').get();
    products += productsSnap.size;
    orders += ordersSnap.size;
    deposits += depositsSnap.size;
  }

  return {
    tenants: tenantsSnap.size,
    businesses: businessesSnap.size,
    products,
    orders,
    users: usersSnap.size,
    domains: domainsSnap.size,
    deposits,
  };
}

async function countMongoDB() {
  const [tenants, businesses, products, orders, users, domains, deposits] = await Promise.all([
    Tenant.countDocuments(),
    Business.countDocuments(),
    FirestoreDoc.countDocuments({ coll: 'products' }),
    FirestoreDoc.countDocuments({ coll: 'orders' }),
    User.countDocuments(),
    Domain.countDocuments(),
    FirestoreDoc.countDocuments({ coll: 'deposits' }),
  ]);

  return {
    tenants,
    businesses,
    products,
    orders,
    users,
    domains,
    deposits,
  };
}

async function validate() {
  const skipFirebase = process.env.SKIP_FIREBASE === '1';
  console.log('[Validate] Connecting to MongoDB...' + (skipFirebase ? ' (SKIP_FIREBASE: MongoDB-only)' : ' and Firebase...'));

  await mongoose.connect(config.mongo.uri);
  const firestore = skipFirebase ? null : await initFirebase();

  try {
    const fb = skipFirebase
      ? { tenants: 0, businesses: 0, products: 0, orders: 0, users: 0, domains: 0, deposits: 0 }
      : await countFirebase(firestore!);
    const mongo = await countMongoDB();

    const checks = [
      { name: 'Tenants', fb: fb.tenants, mongo: mongo.tenants },
      { name: 'Businesses', fb: fb.businesses, mongo: mongo.businesses },
      { name: 'Products', fb: fb.products, mongo: mongo.products },
      { name: 'Orders', fb: fb.orders, mongo: mongo.orders },
      { name: 'Users', fb: fb.users, mongo: mongo.users },
      { name: 'Domains', fb: fb.domains, mongo: mongo.domains },
      { name: 'Deposits (wallet)', fb: fb.deposits, mongo: mongo.deposits },
    ];

    let hasMismatch = false;
    if (skipFirebase) {
      console.log('\n[Validate] MongoDB counts:');
      console.log('─'.repeat(40));
      for (const { name, mongo: mongoCount } of checks) {
        console.log(`   ${name.padEnd(18)} ${mongoCount}`);
      }
      console.log('─'.repeat(40));
      console.log('\n[Validate] OK (MongoDB-only). Use without SKIP_FIREBASE to compare with Firebase.');
    } else {
      console.log('\n[Validate] Count comparison:');
      console.log('─'.repeat(50));
      for (const { name, fb: fbCount, mongo: mongoCount } of checks) {
        const ok = fbCount === mongoCount;
        const icon = ok ? '✓' : '✗';
        const status = ok ? 'OK' : `MISMATCH (Firebase: ${fbCount}, MongoDB: ${mongoCount})`;
        console.log(`${icon} ${name.padEnd(18)} ${status}`);
        if (!ok) hasMismatch = true;
      }
      console.log('─'.repeat(50));
      if (hasMismatch) {
        console.log('\n[Validate] FAILED: Some counts do not match. Re-run migration or investigate.');
        process.exit(1);
      }
    }
    console.log('\n[Validate] OK: All counts match.');
  } finally {
    await mongoose.disconnect();
  }
}

validate().catch((err) => {
  console.error('[Validate] Error:', err);
  process.exit(1);
});
