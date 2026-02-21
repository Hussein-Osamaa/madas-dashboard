/**
 * Tenant Isolation System
 * Ensures each business only sees their own data
 * Include this in all dashboard pages
 * 
 * IMPORTANT: This file expects Firebase to be already imported in the page
 * Required Firebase imports:
 * - collection, doc, query, where, getDocs, getDoc from firebase/firestore
 */

// Global variable to store current business context
window.currentBusinessId = null;
window.currentBusinessData = null;
window.currentUserRole = null;
window.currentUserPermissions = null;

/**
 * Initialize tenant isolation for the current user
 * Call this after Firebase authentication
 */
async function initializeTenantContext(userId, db) {
    try {
        console.log('🔒 Initializing tenant isolation for user:', userId);

        // Step 1: Find which business(es) this user belongs to
        const businessesRef = collection(db, 'businesses');
        const q = query(businessesRef, where('owner.userId', '==', userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // User is a business owner
            const businessDoc = querySnapshot.docs[0];
            window.currentBusinessId = businessDoc.id;
            window.currentBusinessData = businessDoc.data();
            window.currentUserRole = 'owner';
            
            console.log('✅ Business owner detected:', window.currentBusinessData.businessName);
            console.log('📊 Business ID:', window.currentBusinessId);
            console.log('👤 Role:', window.currentUserRole);
            
            return {
                businessId: window.currentBusinessId,
                businessData: window.currentBusinessData,
                role: window.currentUserRole,
                permissions: {
                    canManageAll: true,
                    canManageStaff: true,
                    canManageBusiness: true,
                    canViewReports: true
                }
            };
        }

        // Step 2: Check if user is staff member in any business
        const allBusinesses = await getDocs(collection(db, 'businesses'));
        
        for (const businessDoc of allBusinesses.docs) {
            const businessId = businessDoc.id;
            const staffRef = doc(db, 'businesses', businessId, 'staff', userId);
            const staffDoc = await getDoc(staffRef);
            
            if (staffDoc.exists()) {
                const staffData = staffDoc.data();
                window.currentBusinessId = businessId;
                window.currentBusinessData = businessDoc.data();
                window.currentUserRole = staffData.role;
                
                console.log('✅ Staff member detected:', window.currentBusinessData.businessName);
                console.log('📊 Business ID:', window.currentBusinessId);
                console.log('👤 Role:', window.currentUserRole);
                
                return {
                    businessId: window.currentBusinessId,
                    businessData: window.currentBusinessData,
                    role: window.currentUserRole,
                    permissions: staffData.permissions || {}
                };
            }
        }

        // User doesn't belong to any business
        console.error('❌ User not associated with any business');
        return null;

    } catch (error) {
        console.error('❌ Error initializing tenant context:', error);
        throw error;
    }
}

/**
 * Get scoped collection reference (filtered by businessId)
 * Use this instead of regular collection() calls
 */
function getScopedCollection(db, collectionName) {
    if (!window.currentBusinessId) {
        throw new Error('Business context not initialized. Call initializeTenantContext() first.');
    }
    
    // Return the scoped subcollection path
    return collection(db, 'businesses', window.currentBusinessId, collectionName);
}

/**
 * Get scoped document reference
 */
function getScopedDoc(db, collectionName, docId) {
    if (!window.currentBusinessId) {
        throw new Error('Business context not initialized. Call initializeTenantContext() first.');
    }
    
    return doc(db, 'businesses', window.currentBusinessId, collectionName, docId);
}

/**
 * Query with automatic businessId filtering
 */
function createScopedQuery(db, collectionName, ...queryConstraints) {
    const scopedCollection = getScopedCollection(db, collectionName);
    return query(scopedCollection, ...queryConstraints);
}

/**
 * Check if user has specific permission
 */
function hasPermission(permissionName) {
    if (window.currentUserRole === 'owner' || window.currentUserRole === 'admin') {
        return true; // Owners and admins have all permissions
    }
    
    // Check specific permission
    // This would be set when initializing tenant context
    return window.currentUserPermissions?.[permissionName] || false;
}

/**
 * Check if feature is enabled for current business
 */
function hasFeature(featureName) {
    if (!window.currentBusinessData) {
        return false;
    }
    
    return window.currentBusinessData.features?.[featureName] || false;
}

/**
 * Get current business info
 */
function getCurrentBusiness() {
    return {
        businessId: window.currentBusinessId,
        businessName: window.currentBusinessData?.businessName,
        plan: window.currentBusinessData?.plan,
        features: window.currentBusinessData?.features,
        role: window.currentUserRole
    };
}

/**
 * Update UI with business context
 */
function updateUIWithBusinessContext() {
    if (!window.currentBusinessData) return;
    
    // Update business name in UI (if element exists)
    const businessNameElement = document.getElementById('business-name');
    if (businessNameElement) {
        businessNameElement.textContent = window.currentBusinessData.businessName;
    }
    
    // Update plan badge (if element exists)
    const planBadgeElement = document.getElementById('plan-badge');
    if (planBadgeElement) {
        const planType = window.currentBusinessData.plan?.type || 'basic';
        planBadgeElement.textContent = planType.charAt(0).toUpperCase() + planType.slice(1);
        planBadgeElement.className = `plan-badge plan-${planType}`;
    }
    
    console.log('✅ UI updated with business context');
}

/**
 * Hide features not available in current plan
 */
function enforceFeatureAccess() {
    // Hide navigation items for disabled features
    const featureElements = document.querySelectorAll('[data-feature]');
    
    featureElements.forEach(element => {
        const featureName = element.dataset.feature;
        if (!hasFeature(featureName)) {
            element.style.display = 'none';
            console.log(`🔒 Feature "${featureName}" hidden (not in plan)`);
        }
    });
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.initializeTenantContext = initializeTenantContext;
    window.getScopedCollection = getScopedCollection;
    window.getScopedDoc = getScopedDoc;
    window.createScopedQuery = createScopedQuery;
    window.hasPermission = hasPermission;
    window.hasFeature = hasFeature;
    window.getCurrentBusiness = getCurrentBusiness;
    window.updateUIWithBusinessContext = updateUIWithBusinessContext;
    window.enforceFeatureAccess = enforceFeatureAccess;
}

console.log('🔒 Tenant isolation system loaded');
