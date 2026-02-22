/**
 * Firebase Admin - lazy init for token verification.
 * Supports:
 * - FIREBASE_SERVICE_ACCOUNT_JSON: full JSON string (e.g. on Render, Railway)
 * - GOOGLE_APPLICATION_CREDENTIALS: path to JSON file (local/dev)
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let initialized = false;

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      const serviceAccount = JSON.parse(jsonEnv);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      initialized = true;
      return admin.app();
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON');
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error(
      'Firebase Admin requires FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path)'
    );
  }
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
