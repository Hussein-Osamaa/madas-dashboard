// Script to delete all documents in the activeSessions collection
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteActiveSessions() {
  try {
    console.log('🗑️  Starting deletion of activeSessions collection...');

    const collectionRef = db.collection('activeSessions');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log('✅ activeSessions collection is already empty or does not exist.');
      process.exit(0);
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents in activeSessions collection.`);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    while (true) {
      const batch = db.batch();
      const docs = await collectionRef.limit(batchSize).get();

      if (docs.empty) {
        break;
      }

      docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();
      console.log(`🔄 Deleted ${deletedCount} documents so far...`);
    }

    console.log(`✅ Successfully deleted all ${deletedCount} documents from activeSessions collection!`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error deleting activeSessions:', error);
    process.exit(1);
  }
}

deleteActiveSessions();
