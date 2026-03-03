import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  addDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { db, auth } from './firebase';

export interface User {
  uid: string;
  email: string;
  businessId?: string;
  role: string;
  plan?: string;
  createdAt?: any;
  permissions?: any;
}

export interface Business {
  id: string;
  businessName: string;
  ownerUid: string;
  ownerName: string;
  industry: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  createdAt?: any;
}

export interface NewBusinessData {
  ownerName: string;
  businessName: string;
  industry: string;
  email: string;
  phone: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  password: string;
}

export class AdminService {
  /**
   * Get all users with pagination
   */
  static async getUsers(limitCount: number = 50, lastDoc?: any): Promise<User[]> {
    try {
      let q = query(
        collection(db, 'staff'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }

  /**
   * Search users by email
   */
  static async searchUsersByEmail(email: string): Promise<User[]> {
    try {
      const q = query(
        collection(db, 'staff'),
        where('email', '>=', email),
        where('email', '<=', email + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get all businesses with pagination
   */
  static async getBusinesses(limitCount: number = 50, lastDoc?: any): Promise<Business[]> {
    try {
      let q = query(
        collection(db, 'businesses'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Business[];
    } catch (error) {
      console.error('Error getting businesses:', error);
      throw new Error('Failed to get businesses');
    }
  }

  /**
   * Search businesses by name
   */
  static async searchBusinessesByName(name: string): Promise<Business[]> {
    try {
      const q = query(
        collection(db, 'businesses'),
        where('businessName', '>=', name),
        where('businessName', '<=', name + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Business[];
    } catch (error) {
      console.error('Error searching businesses:', error);
      throw new Error('Failed to search businesses');
    }
  }

  /**
   * Get user by UID
   */
  static async getUser(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'staff', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          uid: docSnap.id,
          ...docSnap.data()
        } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update user permissions
   */
  static async updateUserPermissions(uid: string, permissions: any): Promise<void> {
    try {
      const docRef = doc(db, 'staff', uid);
      await updateDoc(docRef, {
        permissions: permissions,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw new Error('Failed to update user permissions');
    }
  }

  /**
   * Get business by ID
   */
  static async getBusiness(businessId: string): Promise<Business | null> {
    try {
      const docRef = doc(db, 'businesses', businessId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Business;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting business:', error);
      throw new Error('Failed to get business');
    }
  }

  /**
   * Create a new business with dashboard access
   */
  static async createBusinessWithDashboardAccess(businessData: NewBusinessData): Promise<string> {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        businessData.email, 
        businessData.password
      );
      const user = userCredential.user;

      // Update user profile with owner name
      await updateProfile(user, {
        displayName: businessData.ownerName
      });

      // Create business document
      const businessDoc = {
        businessName: businessData.businessName,
        ownerUid: user.uid,
        ownerName: businessData.ownerName,
        industry: businessData.industry,
        email: businessData.email,
        phone: businessData.phone,
        plan: businessData.plan,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const businessRef = await addDoc(collection(db, 'businesses'), businessDoc);

      // Create user record in users collection
      const userDoc = {
        businessId: businessRef.id,
        role: 'owner',
        plan: businessData.plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      // Create staff record for dashboard access
      const staffDoc = {
        email: businessData.email,
        name: businessData.ownerName,
        businessId: businessRef.id,
        role: 'owner',
        approved: true,
        status: 'active',
        permissions: {
          home: ['view'],
          orders: ['view', 'search', 'create', 'edit'],
          inventory: ['view', 'edit'],
          customers: ['view', 'edit'],
          employees: ['view', 'edit'],
          finance: ['view', 'reports'],
          analytics: ['view', 'export'],
          settings: ['view', 'edit']
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'staff', user.uid), staffDoc);

      return businessRef.id;
    } catch (error: any) {
      console.error('Error creating business with dashboard access:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else {
        throw new Error(`Failed to create business: ${error.message}`);
      }
    }
  }
}
