const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteProducts() {
  try {
    console.log('Starting to delete products collection...');
    
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    
    if (productsSnapshot.empty) {
      console.log('No products found to delete.');
      return;
    }
    
    console.log(`Found ${productsSnapshot.size} products to delete.`);
    
    // Delete each product
    const batch = db.batch();
    productsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('All products deleted successfully!');
    
  } catch (error) {
    console.error('Error deleting products:', error);
  } finally {
    process.exit(0);
  }
}

deleteProducts();

