import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { BusinessService } from './businessService';

export class AuthService {
  /**
   * Sign in anonymously
   */
  static async signInAnonymously(): Promise<User> {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      
      // If anonymous auth is restricted, try to get current user or create a mock user
      if (error.code === 'auth/admin-restricted-operation') {
        console.warn('Anonymous authentication is restricted. Using mock authentication for demo purposes.');
        
        // Create a mock user for demo purposes
        const mockUser = {
          uid: `demo-user-${Date.now()}`,
          displayName: 'Demo User',
          email: null,
          isAnonymous: true,
          emailVerified: false,
          phoneNumber: null,
          photoURL: null,
          providerId: 'demo',
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString()
          }
        } as any;
        
        return mockUser;
      }
      
      throw new Error('Failed to sign in');
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(displayName: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Get user's business data
   */
  static async getUserBusiness(): Promise<any> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }

      const business = await BusinessService.getBusinessByOwner(user.uid);
      return business;
    } catch (error) {
      console.error('Error getting user business:', error);
      throw new Error('Failed to get business data');
    }
  }
}
