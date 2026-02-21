/**
 * Firebase Configuration for MADAS Marketing Website
 * This file contains the Firebase config and initialization
 */

const admin = require('firebase-admin');

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:7470e2204065b4590583d3",
  measurementId: "G-NQVR1F4N3Q"
};

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // For development, we'll use the project ID to initialize
      // In production, you should use a service account key
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
        // Note: For production, add service account credentials here
        // credential: admin.credential.cert(serviceAccount)
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log('📝 Project ID:', firebaseConfig.projectId);
      return true;
    } else {
      console.log('✅ Firebase Admin SDK already initialized');
      return true;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('⚠️  Running in development mode without Firebase');
    return false;
  }
}

// Get Firestore instance
function getFirestore() {
  try {
    if (admin.apps.length > 0) {
      return admin.firestore();
    }
    return null;
  } catch (error) {
    console.error('❌ Firestore error:', error.message);
    return null;
  }
}

// Get Auth instance
function getAuth() {
  try {
    if (admin.apps.length > 0) {
      return admin.auth();
    }
    return null;
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return null;
  }
}

module.exports = {
  firebaseConfig,
  initializeFirebase,
  getFirestore,
  getAuth
};
