/**
 * Map Firebase business IDs to MongoDB clients.
 * Sets firebaseId on each MongoDB client so "Join as Support" URLs work with old Firebase IDs.
 *
 * Run: node scripts/map-firebase-to-mongodb.js
 */
require('dotenv').config();
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Client = require('../src/models/Client');

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, '..', 'firebase-service-account.json');

function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let serviceAccount = null;
  if (jsonEnv) {
    try {
      serviceAccount = JSON.parse(jsonEnv);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON invalid');
    }
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }
  if (!serviceAccount) {
    throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

async function mapFirebaseToMongoDB() {
  const db = initFirebase();
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
  console.log('MongoDB connected\n');

  const mongoClients = await Client.find().lean();
  const businessesSnap = await db.collection('businesses').get();

  let updated = 0;
  for (const fbDoc of businessesSnap.docs) {
    const fbData = fbDoc.data();
    const fbId = fbDoc.id;
    const fbName = (fbData.businessName || fbData.brandName || '').trim().toLowerCase();
    const fbEmail = (fbData.owner?.email || '').trim().toLowerCase();

    if (!fbName && !fbEmail) {
      console.log(`  Skip ${fbId}: no brandName or owner email`);
      continue;
    }

    const match = mongoClients.find((c) => {
      const mongoName = (c.brandName || '').trim().toLowerCase();
      const mongoEmail = (c.owner?.email || '').trim().toLowerCase();
      return (fbName && mongoName && fbName === mongoName) || (fbEmail && mongoEmail && fbEmail === mongoEmail);
    });

    if (match) {
      await Client.findByIdAndUpdate(match._id, { firebaseId: fbId });
      updated++;
      console.log(`  ${fbId} → ${match.brandName} (${match._id})`);
    } else {
      console.log(`  No match for Firebase ${fbId} (${fbData.businessName || fbData.brandName})`);
    }
  }

  console.log(`\nUpdated ${updated} client(s) with firebaseId`);
  console.log('"Join as Support" URLs with Firebase IDs should now work.');
  process.exit(0);
}

mapFirebaseToMongoDB().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
