/**
 * Firebase Admin initialization helper.
 *
 * We support multiple credential sources so the server can run locally
 * (serviceAccountKey.json), in development (GOOGLE_APPLICATION_CREDENTIALS)
 * or in production (FIREBASE_SERVICE_ACCOUNT env var).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

/**
 * Attempt to load service account credentials when needed.
 */
function getServiceAccountConfig() {
  // Prefer explicit JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
      console.warn('⚠️  Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', error.message);
    }
  }

  // Next rely on GOOGLE_APPLICATION_CREDENTIALS (handled automatically by SDK)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }

  // Finally, attempt to load local serviceAccountKey.json if present
  const localKeyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(localKeyPath);
    } catch (error) {
      console.warn('⚠️  Failed to load local serviceAccountKey.json:', error.message);
    }
  }

  return null;
}

/**
 * Initialize app only once.
 */
function ensureAdminInitialized() {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccount = getServiceAccountConfig();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
  } else {
    admin.initializeApp();
  }
}

ensureAdminInitialized();

const db = admin.firestore();

module.exports = {
  admin,
  db
};



