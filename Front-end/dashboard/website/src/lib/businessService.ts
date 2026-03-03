import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

// Business interface
export interface Business {
  id?: string;
  ownerName: string;
  businessName: string;
  industry: string;
  email: string;
  phone: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  createdAt?: any;
  updatedAt?: any;
  ownerUid: string;
  status: 'active' | 'inactive' | 'pending';
}

// User interface
export interface User {
  uid: string;
  businessId?: string;
  role: 'owner' | 'admin' | 'user';
  createdAt?: any;
  updatedAt?: any;
}

export class BusinessService {
  /**
   * Create a new business
   */
  static async createBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      const businessDoc = {
        ...businessData,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'businesses'), businessDoc);
      
      // Create user record
      await this.createUser(businessData.ownerUid, docRef.id, 'owner');
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating business:', error);
      
      // If Firestore is not available, create a mock business ID
      if (error.code === 'unavailable' || error.message.includes('Firestore')) {
        console.warn('Firestore not available. Using mock business ID for demo purposes.');
        const mockBusinessId = `demo-business-${Date.now()}`;
        
        // Store in localStorage for demo purposes
        const mockBusiness = {
          id: mockBusinessId,
          ...businessData,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        localStorage.setItem('demoBusiness', JSON.stringify(mockBusiness));
        localStorage.setItem('demoUser', JSON.stringify({
          uid: businessData.ownerUid,
          businessId: mockBusinessId,
          role: 'owner',
          createdAt: new Date().toISOString(),
        }));
        
        return mockBusinessId;
      }
      
      throw new Error('Failed to create business');
    }
  }

  /**
   * Create a user record
   */
  static async createUser(uid: string, businessId: string, role: 'owner' | 'admin' | 'user'): Promise<void> {
    try {
      const userDoc = {
        businessId,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), userDoc);
    } catch (error) {
      console.error('Error creating user:', error);
      
      // If Firestore is not available, store in localStorage for demo
      if (error.code === 'unavailable' || error.message.includes('Firestore')) {
        console.warn('Firestore not available. Storing user record in localStorage for demo purposes.');
        localStorage.setItem('demoUser', JSON.stringify({
          uid,
          businessId,
          role,
          createdAt: new Date().toISOString(),
        }));
        return;
      }
      
      throw new Error('Failed to create user');
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
        return { id: docSnap.id, ...docSnap.data() } as Business;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting business:', error);
      
      // If Firestore is not available, try to get from localStorage
      if (error.code === 'unavailable' || error.message.includes('Firestore')) {
        console.warn('Firestore not available. Checking localStorage for demo data.');
        const demoBusiness = localStorage.getItem('demoBusiness');
        if (demoBusiness) {
          return JSON.parse(demoBusiness);
        }
      }
      
      throw new Error('Failed to get business');
    }
  }

  /**
   * Get business by owner UID
   */
  static async getBusinessByOwner(ownerUid: string): Promise<Business | null> {
    try {
      const q = query(
        collection(db, 'businesses'),
        where('ownerUid', '==', ownerUid)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Business;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting business by owner:', error);
      throw new Error('Failed to get business');
    }
  }

  /**
   * Get user by UID
   */
  static async getUser(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update business
   */
  static async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    try {
      const docRef = doc(db, 'businesses', businessId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating business:', error);
      throw new Error('Failed to update business');
    }
  }

  /**
   * Create staff record for dashboard access
   */
  static async createStaffRecord(staffData: {
    uid: string;
    email: string;
    name: string;
    businessId: string;
    role: string;
    approved: boolean;
    permissions: any;
  }): Promise<void> {
    try {
      const staffDoc = {
        ...staffData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'staff', staffData.uid), staffDoc);
    } catch (error) {
      console.error('Error creating staff record:', error);
      
      // If Firestore is not available, store in localStorage for demo
      if (error.code === 'unavailable' || error.message.includes('Firestore')) {
        console.warn('Firestore not available. Storing staff record in localStorage for demo purposes.');
        localStorage.setItem('demoStaff', JSON.stringify({
          ...staffData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        return;
      }
      
      throw new Error('Failed to create staff record');
    }
  }
}
