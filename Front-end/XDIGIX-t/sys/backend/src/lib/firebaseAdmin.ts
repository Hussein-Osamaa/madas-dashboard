/**
 * Firebase Admin - lazy init for token verification
 */
import admin from 'firebase-admin';

let initialized = false;

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS required for Firebase Admin');
  }
  const path = require('path');
  const fs = require('fs');
  const resolvedPath = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Firebase service account not found: ${resolvedPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initialized = true;
  return admin.app();
}

export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const app = initFirebaseAdmin();
    const decoded = await app.auth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err) {
    console.error('[firebaseAdmin] verifyIdToken failed:', (err as Error).message);
    return null;
  }
}
