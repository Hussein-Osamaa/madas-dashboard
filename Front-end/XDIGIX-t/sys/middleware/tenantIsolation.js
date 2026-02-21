/**
 * TENANT ISOLATION MIDDLEWARE
 * Ensures complete data separation between businesses in multi-tenant system
 * 
 * Features:
 * - Extracts businessId from user session
 * - Automatically scopes all queries to current business
 * - Prevents cross-business data access
 * - Allows super_admin bypass
 * - Audit logging for security
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (do this once in your main app file)
// admin.initializeApp();

const db = admin.firestore();

/**
 * Extract business ID from authenticated user
 */
async function extractBusinessId(req) {
  const userId = req.user?.userId;
  
  if (!userId) {
    throw new Error('User ID not found in request');
  }
  
  // Check if business ID is in request (from body, query, or params)
  let businessId = req.body?.businessId || 
                   req.query?.businessId || 
                   req.params?.businessId;
  
  if (!businessId) {
    // Get user's current business from user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User document not found');
    }
    
    const userData = userDoc.data();
    businessId = userData.currentBusinessId;
    
    if (!businessId) {
      throw new Error('No business context available for user');
    }
  }
  
  return businessId;
}

/**
 * Verify user has access to the requested business
 */
async function verifyBusinessAccess(userId, businessId, isSuperAdmin) {
  // Super admin can access all businesses
  if (isSuperAdmin) {
    return true;
  }
  
  // Check if user is staff member of this business
  const staffDoc = await db
    .collection('businesses')
    .doc(businessId)
    .collection('staff')
    .doc(userId)
    .get();
  
  if (!staffDoc.exists) {
    throw new Error('User does not have access to this business');
  }
  
  // Check if staff is active
  const staffData = staffDoc.data();
  if (staffData.employment?.status !== 'active') {
    throw new Error('Staff account is not active');
  }
  
  return true;
}

/**
 * Check if user is super admin
 */
async function isSuperAdmin(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return false;
  }
  
  const userData = userDoc.data();
  return userData.platformRole === 'super_admin';
}

/**
 * Main Tenant Isolation Middleware
 * USE THIS IN YOUR EXPRESS ROUTES
 */
async function tenantIsolation(req, res, next) {
  try {
    // Extract user ID from Firebase Auth token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No authentication token provided' 
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Check if user is super admin
    const isSuperAdminUser = await isSuperAdmin(userId);
    
    // Extract business ID from request
    let businessId;
    try {
      businessId = await extractBusinessId({ ...req, user: { userId } });
    } catch (error) {
      if (!isSuperAdminUser) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: error.message 
        });
      }
      // Super admin doesn't need business context for some routes
      businessId = null;
    }
    
    // Verify access (skip for super admin or if no businessId needed)
    if (businessId && !isSuperAdminUser) {
      try {
        await verifyBusinessAccess(userId, businessId, isSuperAdminUser);
      } catch (error) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: error.message 
        });
      }
    }
    
    // Check if business is active
    if (businessId && !isSuperAdminUser) {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      
      if (!businessDoc.exists) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Business not found' 
        });
      }
      
      const businessData = businessDoc.data();
      
      if (businessData.status !== 'active') {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `Business account is ${businessData.status}`,
          status: businessData.status,
          suspensionReason: businessData.suspensionReason || null
        });
      }
      
      // Check subscription status
      if (businessData.plan?.status === 'expired') {
        return res.status(402).json({ 
          error: 'Payment Required',
          message: 'Business subscription has expired'
        });
      }
    }
    
    // Get staff permissions if not super admin
    let permissions = null;
    if (businessId && !isSuperAdminUser) {
      const staffDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('staff')
        .doc(userId)
        .get();
      
      if (staffDoc.exists) {
        permissions = staffDoc.data().permissions;
      }
    }
    
    // Attach context to request
    req.tenant = {
      userId,
      businessId,
      isSuperAdmin: isSuperAdminUser,
      permissions,
      // Helper function for scoped queries
      scopedCollection: (collectionName) => {
        if (!businessId) {
          throw new Error('Cannot create scoped collection without business context');
        }
        return db.collection('businesses').doc(businessId).collection(collectionName);
      },
      // Helper to get business document
      getBusinessDoc: async () => {
        if (!businessId) {
          return null;
        }
        const doc = await db.collection('businesses').doc(businessId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      }
    };
    
    // Log access for audit trail
    if (process.env.NODE_ENV === 'production') {
      logAccess(req, userId, businessId, isSuperAdminUser);
    }
    
    next();
  } catch (error) {
    console.error('Tenant isolation middleware error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication token expired' 
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid authentication token' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Authentication failed' 
    });
  }
}

/**
 * Permission Check Middleware
 * USE THIS TO REQUIRE SPECIFIC PERMISSIONS
 * 
 * Example: requirePermission('canCreateProducts')
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Super admin has all permissions
    if (req.tenant?.isSuperAdmin) {
      return next();
    }
    
    // Check if user has the required permission
    if (!req.tenant?.permissions?.[permission]) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Permission required: ${permission}`,
        userPermissions: req.tenant?.permissions || {}
      });
    }
    
    next();
  };
}

/**
 * Feature Gate Middleware
 * USE THIS TO REQUIRE PLAN FEATURES
 * 
 * Example: requireFeature('gamification')
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    // Super admin bypasses feature checks
    if (req.tenant?.isSuperAdmin) {
      return next();
    }
    
    const businessId = req.tenant?.businessId;
    
    if (!businessId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Business context required' 
      });
    }
    
    try {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      
      if (!businessDoc.exists) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Business not found' 
        });
      }
      
      const businessData = businessDoc.data();
      
      // Check if feature is enabled for this business
      if (!businessData.features?.[feature]) {
        return res.status(403).json({ 
          error: 'Feature Not Available',
          message: `The "${feature}" feature is not available in your plan`,
          currentPlan: businessData.plan?.type,
          upgradeRequired: true
        });
      }
      
      next();
    } catch (error) {
      console.error('Feature gate error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify feature access' 
      });
    }
  };
}

/**
 * Log access for audit trail
 */
async function logAccess(req, userId, businessId, isSuperAdmin) {
  try {
    await db.collection('access-logs').add({
      userId,
      businessId,
      isSuperAdmin,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging access:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * Usage Limit Middleware
 * Check if business has reached usage limits
 * 
 * Example: checkUsageLimit('products', 'maxProducts')
 */
function checkUsageLimit(usageField, limitField) {
  return async (req, res, next) => {
    // Super admin bypasses limits
    if (req.tenant?.isSuperAdmin) {
      return next();
    }
    
    const businessId = req.tenant?.businessId;
    
    if (!businessId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Business context required' 
      });
    }
    
    try {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      
      if (!businessDoc.exists) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Business not found' 
        });
      }
      
      const businessData = businessDoc.data();
      const currentUsage = businessData.usage?.[usageField] || 0;
      const maxLimit = businessData.limits?.[limitField];
      
      // -1 means unlimited
      if (maxLimit === -1) {
        return next();
      }
      
      if (currentUsage >= maxLimit) {
        return res.status(403).json({ 
          error: 'Usage Limit Exceeded',
          message: `You have reached your ${usageField} limit`,
          current: currentUsage,
          limit: maxLimit,
          upgradeRequired: true
        });
      }
      
      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to check usage limits' 
      });
    }
  };
}

/**
 * Helper: Get scoped collection reference
 * This ensures all queries are scoped to the current business
 */
function getScopedCollection(businessId, collectionName) {
  if (!businessId) {
    throw new Error('Business ID is required for scoped collection');
  }
  
  return db.collection('businesses').doc(businessId).collection(collectionName);
}

/**
 * Helper: Query builder with automatic business scoping
 */
class ScopedQueryBuilder {
  constructor(businessId, collectionName) {
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    
    this.businessId = businessId;
    this.collectionRef = db.collection('businesses').doc(businessId).collection(collectionName);
    this.queryRef = this.collectionRef;
  }
  
  where(field, operator, value) {
    this.queryRef = this.queryRef.where(field, operator, value);
    return this;
  }
  
  orderBy(field, direction = 'asc') {
    this.queryRef = this.queryRef.orderBy(field, direction);
    return this;
  }
  
  limit(count) {
    this.queryRef = this.queryRef.limit(count);
    return this;
  }
  
  startAfter(snapshot) {
    this.queryRef = this.queryRef.startAfter(snapshot);
    return this;
  }
  
  async get() {
    const snapshot = await this.queryRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      businessId: this.businessId, // Always include businessId
      ...doc.data()
    }));
  }
  
  async getOne() {
    const docs = await this.get();
    return docs.length > 0 ? docs[0] : null;
  }
  
  /**
   * Real-time listener with automatic business scoping
   */
  onSnapshot(callback, errorCallback) {
    return this.queryRef.onSnapshot(
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          businessId: this.businessId,
          ...doc.data()
        }));
        callback(docs);
      },
      errorCallback
    );
  }
}

/**
 * Helper: Create scoped query builder
 */
function scopedQuery(businessId, collectionName) {
  return new ScopedQueryBuilder(businessId, collectionName);
}

/**
 * Helper: Add document to business collection
 */
async function addBusinessDocument(businessId, collectionName, data, userId) {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  
  const collectionRef = db.collection('businesses').doc(businessId).collection(collectionName);
  const docRef = collectionRef.doc();
  
  const documentData = {
    ...data,
    businessId, // Always set businessId
    metadata: {
      ...data.metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  };
  
  await docRef.set(documentData);
  
  return {
    id: docRef.id,
    ...documentData
  };
}

/**
 * Helper: Update document in business collection
 */
async function updateBusinessDocument(businessId, collectionName, documentId, updates, userId) {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  
  const docRef = db
    .collection('businesses')
    .doc(businessId)
    .collection(collectionName)
    .doc(documentId);
  
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error('Document not found');
  }
  
  // Verify document belongs to this business (extra safety check)
  const docData = doc.data();
  if (docData.businessId && docData.businessId !== businessId) {
    throw new Error('Unauthorized: Document belongs to different business');
  }
  
  const updateData = {
    ...updates,
    'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    'metadata.updatedBy': userId
  };
  
  await docRef.update(updateData);
  
  return {
    id: documentId,
    ...docData,
    ...updateData
  };
}

/**
 * Helper: Delete document from business collection
 */
async function deleteBusinessDocument(businessId, collectionName, documentId) {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  
  const docRef = db
    .collection('businesses')
    .doc(businessId)
    .collection(collectionName)
    .doc(documentId);
  
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error('Document not found');
  }
  
  // Verify document belongs to this business
  const docData = doc.data();
  if (docData.businessId && docData.businessId !== businessId) {
    throw new Error('Unauthorized: Document belongs to different business');
  }
  
  await docRef.delete();
  
  return { success: true, id: documentId };
}

/**
 * Helper: Get single document from business collection
 */
async function getBusinessDocument(businessId, collectionName, documentId) {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  
  const docRef = db
    .collection('businesses')
    .doc(businessId)
    .collection(collectionName)
    .doc(documentId);
  
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data();
  
  // Verify document belongs to this business
  if (data.businessId && data.businessId !== businessId) {
    throw new Error('Unauthorized: Document belongs to different business');
  }
  
  return {
    id: doc.id,
    ...data
  };
}

/**
 * Batch operations with tenant isolation
 */
class ScopedBatch {
  constructor(businessId) {
    if (!businessId) {
      throw new Error('Business ID is required for scoped batch');
    }
    
    this.businessId = businessId;
    this.batch = db.batch();
    this.operations = [];
  }
  
  set(collectionName, documentId, data) {
    const docRef = db
      .collection('businesses')
      .doc(this.businessId)
      .collection(collectionName)
      .doc(documentId);
    
    this.batch.set(docRef, {
      ...data,
      businessId: this.businessId
    });
    
    this.operations.push({ type: 'set', collection: collectionName, id: documentId });
    return this;
  }
  
  update(collectionName, documentId, data) {
    const docRef = db
      .collection('businesses')
      .doc(this.businessId)
      .collection(collectionName)
      .doc(documentId);
    
    this.batch.update(docRef, data);
    
    this.operations.push({ type: 'update', collection: collectionName, id: documentId });
    return this;
  }
  
  delete(collectionName, documentId) {
    const docRef = db
      .collection('businesses')
      .doc(this.businessId)
      .collection(collectionName)
      .doc(documentId);
    
    this.batch.delete(docRef);
    
    this.operations.push({ type: 'delete', collection: collectionName, id: documentId });
    return this;
  }
  
  async commit() {
    try {
      await this.batch.commit();
      return {
        success: true,
        operations: this.operations.length,
        details: this.operations
      };
    } catch (error) {
      console.error('Batch commit error:', error);
      throw error;
    }
  }
}

/**
 * Create scoped batch for business
 */
function createScopedBatch(businessId) {
  return new ScopedBatch(businessId);
}

// Export middleware and helpers
module.exports = {
  // Main middleware
  tenantIsolation,
  requirePermission,
  requireFeature,
  checkUsageLimit,
  
  // Helper functions
  getScopedCollection,
  scopedQuery,
  addBusinessDocument,
  updateBusinessDocument,
  deleteBusinessDocument,
  getBusinessDocument,
  createScopedBatch,
  
  // Utilities
  isSuperAdmin,
  extractBusinessId,
  verifyBusinessAccess
};
