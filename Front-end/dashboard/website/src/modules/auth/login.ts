import { auth, db } from '@/lib/backend';
import { TrialService } from '@/modules/trial/trialService';

export interface UserData {
  uid: string;
  email: string;
  businessId: string | null;
  role: 'owner' | 'staff' | 'admin';
  createdAt: any;
  updatedAt: any;
}

export interface LoginResult {
  user: any;
  userData: UserData;
  businessId: string | null;
}

/**
 * Gets user document or creates it if missing (fail-safe)
 * @param uid - User's ID
 * @param email - User's email
 * @returns Promise<UserData>
 */
async function getOrCreateUserDocument(uid: string, email: string): Promise<UserData> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      console.log('User document found:', uid);
      return { id: userDoc.id, ...userDoc.data() } as UserData;
    }

    // User document doesn't exist - create it (fail-safe)
    console.log('User document not found, creating fail-safe document:', uid);
    
    // Initialize trial for existing user without document
    await TrialService.initializeTrial(uid, email, null);
    console.log('Trial initialized for existing user:', uid);
    
    const userData: Omit<UserData, 'createdAt' | 'updatedAt'> = {
      uid: uid,
      email: email,
      businessId: null, // No business yet
      role: 'owner'
    };

    const completeUserData: UserData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...userData
    };

    await setDoc(userRef, completeUserData);
    console.log('Fail-safe user document created:', uid);

    return {
      ...userData,
      createdAt: null, // Will be set by serverTimestamp
      updatedAt: null
    };

  } catch (error) {
    console.error('Error getting/creating user document:', error);
    throw error;
  }
}

/**
 * Logs in user with fail-safe user document creation
 * @param email - User's email
 * @param password - User's password
 * @returns Promise<LoginResult>
 */
export async function loginWithFailSafe(email: string, password: string): Promise<LoginResult> {
  try {
    console.log('Starting login process for:', email);

    // 1. Authenticate with backend API
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Login successful:', user.uid);

    // 2. Get or create user document (fail-safe)
    const userData = await getOrCreateUserDocument(user.uid, email);
    console.log('User document retrieved/created:', userData);

    return {
      user,
      userData,
      businessId: userData.businessId
    };

  } catch (error) {
    console.error('Login error:', error);
    throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
