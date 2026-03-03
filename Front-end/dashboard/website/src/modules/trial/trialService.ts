import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TrialData {
  trialExpires: any; // Firestore Timestamp
  trialStarted: any; // Firestore Timestamp
  isTrialActive: boolean;
  trialDaysRemaining: number;
}

export interface UserTrialData extends TrialData {
  uid: string;
  email: string;
  businessId: string | null;
}

/**
 * Trial Service - Manages 15-day trial system for new users
 */
export class TrialService {
  private static readonly TRIAL_DAYS = 15;

  /**
   * Initialize trial for a new user
   * @param uid - User's Firebase UID
   * @param email - User's email
   * @param businessId - Associated business ID
   * @returns Promise<TrialData>
   */
  static async initializeTrial(uid: string, email: string, businessId: string | null = null): Promise<TrialData> {
    try {
      console.log('Initializing trial for user:', uid);

      const trialStartDate = new Date();
      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialStartDate.getDate() + this.TRIAL_DAYS);

      const trialData: TrialData = {
        trialStarted: serverTimestamp(),
        trialExpires: serverTimestamp(),
        isTrialActive: true,
        trialDaysRemaining: this.TRIAL_DAYS
      };

      // Update user document with trial data
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        email,
        businessId,
        ...trialData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // If business exists, also add trial data to business
      if (businessId) {
        const businessRef = doc(db, 'businesses', businessId);
        await setDoc(businessRef, {
          ...trialData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      console.log('Trial initialized successfully for user:', uid);
      return trialData;

    } catch (error) {
      console.error('Error initializing trial:', error);
      throw new Error(`Failed to initialize trial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check trial status for a user
   * @param uid - User's Firebase UID
   * @returns Promise<UserTrialData | null>
   */
  static async checkTrialStatus(uid: string): Promise<UserTrialData | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.warn('User document not found for trial check:', uid);
        return null;
      }

      const userData = userDoc.data();
      const now = new Date();
      
      // Calculate days remaining
      let daysRemaining = 0;
      let isTrialActive = false;

      if (userData.trialExpires) {
        const expiryDate = userData.trialExpires.toDate();
        const timeDiff = expiryDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        isTrialActive = daysRemaining > 0;
      }

      const trialData: UserTrialData = {
        uid: userData.uid,
        email: userData.email,
        businessId: userData.businessId,
        trialStarted: userData.trialStarted,
        trialExpires: userData.trialExpires,
        isTrialActive,
        trialDaysRemaining: daysRemaining
      };

      // Update trial status if expired
      if (!isTrialActive && userData.isTrialActive) {
        await this.updateTrialStatus(uid, false);
      }

      return trialData;

    } catch (error) {
      console.error('Error checking trial status:', error);
      throw new Error(`Failed to check trial status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update trial status
   * @param uid - User's Firebase UID
   * @param isActive - Whether trial is active
   * @returns Promise<void>
   */
  static async updateTrialStatus(uid: string, isActive: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      
      await updateDoc(userRef, {
        isTrialActive: isActive,
        updatedAt: serverTimestamp()
      });

      // Also update business if exists
      if (userData.businessId) {
        const businessRef = doc(db, 'businesses', userData.businessId);
        await updateDoc(businessRef, {
          isTrialActive: isActive,
          updatedAt: serverTimestamp()
        });
      }

      console.log('Trial status updated for user:', uid, 'Active:', isActive);

    } catch (error) {
      console.error('Error updating trial status:', error);
      throw error;
    }
  }

  /**
   * Extend trial (admin function)
   * @param uid - User's Firebase UID
   * @param additionalDays - Days to extend trial
   * @returns Promise<void>
   */
  static async extendTrial(uid: string, additionalDays: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const currentExpiry = userData.trialExpires?.toDate() || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + additionalDays);

      await updateDoc(userRef, {
        trialExpires: serverTimestamp(),
        isTrialActive: true,
        updatedAt: serverTimestamp()
      });

      // Also update business if exists
      if (userData.businessId) {
        const businessRef = doc(db, 'businesses', userData.businessId);
        await updateDoc(businessRef, {
          trialExpires: serverTimestamp(),
          isTrialActive: true,
          updatedAt: serverTimestamp()
        });
      }

      console.log(`Trial extended for user ${uid} by ${additionalDays} days`);

    } catch (error) {
      console.error('Error extending trial:', error);
      throw error;
    }
  }

  /**
   * Check if user has active subscription (non-trial)
   * @param uid - User's Firebase UID
   * @returns Promise<boolean>
   */
  static async hasActiveSubscription(uid: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      
      // Check if user has active subscription
      return userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing';

    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get trial days remaining
   * @param uid - User's Firebase UID
   * @returns Promise<number>
   */
  static async getTrialDaysRemaining(uid: string): Promise<number> {
    try {
      const trialData = await this.checkTrialStatus(uid);
      return trialData?.trialDaysRemaining || 0;
    } catch (error) {
      console.error('Error getting trial days remaining:', error);
      return 0;
    }
  }
}
