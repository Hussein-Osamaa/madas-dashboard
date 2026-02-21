import { collection, db, doc, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, serverTimestamp } from '../lib/firebase';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useAuth } from './AuthContext';

type Plan = {
  type?: string;
  status?: string;
  currency?: string;
};

export type LinkedBusiness = {
  id: string;
  name: string;
  accessType: 'read' | 'readwrite';
  linkedAt?: Date;
};

export type LinkRequest = {
  id: string;
  fromBusinessId: string;
  fromBusinessName: string;
  toBusinessId: string;
  toBusinessName: string;
  status: 'pending' | 'approved' | 'rejected';
  accessType: 'read' | 'readwrite';
  requestedAt: Date;
  respondedAt?: Date;
};

type BusinessState = {
  loading: boolean;
  noAccess: boolean;
  businessId?: string;
  businessName?: string;
  plan?: Plan;
  role?: string;
  permissions?: Record<string, string[]>;
  userDisplayName?: string;
  userEmail?: string;
  linkedBusinesses?: LinkedBusiness[];
  currentViewingBusinessId?: string;
  currentViewingBusinessName?: string;
  incomingLinkRequests?: LinkRequest[];
  outgoingLinkRequests?: LinkRequest[];
};

export type BusinessContextValue = BusinessState & {
  refresh: () => Promise<void>;
  // Permission checking functions
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
  hasAllPermissions: (permissionKeys: string[]) => boolean;
  // Get all permissions as flat array
  getAllPermissions: () => string[];
  // Linked businesses functions
  addLinkedBusiness: (businessIdToLink: string, accessType: 'read' | 'readwrite') => Promise<boolean>;
  removeLinkedBusiness: (businessIdToRemove: string) => Promise<boolean>;
  setCurrentViewingBusiness: (businessId: string | null) => void;
  isViewingOtherBusiness: () => boolean;
  getEffectiveBusinessId: () => string | undefined;
  // Link request functions
  sendLinkRequest: (targetBusinessId: string, accessType: 'read' | 'readwrite') => Promise<{ success: boolean; message: string }>;
  approveLinkRequest: (requestId: string) => Promise<boolean>;
  rejectLinkRequest: (requestId: string) => Promise<boolean>;
  cancelLinkRequest: (requestId: string) => Promise<boolean>;
  refreshLinkRequests: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const OWNER_PERMISSIONS: Record<string, string[]> = {
  home: ['view'],
  orders: ['view', 'search', 'create', 'edit'],
  inventory: ['view', 'edit'],
  customers: ['view', 'edit'],
  employees: ['view', 'edit'],
  finance: ['view', 'reports'],
  analytics: ['view', 'export'],
  settings: ['view', 'edit'],
  admin: ['view', 'manage_all_businesses']
};

const STORAGE_KEY = 'digixUser';

const BusinessProvider = ({ children }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<BusinessState>({
    loading: true,
    noAccess: false,
    linkedBusinesses: [],
    currentViewingBusinessId: undefined,
    currentViewingBusinessName: undefined,
    incomingLinkRequests: [],
    outgoingLinkRequests: []
  });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const storeUserData = useCallback((payload: Record<string, unknown>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[BusinessProvider] Failed to persist user data', error);
    }
  }, []);

  // Try to restore from cache on initial load
  const getCachedUserData = useCallback(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[BusinessProvider] Failed to read cached user data', error);
    }
    return null;
  }, []);

  // Helper function to delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const resolveBusiness = useCallback(async (isRetry = false) => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    if (!user) {
      setState({ loading: false, noAccess: false });
      return;
    }

    // Check for support mode first
    const supportMode = sessionStorage.getItem('supportMode') === 'true';
    const supportBusinessId = sessionStorage.getItem('supportBusinessId');
    const supportBusinessName = sessionStorage.getItem('supportBusinessName');
    const urlParams = new URLSearchParams(window.location.search);
    const urlSupport = urlParams.get('support') === 'true';
    const urlBusiness = urlParams.get('business');

    if (supportMode || urlSupport) {
      const businessId = supportBusinessId || urlBusiness;
      if (businessId) {
        try {
          // Load business data for support mode
          const businessDocRef = doc(db, 'businesses', businessId);
          const businessDoc = await getDoc(businessDocRef);
          
          if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            setState({
              loading: false,
              noAccess: false,
              businessId: businessId,
              businessName: supportBusinessName || businessData.businessName || businessData.name || 'Unknown Business',
              plan: businessData.plan,
              role: 'owner', // Support staff gets owner-level access
              permissions: OWNER_PERMISSIONS, // Full permissions in support mode
              userDisplayName: sessionStorage.getItem('supportAdminName') || 'Support Staff',
              userEmail: sessionStorage.getItem('supportAdminEmail') || user.email || ''
            });
            return;
          }
        } catch (error) {
          console.error('[BusinessProvider] Error loading business in support mode:', error);
        }
      }
    }

    // On initial load, try to use cached data first for faster rendering
    if (!isRetry && retryCount === 0) {
      const cached = getCachedUserData();
      if (cached && cached.businessId && cached.email === user.email) {
        console.log('[BusinessProvider] Using cached business data');
        setState({
          loading: false, // Show UI immediately with cached data
          noAccess: false,
          businessId: cached.businessId,
          businessName: cached.businessName,
          role: cached.role,
          permissions: cached.permissions,
          userDisplayName: cached.displayName,
          userEmail: cached.email
        });
        // Continue to verify in background (don't await)
      }
    }

    setState((prev) => ({ ...prev, loading: prev.businessId ? false : true }));

    try {
      const businessesCol = collection(db, 'businesses');
      let matchedBusiness: Awaited<ReturnType<typeof getDocs>>['docs'][number] | null = null;
      let role = 'owner';
      let permissions: Record<string, string[]> | undefined = OWNER_PERMISSIONS;
      let staffName: string | undefined = undefined;

      // First, check if the user has a profile with businessId (staff members)
      const userProfileRef = doc(db, 'users', user.uid);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (userProfileDoc.exists()) {
        const userProfile = userProfileDoc.data();
        if (userProfile.businessId) {
          // User is staff - get their business directly
          const businessRef = doc(db, 'businesses', userProfile.businessId);
          const businessDoc = await getDoc(businessRef);
          
          if (businessDoc.exists()) {
            matchedBusiness = businessDoc as any;
            
            // Get staff record for permissions (may be missing for linked owners - migrated staff use Firebase uid)
            const staffDocRef = doc(db, 'businesses', userProfile.businessId, 'staff', user.uid);
            let staffDoc: Awaited<ReturnType<typeof getDoc>>;
            try {
              staffDoc = await getDoc(staffDocRef);
            } catch {
              staffDoc = { exists: () => false, id: '', data: () => ({}) };
            }
            if (staffDoc.exists()) {
              const staffData = staffDoc.data();
              role = (staffData?.role as string) ?? 'staff';
              
              // Get staff display name if available
              staffName = staffData?.name || staffData?.firstName 
                ? `${staffData?.firstName || ''} ${staffData?.lastName || ''}`.trim() 
                : staffData?.name || undefined;
              
              // Handle permissions - can be array or object format
              let staffPermissions = staffData?.permissions;
              if (!staffPermissions) {
                permissions = { home: ['view'] };
              } else if (Array.isArray(staffPermissions)) {
                const permObj: Record<string, string[]> = {};
                staffPermissions.forEach((permKey: string) => {
                  if (typeof permKey === 'string' && permKey.includes('_')) {
                    const [section, action] = permKey.split('_');
                    if (section && action) {
                      if (!permObj[section]) {
                        permObj[section] = [];
                      }
                      permObj[section].push(action);
                    }
                  }
                });
                permissions = Object.keys(permObj).length > 0 ? permObj : { home: ['view'] };
              } else if (typeof staffPermissions === 'object') {
                permissions = staffPermissions as Record<string, string[]>;
              } else {
                permissions = { home: ['view'] };
              }
            }
          }
        }
      }
      
      // If not found via user profile, check if user is an owner
      if (!matchedBusiness) {
        const ownerQuery = query(businessesCol, where('owner.userId', '==', user.uid));
        const ownerSnapshot = await getDocs(ownerQuery);

        if (!ownerSnapshot.empty) {
          matchedBusiness = ownerSnapshot.docs[0];
        }
      }

      if (!matchedBusiness) {
        // Reset retry count on successful resolution (even if no business found)
        setRetryCount(0);
        
        // Check if we have cached data - if so, don't immediately redirect to no-access
        const cached = getCachedUserData();
        if (cached && cached.businessId && cached.email === user.email) {
          console.log('[BusinessProvider] No business found in DB, but using cached data');
          // Keep using cached data - the user may have been removed but let them see the UI
          // They'll get proper access errors when they try to do things
          setState({
            loading: false,
            noAccess: false,
            businessId: cached.businessId,
            businessName: cached.businessName,
            role: cached.role,
            permissions: cached.permissions,
            userDisplayName: cached.displayName,
            userEmail: cached.email
          });
          return;
        }
        
        setState({ loading: false, noAccess: true });
        return;
      }
      
      // Reset retry count on success
      setRetryCount(0);

      const businessData = matchedBusiness.data() as Record<string, unknown>;
      const businessId = matchedBusiness.id;
      
      // Check if business has dashboard access enabled
      const systemAccess = (businessData?.systemAccess as { dashboard?: boolean; finance?: boolean } | undefined) ?? { dashboard: true, finance: true };
      if (systemAccess.dashboard === false) {
        console.warn('[BusinessProvider] Dashboard access is disabled for this business');
        setState({ loading: false, noAccess: true });
        return;
      }
      
      const businessName =
        (businessData?.businessName as string | undefined) ??
        (businessData?.name as string | undefined) ??
        'DIGIX Business';

      // Load plan and merge currency from business document
      const basePlan = (businessData?.plan as Plan | undefined) ?? { type: 'basic', status: 'active' };
      // Currency can be stored in businessData.currency or plan.currency
      const currency = (businessData?.currency as string | undefined) 
        || (basePlan?.currency as string | undefined) 
        || 'USD';
      const plan: Plan = {
        ...basePlan,
        currency: currency
      };

      // Get display name - prioritize staff name if available, then owner name, then user displayName
      let displayName: string;
      if (role !== 'owner' && staffName) {
        displayName = staffName;
      } else {
        displayName =
          user.displayName ||
          (businessData?.owner as { name?: string } | undefined)?.name ||
          user.email?.split('@')[0] ||
          'User';
      }

      // Load linked businesses
      let linkedBusinesses: LinkedBusiness[] = [];
      const linkedBusinessIds = (businessData?.linkedBusinesses as string[] | undefined) ?? [];
      
      if (linkedBusinessIds.length > 0) {
        const linkedPromises: Array<Promise<LinkedBusiness | null>> = linkedBusinessIds.map(
          async (linkedId): Promise<LinkedBusiness | null> => {
          try {
            const linkedDocRef = doc(db, 'businesses', linkedId);
            const linkedDoc = await getDoc(linkedDocRef);
            if (linkedDoc.exists()) {
              const linkedData = linkedDoc.data();
              return {
                id: linkedId,
                name: (linkedData?.businessName as string) || (linkedData?.name as string) || 'Unknown Business',
                accessType: 'read',
                linkedAt: linkedData?.linkedAt?.toDate?.() || new Date()
              } satisfies LinkedBusiness;
            }
          } catch (error) {
            console.warn(`[BusinessProvider] Failed to load linked business ${linkedId}:`, error);
          }
          return null;
        });
        
        const results = await Promise.all(linkedPromises);
        linkedBusinesses = results.filter((b): b is LinkedBusiness => b !== null);
      }

      const payload = {
        email: user.email,
        displayName,
        role,
        approved: true,
        permissions,
        businessId,
        businessName,
        linkedBusinesses
      };

      storeUserData(payload);

      setState({
        loading: false,
        noAccess: false,
        businessId,
        businessName,
        plan,
        role,
        permissions,
        userDisplayName: displayName,
        userEmail: user.email ?? undefined,
        linkedBusinesses,
        currentViewingBusinessId: undefined,
        currentViewingBusinessName: undefined,
        incomingLinkRequests: [],
        outgoingLinkRequests: []
      });
    } catch (error) {
      console.error('[BusinessProvider] Failed to resolve business context', error);
      
      // Retry on network errors (including QUIC errors)
      if (retryCount < MAX_RETRIES) {
        console.log(`[BusinessProvider] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        await delay(1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        return resolveBusiness(true);
      }
      
      // After all retries failed, try to use cached data as fallback
      const cached = getCachedUserData();
      if (cached && cached.businessId && user && cached.email === user.email) {
        console.log('[BusinessProvider] Using cached data after network error');
        setState({
          loading: false,
          noAccess: false,
          businessId: cached.businessId,
          businessName: cached.businessName,
          role: cached.role,
          permissions: cached.permissions,
          userDisplayName: cached.displayName,
          userEmail: cached.email
        });
        return;
      }
      
      setState({ loading: false, noAccess: true });
    }
  }, [storeUserData, user, retryCount, authLoading, getCachedUserData]);

  useEffect(() => {
    void resolveBusiness();
  }, [resolveBusiness]);

  // Convert permissions object to flat array of permission keys
  // Matches the old HTML page logic: { orders: ['view', 'create'] } -> ['order_view', 'order_create']
  // This matches the format used in staff-settings.html lines 1581-1585 and 1673-1677
  const getAllPermissions = useCallback((): string[] => {
    if (!state.permissions) return [];
    if (state.role === 'owner') {
      // Owners have all permissions
      return ['*']; // Special marker for "all permissions"
    }
    
    const allPerms: string[] = [];
    Object.entries(state.permissions).forEach(([section, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach((action) => {
          // Convert to permission key format: section_action
          // This matches the old system: `${section}_${action}`
          const permKey = `${section}_${action}`;
          allPerms.push(permKey);
        });
      }
    });
    return allPerms;
  }, [state.permissions, state.role]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionKey: string): boolean => {
    // Owners have all permissions
    if (state.role === 'owner') return true;
    
    const allPerms = getAllPermissions();
    // Check if '*' (all permissions) or specific permission exists
    return allPerms.includes('*') || allPerms.includes(permissionKey);
  }, [state.role, getAllPermissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    if (state.role === 'owner') return true;
    if (permissionKeys.length === 0) return true;
    
    const allPerms = getAllPermissions();
    if (allPerms.includes('*')) return true;
    
    return permissionKeys.some((key) => allPerms.includes(key));
  }, [state.role, getAllPermissions]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((permissionKeys: string[]): boolean => {
    if (state.role === 'owner') return true;
    if (permissionKeys.length === 0) return true;
    
    const allPerms = getAllPermissions();
    if (allPerms.includes('*')) return true;
    
    return permissionKeys.every((key) => allPerms.includes(key));
  }, [state.role, getAllPermissions]);

  // Add a linked business
  const addLinkedBusiness = useCallback(async (businessIdToLink: string, accessType: 'read' | 'readwrite' = 'read'): Promise<boolean> => {
    if (!state.businessId || !businessIdToLink) return false;
    
    // Can't link to self
    if (businessIdToLink === state.businessId) {
      console.warn('[BusinessProvider] Cannot link business to itself');
      return false;
    }
    
    // Check if already linked
    if (state.linkedBusinesses?.some(b => b.id === businessIdToLink)) {
      console.warn('[BusinessProvider] Business already linked');
      return false;
    }
    
    try {
      // Verify the business exists
      const businessToLinkRef = doc(db, 'businesses', businessIdToLink);
      const businessToLinkDoc = await getDoc(businessToLinkRef);
      
      if (!businessToLinkDoc.exists()) {
        console.error('[BusinessProvider] Business to link does not exist');
        return false;
      }
      
      const linkedBusinessData = businessToLinkDoc.data();
      const linkedBusinessName = (linkedBusinessData?.businessName as string) || (linkedBusinessData?.name as string) || 'Unknown Business';
      
      // Update current business document with linked business ID
      const currentBusinessRef = doc(db, 'businesses', state.businessId);
      await updateDoc(currentBusinessRef, {
        linkedBusinesses: arrayUnion(businessIdToLink)
      });
      
      // Update local state
      const newLinkedBusiness: LinkedBusiness = {
        id: businessIdToLink,
        name: linkedBusinessName,
        accessType,
        linkedAt: new Date()
      };
      
      setState(prev => ({
        ...prev,
        linkedBusinesses: [...(prev.linkedBusinesses || []), newLinkedBusiness]
      }));
      
      return true;
    } catch (error) {
      console.error('[BusinessProvider] Failed to add linked business:', error);
      return false;
    }
  }, [state.businessId, state.linkedBusinesses]);

  // Remove a linked business
  const removeLinkedBusiness = useCallback(async (businessIdToRemove: string): Promise<boolean> => {
    if (!state.businessId || !businessIdToRemove) return false;
    
    try {
      // Update current business document
      const currentBusinessRef = doc(db, 'businesses', state.businessId);
      await updateDoc(currentBusinessRef, {
        linkedBusinesses: arrayRemove(businessIdToRemove)
      });
      
      // Update local state
      setState(prev => ({
        ...prev,
        linkedBusinesses: (prev.linkedBusinesses || []).filter(b => b.id !== businessIdToRemove),
        // Reset viewing if removing the currently viewed business
        currentViewingBusinessId: prev.currentViewingBusinessId === businessIdToRemove ? undefined : prev.currentViewingBusinessId,
        currentViewingBusinessName: prev.currentViewingBusinessId === businessIdToRemove ? undefined : prev.currentViewingBusinessName
      }));
      
      return true;
    } catch (error) {
      console.error('[BusinessProvider] Failed to remove linked business:', error);
      return false;
    }
  }, [state.businessId]);

  // Set which business inventory to view
  const setCurrentViewingBusiness = useCallback((businessId: string | null) => {
    if (!businessId) {
      // Reset to own business
      setState(prev => ({
        ...prev,
        currentViewingBusinessId: undefined,
        currentViewingBusinessName: undefined
      }));
      return;
    }
    
    // Check if it's a linked business
    const linkedBiz = state.linkedBusinesses?.find(b => b.id === businessId);
    if (linkedBiz) {
      setState(prev => ({
        ...prev,
        currentViewingBusinessId: businessId,
        currentViewingBusinessName: linkedBiz.name
      }));
    }
  }, [state.linkedBusinesses]);

  // Check if currently viewing another business's inventory
  const isViewingOtherBusiness = useCallback((): boolean => {
    return !!state.currentViewingBusinessId && state.currentViewingBusinessId !== state.businessId;
  }, [state.currentViewingBusinessId, state.businessId]);

  // Get the effective business ID for inventory operations
  const getEffectiveBusinessId = useCallback((): string | undefined => {
    return state.currentViewingBusinessId || state.businessId;
  }, [state.currentViewingBusinessId, state.businessId]);

  // Refresh link requests from Firestore
  const refreshLinkRequests = useCallback(async () => {
    if (!state.businessId) return;
    
    try {
      // Fetch incoming requests (requests TO this business)
      const incomingQuery = query(
        collection(db, 'linkRequests'),
        where('toBusinessId', '==', state.businessId),
        where('status', '==', 'pending')
      );
      const incomingSnapshot = await getDocs(incomingQuery);
      const incomingRequests: LinkRequest[] = incomingSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          fromBusinessId: data.fromBusinessId,
          fromBusinessName: data.fromBusinessName,
          toBusinessId: data.toBusinessId,
          toBusinessName: data.toBusinessName,
          status: data.status,
          accessType: data.accessType || 'read',
          requestedAt: data.requestedAt?.toDate?.() || new Date(),
          respondedAt: data.respondedAt?.toDate?.()
        };
      });
      
      // Fetch outgoing requests (requests FROM this business)
      const outgoingQuery = query(
        collection(db, 'linkRequests'),
        where('fromBusinessId', '==', state.businessId),
        where('status', '==', 'pending')
      );
      const outgoingSnapshot = await getDocs(outgoingQuery);
      const outgoingRequests: LinkRequest[] = outgoingSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          fromBusinessId: data.fromBusinessId,
          fromBusinessName: data.fromBusinessName,
          toBusinessId: data.toBusinessId,
          toBusinessName: data.toBusinessName,
          status: data.status,
          accessType: data.accessType || 'read',
          requestedAt: data.requestedAt?.toDate?.() || new Date(),
          respondedAt: data.respondedAt?.toDate?.()
        };
      });
      
      setState(prev => ({
        ...prev,
        incomingLinkRequests: incomingRequests,
        outgoingLinkRequests: outgoingRequests
      }));
    } catch (error) {
      console.error('[BusinessProvider] Failed to refresh link requests:', error);
    }
  }, [state.businessId]);

  // Send a link request to another business
  const sendLinkRequest = useCallback(async (
    targetBusinessId: string, 
    accessType: 'read' | 'readwrite' = 'read'
  ): Promise<{ success: boolean; message: string }> => {
    if (!state.businessId || !state.businessName) {
      return { success: false, message: 'Business not loaded' };
    }
    
    if (targetBusinessId === state.businessId) {
      return { success: false, message: 'Cannot link to your own business' };
    }
    
    // Check if already linked
    if (state.linkedBusinesses?.some(b => b.id === targetBusinessId)) {
      return { success: false, message: 'Business is already linked' };
    }
    
    // Check if request already pending
    if (state.outgoingLinkRequests?.some(r => r.toBusinessId === targetBusinessId)) {
      return { success: false, message: 'A request is already pending for this business' };
    }
    
    try {
      // Verify the target business exists
      const targetBusinessRef = doc(db, 'businesses', targetBusinessId);
      const targetBusinessDoc = await getDoc(targetBusinessRef);
      
      if (!targetBusinessDoc.exists()) {
        return { success: false, message: 'Business not found. Please check the Business ID.' };
      }
      
      const targetBusinessData = targetBusinessDoc.data();
      const targetBusinessName = (targetBusinessData?.businessName as string) || (targetBusinessData?.name as string) || 'Unknown Business';
      
      // Create the link request
      const requestData = {
        fromBusinessId: state.businessId,
        fromBusinessName: state.businessName,
        toBusinessId: targetBusinessId,
        toBusinessName: targetBusinessName,
        status: 'pending',
        accessType,
        requestedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'linkRequests'), requestData);
      
      // Refresh requests to update local state
      await refreshLinkRequests();
      
      return { success: true, message: `Link request sent to ${targetBusinessName}` };
    } catch (error) {
      console.error('[BusinessProvider] Failed to send link request:', error);
      return { success: false, message: 'Failed to send request. Please try again.' };
    }
  }, [state.businessId, state.businessName, state.linkedBusinesses, state.outgoingLinkRequests, refreshLinkRequests]);

  // Approve a link request
  const approveLinkRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!state.businessId) return false;
    
    try {
      // Get the request
      const requestRef = doc(db, 'linkRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        console.error('[BusinessProvider] Link request not found');
        return false;
      }
      
      const requestData = requestDoc.data();
      
      // Verify this request is for us
      if (requestData.toBusinessId !== state.businessId) {
        console.error('[BusinessProvider] Link request is not for this business');
        return false;
      }
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'approved',
        respondedAt: serverTimestamp()
      });
      
      // Add the link to the requesting business (they get access to our inventory)
      const fromBusinessRef = doc(db, 'businesses', requestData.fromBusinessId);
      await updateDoc(fromBusinessRef, {
        linkedBusinesses: arrayUnion(state.businessId)
      });
      
      // Refresh requests
      await refreshLinkRequests();
      
      return true;
    } catch (error) {
      console.error('[BusinessProvider] Failed to approve link request:', error);
      return false;
    }
  }, [state.businessId, refreshLinkRequests]);

  // Reject a link request
  const rejectLinkRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!state.businessId) return false;
    
    try {
      const requestRef = doc(db, 'linkRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        console.error('[BusinessProvider] Link request not found');
        return false;
      }
      
      const requestData = requestDoc.data();
      
      // Verify this request is for us
      if (requestData.toBusinessId !== state.businessId) {
        console.error('[BusinessProvider] Link request is not for this business');
        return false;
      }
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'rejected',
        respondedAt: serverTimestamp()
      });
      
      // Refresh requests
      await refreshLinkRequests();
      
      return true;
    } catch (error) {
      console.error('[BusinessProvider] Failed to reject link request:', error);
      return false;
    }
  }, [state.businessId, refreshLinkRequests]);

  // Cancel an outgoing link request
  const cancelLinkRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!state.businessId) return false;
    
    try {
      const requestRef = doc(db, 'linkRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        console.error('[BusinessProvider] Link request not found');
        return false;
      }
      
      const requestData = requestDoc.data();
      
      // Verify this request is from us
      if (requestData.fromBusinessId !== state.businessId) {
        console.error('[BusinessProvider] Link request is not from this business');
        return false;
      }
      
      // Delete the request
      await deleteDoc(requestRef);
      
      // Refresh requests
      await refreshLinkRequests();
      
      return true;
    } catch (error) {
      console.error('[BusinessProvider] Failed to cancel link request:', error);
      return false;
    }
  }, [state.businessId, refreshLinkRequests]);

  // Load link requests when businessId changes
  useEffect(() => {
    if (state.businessId && !state.loading) {
      refreshLinkRequests();
    }
  }, [state.businessId, state.loading, refreshLinkRequests]);

  const value = useMemo<BusinessContextValue>(
    () => ({
      ...state,
      refresh: resolveBusiness,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getAllPermissions,
      addLinkedBusiness,
      removeLinkedBusiness,
      setCurrentViewingBusiness,
      isViewingOtherBusiness,
      getEffectiveBusinessId,
      sendLinkRequest,
      approveLinkRequest,
      rejectLinkRequest,
      cancelLinkRequest,
      refreshLinkRequests
    }),
    [state, resolveBusiness, hasPermission, hasAnyPermission, hasAllPermissions, getAllPermissions, addLinkedBusiness, removeLinkedBusiness, setCurrentViewingBusiness, isViewingOtherBusiness, getEffectiveBusinessId, sendLinkRequest, approveLinkRequest, rejectLinkRequest, cancelLinkRequest, refreshLinkRequests]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within BusinessProvider');
  }
  return context;
};

export default BusinessProvider;
