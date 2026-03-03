import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createBusiness } from '@/modules/business/createBusiness';
import { TrialService } from '@/modules/trial/trialService';

export interface SignupData {
  email: string;
  password: string;
  businessName: string;
  ownerName: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
}

export interface UserData {
  uid: string;
  email: string;
  businessId: string | null;
  role: 'owner' | 'staff' | 'admin';
  createdAt: any;
  updatedAt: any;
}

export interface SignupResult {
  user: any;
  userData: UserData;
  businessId: string;
}

/**
 * Creates a user document in Firestore
 * @param uid - User's Firebase UID
 * @param userData - User data
 * @returns Promise<void>
 */
async function createUserDocument(uid: string, userData: Omit<UserData, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const completeUserData: UserData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...userData
    };
    
    await setDoc(userRef, completeUserData);
    console.log('User document created successfully:', uid);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

/**
 * Signs up a new owner with business creation
 * @param signupData - Signup form data
 * @returns Promise<SignupResult>
 */
export async function signUpOwner(signupData: SignupData): Promise<SignupResult> {
  try {
    console.log('Starting owner signup process for:', signupData.email);

    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      signupData.email, 
      signupData.password
    );
    const user = userCredential.user;
    console.log('Firebase Auth user created:', user.uid);

    // 2. Generate business ID (using user's UID for simplicity)
    const businessId = user.uid;

    // 3. Create business document
    await createBusiness(businessId, {
      ownerUid: user.uid,
      businessName: signupData.businessName,
      plan: signupData.plan,
      staff: []
    });
    console.log('Business created:', businessId);

    // 4. Initialize trial for the new user
    await TrialService.initializeTrial(user.uid, signupData.email, businessId);
    console.log('Trial initialized for user:', user.uid);

    // 5. Create user document
    const userData: Omit<UserData, 'createdAt' | 'updatedAt'> = {
      uid: user.uid,
      email: signupData.email,
      businessId: businessId,
      role: 'owner'
    };

    await createUserDocument(user.uid, userData);
    console.log('User document created:', user.uid);

    return {
      user,
      userData: {
        ...userData,
        createdAt: null, // Will be set by serverTimestamp
        updatedAt: null
      },
      businessId
    };

  } catch (error) {
    console.error('Signup error:', error);
    throw new Error(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
