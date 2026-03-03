import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AdminUser {
  uid: string;
  email: string;
  role: string;
  permissions?: string[];
}

export class AuthService {
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      // Provide more specific error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No user found with this email address');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection');
      } else {
        throw new Error(`Sign in failed: ${error.message}`);
      }
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    return auth.currentUser;
  }

  static async checkAdminRole(user: User): Promise<AdminUser | null> {
    try {
      // First try to get from staff collection
      const userDoc = await getDoc(doc(db, 'staff', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin' && userData.approved) {
          return {
            uid: user.uid,
            email: user.email || '',
            role: userData.role,
            permissions: userData.permissions
          };
        }
      }

      // If not found in staff, check if it's a hardcoded admin email
      const adminEmails = [
        'hesainosama@gmail.com',
        'admin@madas.com',
        'admin@example.com'
      ];

      if (user.email && adminEmails.includes(user.email)) {
        return {
          uid: user.uid,
          email: user.email,
          role: 'admin',
          permissions: {
            home: ['view'],
            orders: ['view', 'search', 'create', 'edit'],
            inventory: ['view', 'edit'],
            customers: ['view', 'edit'],
            employees: ['view', 'edit'],
            finance: ['view', 'reports'],
            analytics: ['view', 'export'],
            settings: ['view', 'edit']
          }
        };
      }

      return null;
    } catch (error: any) {
      console.error('Error checking admin role:', error);
      
      // If it's a permissions error, check hardcoded admin emails as fallback
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        const adminEmails = [
          'hesainosama@gmail.com',
          'admin@madas.com',
          'admin@example.com'
        ];

        if (user.email && adminEmails.includes(user.email)) {
          return {
            uid: user.uid,
            email: user.email,
            role: 'admin',
            permissions: {
              home: ['view'],
              orders: ['view', 'search', 'create', 'edit'],
              inventory: ['view', 'edit'],
              customers: ['view', 'edit'],
              employees: ['view', 'edit'],
              finance: ['view', 'reports'],
              analytics: ['view', 'export'],
              settings: ['view', 'edit']
            }
          };
        }
      }
      
      return null;
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}
