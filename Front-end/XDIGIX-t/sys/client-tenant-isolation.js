/**
 * CLIENT-SIDE TENANT ISOLATION (React/Next.js)
 * 
 * Use this in your React applications for automatic business scoping
 * Works with Firebase Firestore on the client side
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Initialize Firestore
const db = getFirestore();
const auth = getAuth();

/**
 * Tenant Context
 */
const TenantContext = createContext(null);

/**
 * Tenant Provider Component
 * Wrap your app with this to enable tenant isolation
 */
export function TenantProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user document from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ uid: firebaseUser.uid, ...userData });
            
            // Check if super admin
            setIsSuperAdmin(userData.platformRole === 'super_admin');
            
            // Get businesses user has access to
            if (userData.businesses && userData.businesses.length > 0) {
              setUserBusinesses(userData.businesses);
              
              // Load current business details
              if (userData.currentBusinessId) {
                await loadCurrentBusiness(userData.currentBusinessId);
              } else {
                // Set first business as current
                await loadCurrentBusiness(userData.businesses[0].businessId);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setUser(null);
        setCurrentBusiness(null);
        setUserBusinesses([]);
        setIsSuperAdmin(false);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  async function loadCurrentBusiness(businessId) {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        setCurrentBusiness({
          id: businessDoc.id,
          ...businessData
        });
        
        // Update user's current business
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            currentBusinessId: businessId
          });
        }
      }
    } catch (error) {
      console.error('Error loading business:', error);
    }
  }
  
  async function switchBusiness(businessId) {
    await loadCurrentBusiness(businessId);
  }
  
  const value = {
    user,
    currentBusiness,
    userBusinesses,
    loading,
    isSuperAdmin,
    switchBusiness,
    businessId: currentBusiness?.id || null
  };
  
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook: Use Tenant Context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  
  return context;
}

/**
 * Hook: Scoped Collection Operations
 * Automatically scopes all operations to current business
 */
export function useScopedCollection(collectionName) {
  const { businessId, isSuperAdmin } = useTenant();
  
  if (!businessId && !isSuperAdmin) {
    throw new Error('No business context available');
  }
  
  /**
   * Get all documents from scoped collection
   */
  async function getAll(filters = {}) {
    try {
      let q = collection(db, 'businesses', businessId, collectionName);
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        q = query(q, where(field, '==', value));
      });
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        businessId, // Always include businessId
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get single document by ID
   */
  async function getById(documentId) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Security check: Verify document belongs to this business
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      return {
        id: docSnap.id,
        businessId,
        ...data
      };
    } catch (error) {
      console.error(`Error fetching ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Create new document
   */
  async function create(data) {
    try {
      const collectionRef = collection(db, 'businesses', businessId, collectionName);
      
      const documentData = {
        ...data,
        businessId, // Always set businessId
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collectionRef, documentData);
      
      return {
        id: docRef.id,
        ...documentData
      };
    } catch (error) {
      console.error(`Error creating ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Update existing document
   */
  async function update(documentId, updates) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      
      // First verify it exists and belongs to this business
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const data = docSnap.data();
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      
      return {
        id: documentId,
        ...data,
        ...updateData
      };
    } catch (error) {
      console.error(`Error updating ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Delete document
   */
  async function remove(documentId) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      
      // Verify it exists and belongs to this business
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const data = docSnap.data();
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      await deleteDoc(docRef);
      
      return { success: true, id: documentId };
    } catch (error) {
      console.error(`Error deleting ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Real-time subscription to collection
   */
  function subscribe(filters = {}, callback) {
    let q = collection(db, 'businesses', businessId, collectionName);
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          businessId,
          ...doc.data()
        }));
        callback(docs);
      },
      (error) => {
        console.error(`Error in ${collectionName} subscription:`, error);
      }
    );
    
    return unsubscribe;
  }
  
  return {
    getAll,
    getById,
    create,
    update,
    remove,
    subscribe
  };
}

/**
 * Hook: Check Feature Access
 */
export function useFeatureAccess(feature) {
  const { currentBusiness, isSuperAdmin } = useTenant();
  
  // Super admin has access to all features
  if (isSuperAdmin) {
    return { hasAccess: true, isLoading: false };
  }
  
  // Check if business has feature enabled
  const hasAccess = currentBusiness?.features?.[feature] === true;
  
  return {
    hasAccess,
    isLoading: !currentBusiness,
    currentPlan: currentBusiness?.plan?.type,
    requiresUpgrade: !hasAccess
  };
}

/**
 * Hook: Check Permission
 */
export function usePermission(permission) {
  const { user, currentBusiness, isSuperAdmin } = useTenant();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkPermission() {
      // Super admin has all permissions
      if (isSuperAdmin) {
        setHasPermission(true);
        setLoading(false);
        return;
      }
      
      if (!user?.uid || !currentBusiness?.id) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      try {
        // Get staff document to check permissions
        const staffDoc = await getDoc(
          doc(db, 'businesses', currentBusiness.id, 'staff', user.uid)
        );
        
        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          setHasPermission(staffData.permissions?.[permission] === true);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      }
      
      setLoading(false);
    }
    
    checkPermission();
  }, [user, currentBusiness, permission, isSuperAdmin]);
  
  return { hasPermission, loading };
}

/**
 * Component: Feature Gate
 * Conditionally render based on feature access
 */
export function FeatureGate({ feature, children, fallback = null }) {
  const { hasAccess, isLoading, requiresUpgrade, currentPlan } = useFeatureAccess(feature);
  
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Feature Not Available
        </h3>
        <p className="text-yellow-700 mb-4">
          The "{feature}" feature is not included in your {currentPlan || 'current'} plan.
        </p>
        <button 
          onClick={() => window.location.href = '/settings/billing'}
          className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600"
        >
          Upgrade Plan
        </button>
      </div>
    );
  }
  
  return children;
}

/**
 * Component: Permission Gate
 * Conditionally render based on permission
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission, loading } = usePermission(permission);
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">You don't have permission to access this feature.</p>
      </div>
    );
  }
  
  return children;
}

/**
 * Component: Business Selector
 * Allow users to switch between businesses
 */
export function BusinessSelector({ className = '' }) {
  const { userBusinesses, currentBusiness, switchBusiness, isSuperAdmin } = useTenant();
  
  if (!userBusinesses || userBusinesses.length === 0) {
    return null;
  }
  
  if (userBusinesses.length === 1) {
    // Only one business, just show the name
    return (
      <div className={`px-4 py-2 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-sm font-medium text-gray-900">
          {currentBusiness?.businessName || userBusinesses[0].businessName}
        </p>
        {isSuperAdmin && (
          <span className="text-xs text-purple-600 font-semibold">SUPER ADMIN</span>
        )}
      </div>
    );
  }
  
  return (
    <div className={className}>
      <select
        value={currentBusiness?.id || ''}
        onChange={(e) => switchBusiness(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {userBusinesses.map((business) => (
          <option key={business.businessId} value={business.businessId}>
            {business.businessName}
          </option>
        ))}
      </select>
      {isSuperAdmin && (
        <span className="ml-2 text-xs text-purple-600 font-semibold">SUPER ADMIN</span>
      )}
    </div>
  );
}

/**
 * Hook: Protected Route
 * Use this in your route components to ensure authentication and business access
 */
export function useProtectedRoute() {
  const { user, currentBusiness, loading } = useTenant();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (!currentBusiness) {
        // Redirect to onboarding
        window.location.href = '/onboarding';
        return;
      }
      
      // Check if business is active
      if (currentBusiness.status !== 'active') {
        window.location.href = '/suspended';
        return;
      }
      
      setIsAuthorized(true);
    }
  }, [user, currentBusiness, loading]);
  
  return { isAuthorized, loading };
}

/**
 * HOC: withTenantIsolation
 * Wrap your components to ensure tenant isolation
 */
export function withTenantIsolation(Component) {
  return function WrappedComponent(props) {
    const { isAuthorized, loading } = useProtectedRoute();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!isAuthorized) {
      return null; // Will redirect in useProtectedRoute
    }
    
    return <Component {...props} />;
  };
}

/**
 * Example: Usage in a React component
 */
export function ExampleProductList() {
  const { businessId } = useTenant();
  const products = useScopedCollection('products');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProducts();
  }, [businessId]);
  
  async function loadProducts() {
    try {
      setLoading(true);
      const data = await products.getAll({ status: 'active' });
      setProductList(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function addProduct(productData) {
    try {
      const newProduct = await products.create(productData);
      setProductList([...productList, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
  
  async function updateProduct(productId, updates) {
    try {
      const updated = await products.update(productId, updates);
      setProductList(productList.map(p => p.id === productId ? updated : p));
      return updated;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }
  
  async function deleteProduct(productId) {
    try {
      await products.remove(productId);
      setProductList(productList.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  
  if (loading) {
    return <div>Loading products...</div>;
  }
  
  return (
    <div>
      <h2>Products for Business: {businessId}</h2>
      <ul>
        {productList.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * HOC: Require Feature
 * Wrap components that require specific features
 */
export function requireFeature(feature) {
  return function (Component) {
    return function WrappedComponent(props) {
      return (
        <FeatureGate feature={feature}>
          <Component {...props} />
        </FeatureGate>
      );
    };
  };
}

/**
 * HOC: Require Permission
 * Wrap components that require specific permissions
 */
export function requirePermission(permission) {
  return function (Component) {
    return function WrappedComponent(props) {
      return (
        <PermissionGate permission={permission}>
          <Component {...props} />
        </PermissionGate>
      );
    };
  };
}

/**
 * Utility: Get scoped query
 * For complex queries
 */
export function getScopedQuery(businessId, collectionName) {
  if (!businessId) {
    throw new Error('Business ID is required for scoped query');
  }
  
  return {
    collection: collection(db, 'businesses', businessId, collectionName),
    
    /**
     * Build query with filters
     */
    where(field, operator, value) {
      return query(this.collection, where(field, operator, value));
    },
    
    /**
     * Execute query
     */
    async execute(queryObj = null) {
      const q = queryObj || this.collection;
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        businessId,
        ...doc.data()
      }));
    }
  };
}

// Export everything
export default {
  TenantProvider,
  useTenant,
  useScopedCollection,
  useFeatureAccess,
  usePermission,
  useProtectedRoute,
  FeatureGate,
  PermissionGate,
  BusinessSelector,
  withTenantIsolation,
  requireFeature,
  requirePermission,
  getScopedQuery
};

 * CLIENT-SIDE TENANT ISOLATION (React/Next.js)
 * 
 * Use this in your React applications for automatic business scoping
 * Works with Firebase Firestore on the client side
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Initialize Firestore
const db = getFirestore();
const auth = getAuth();

/**
 * Tenant Context
 */
const TenantContext = createContext(null);

/**
 * Tenant Provider Component
 * Wrap your app with this to enable tenant isolation
 */
export function TenantProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user document from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ uid: firebaseUser.uid, ...userData });
            
            // Check if super admin
            setIsSuperAdmin(userData.platformRole === 'super_admin');
            
            // Get businesses user has access to
            if (userData.businesses && userData.businesses.length > 0) {
              setUserBusinesses(userData.businesses);
              
              // Load current business details
              if (userData.currentBusinessId) {
                await loadCurrentBusiness(userData.currentBusinessId);
              } else {
                // Set first business as current
                await loadCurrentBusiness(userData.businesses[0].businessId);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setUser(null);
        setCurrentBusiness(null);
        setUserBusinesses([]);
        setIsSuperAdmin(false);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  async function loadCurrentBusiness(businessId) {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        setCurrentBusiness({
          id: businessDoc.id,
          ...businessData
        });
        
        // Update user's current business
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            currentBusinessId: businessId
          });
        }
      }
    } catch (error) {
      console.error('Error loading business:', error);
    }
  }
  
  async function switchBusiness(businessId) {
    await loadCurrentBusiness(businessId);
  }
  
  const value = {
    user,
    currentBusiness,
    userBusinesses,
    loading,
    isSuperAdmin,
    switchBusiness,
    businessId: currentBusiness?.id || null
  };
  
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook: Use Tenant Context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  
  return context;
}

/**
 * Hook: Scoped Collection Operations
 * Automatically scopes all operations to current business
 */
export function useScopedCollection(collectionName) {
  const { businessId, isSuperAdmin } = useTenant();
  
  if (!businessId && !isSuperAdmin) {
    throw new Error('No business context available');
  }
  
  /**
   * Get all documents from scoped collection
   */
  async function getAll(filters = {}) {
    try {
      let q = collection(db, 'businesses', businessId, collectionName);
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        q = query(q, where(field, '==', value));
      });
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        businessId, // Always include businessId
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get single document by ID
   */
  async function getById(documentId) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Security check: Verify document belongs to this business
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      return {
        id: docSnap.id,
        businessId,
        ...data
      };
    } catch (error) {
      console.error(`Error fetching ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Create new document
   */
  async function create(data) {
    try {
      const collectionRef = collection(db, 'businesses', businessId, collectionName);
      
      const documentData = {
        ...data,
        businessId, // Always set businessId
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collectionRef, documentData);
      
      return {
        id: docRef.id,
        ...documentData
      };
    } catch (error) {
      console.error(`Error creating ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Update existing document
   */
  async function update(documentId, updates) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      
      // First verify it exists and belongs to this business
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const data = docSnap.data();
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      
      return {
        id: documentId,
        ...data,
        ...updateData
      };
    } catch (error) {
      console.error(`Error updating ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Delete document
   */
  async function remove(documentId) {
    try {
      const docRef = doc(db, 'businesses', businessId, collectionName, documentId);
      
      // Verify it exists and belongs to this business
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const data = docSnap.data();
      if (data.businessId && data.businessId !== businessId) {
        throw new Error('Unauthorized: Document belongs to different business');
      }
      
      await deleteDoc(docRef);
      
      return { success: true, id: documentId };
    } catch (error) {
      console.error(`Error deleting ${collectionName} document:`, error);
      throw error;
    }
  }
  
  /**
   * Real-time subscription to collection
   */
  function subscribe(filters = {}, callback) {
    let q = collection(db, 'businesses', businessId, collectionName);
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          businessId,
          ...doc.data()
        }));
        callback(docs);
      },
      (error) => {
        console.error(`Error in ${collectionName} subscription:`, error);
      }
    );
    
    return unsubscribe;
  }
  
  return {
    getAll,
    getById,
    create,
    update,
    remove,
    subscribe
  };
}

/**
 * Hook: Check Feature Access
 */
export function useFeatureAccess(feature) {
  const { currentBusiness, isSuperAdmin } = useTenant();
  
  // Super admin has access to all features
  if (isSuperAdmin) {
    return { hasAccess: true, isLoading: false };
  }
  
  // Check if business has feature enabled
  const hasAccess = currentBusiness?.features?.[feature] === true;
  
  return {
    hasAccess,
    isLoading: !currentBusiness,
    currentPlan: currentBusiness?.plan?.type,
    requiresUpgrade: !hasAccess
  };
}

/**
 * Hook: Check Permission
 */
export function usePermission(permission) {
  const { user, currentBusiness, isSuperAdmin } = useTenant();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkPermission() {
      // Super admin has all permissions
      if (isSuperAdmin) {
        setHasPermission(true);
        setLoading(false);
        return;
      }
      
      if (!user?.uid || !currentBusiness?.id) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      try {
        // Get staff document to check permissions
        const staffDoc = await getDoc(
          doc(db, 'businesses', currentBusiness.id, 'staff', user.uid)
        );
        
        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          setHasPermission(staffData.permissions?.[permission] === true);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      }
      
      setLoading(false);
    }
    
    checkPermission();
  }, [user, currentBusiness, permission, isSuperAdmin]);
  
  return { hasPermission, loading };
}

/**
 * Component: Feature Gate
 * Conditionally render based on feature access
 */
export function FeatureGate({ feature, children, fallback = null }) {
  const { hasAccess, isLoading, requiresUpgrade, currentPlan } = useFeatureAccess(feature);
  
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Feature Not Available
        </h3>
        <p className="text-yellow-700 mb-4">
          The "{feature}" feature is not included in your {currentPlan || 'current'} plan.
        </p>
        <button 
          onClick={() => window.location.href = '/settings/billing'}
          className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600"
        >
          Upgrade Plan
        </button>
      </div>
    );
  }
  
  return children;
}

/**
 * Component: Permission Gate
 * Conditionally render based on permission
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission, loading } = usePermission(permission);
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">You don't have permission to access this feature.</p>
      </div>
    );
  }
  
  return children;
}

/**
 * Component: Business Selector
 * Allow users to switch between businesses
 */
export function BusinessSelector({ className = '' }) {
  const { userBusinesses, currentBusiness, switchBusiness, isSuperAdmin } = useTenant();
  
  if (!userBusinesses || userBusinesses.length === 0) {
    return null;
  }
  
  if (userBusinesses.length === 1) {
    // Only one business, just show the name
    return (
      <div className={`px-4 py-2 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-sm font-medium text-gray-900">
          {currentBusiness?.businessName || userBusinesses[0].businessName}
        </p>
        {isSuperAdmin && (
          <span className="text-xs text-purple-600 font-semibold">SUPER ADMIN</span>
        )}
      </div>
    );
  }
  
  return (
    <div className={className}>
      <select
        value={currentBusiness?.id || ''}
        onChange={(e) => switchBusiness(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {userBusinesses.map((business) => (
          <option key={business.businessId} value={business.businessId}>
            {business.businessName}
          </option>
        ))}
      </select>
      {isSuperAdmin && (
        <span className="ml-2 text-xs text-purple-600 font-semibold">SUPER ADMIN</span>
      )}
    </div>
  );
}

/**
 * Hook: Protected Route
 * Use this in your route components to ensure authentication and business access
 */
export function useProtectedRoute() {
  const { user, currentBusiness, loading } = useTenant();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (!currentBusiness) {
        // Redirect to onboarding
        window.location.href = '/onboarding';
        return;
      }
      
      // Check if business is active
      if (currentBusiness.status !== 'active') {
        window.location.href = '/suspended';
        return;
      }
      
      setIsAuthorized(true);
    }
  }, [user, currentBusiness, loading]);
  
  return { isAuthorized, loading };
}

/**
 * HOC: withTenantIsolation
 * Wrap your components to ensure tenant isolation
 */
export function withTenantIsolation(Component) {
  return function WrappedComponent(props) {
    const { isAuthorized, loading } = useProtectedRoute();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!isAuthorized) {
      return null; // Will redirect in useProtectedRoute
    }
    
    return <Component {...props} />;
  };
}

/**
 * Example: Usage in a React component
 */
export function ExampleProductList() {
  const { businessId } = useTenant();
  const products = useScopedCollection('products');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProducts();
  }, [businessId]);
  
  async function loadProducts() {
    try {
      setLoading(true);
      const data = await products.getAll({ status: 'active' });
      setProductList(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function addProduct(productData) {
    try {
      const newProduct = await products.create(productData);
      setProductList([...productList, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
  
  async function updateProduct(productId, updates) {
    try {
      const updated = await products.update(productId, updates);
      setProductList(productList.map(p => p.id === productId ? updated : p));
      return updated;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }
  
  async function deleteProduct(productId) {
    try {
      await products.remove(productId);
      setProductList(productList.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  
  if (loading) {
    return <div>Loading products...</div>;
  }
  
  return (
    <div>
      <h2>Products for Business: {businessId}</h2>
      <ul>
        {productList.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * HOC: Require Feature
 * Wrap components that require specific features
 */
export function requireFeature(feature) {
  return function (Component) {
    return function WrappedComponent(props) {
      return (
        <FeatureGate feature={feature}>
          <Component {...props} />
        </FeatureGate>
      );
    };
  };
}

/**
 * HOC: Require Permission
 * Wrap components that require specific permissions
 */
export function requirePermission(permission) {
  return function (Component) {
    return function WrappedComponent(props) {
      return (
        <PermissionGate permission={permission}>
          <Component {...props} />
        </PermissionGate>
      );
    };
  };
}

/**
 * Utility: Get scoped query
 * For complex queries
 */
export function getScopedQuery(businessId, collectionName) {
  if (!businessId) {
    throw new Error('Business ID is required for scoped query');
  }
  
  return {
    collection: collection(db, 'businesses', businessId, collectionName),
    
    /**
     * Build query with filters
     */
    where(field, operator, value) {
      return query(this.collection, where(field, operator, value));
    },
    
    /**
     * Execute query
     */
    async execute(queryObj = null) {
      const q = queryObj || this.collection;
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        businessId,
        ...doc.data()
      }));
    }
  };
}

// Export everything
export default {
  TenantProvider,
  useTenant,
  useScopedCollection,
  useFeatureAccess,
  usePermission,
  useProtectedRoute,
  FeatureGate,
  PermissionGate,
  BusinessSelector,
  withTenantIsolation,
  requireFeature,
  requirePermission,
  getScopedQuery
};
