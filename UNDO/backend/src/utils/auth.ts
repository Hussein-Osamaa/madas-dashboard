import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticationError, AuthorizationError } from '@/types';

/**
 * Middleware to verify Firebase ID token
 */
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No authorization token provided');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    req.user = decodedToken;
    req.uid = decodedToken.uid;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.uid) {
      throw new AuthenticationError('User not authenticated');
    }

    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.uid)
      .get();

    if (!userDoc.exists) {
      throw new AuthenticationError('User not found');
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * Middleware to check if user owns resource or is admin
 */
export const requireOwnershipOrAdmin = (resourceField: string = 'ownerId') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.uid) {
        throw new AuthenticationError('User not authenticated');
      }

      // Check if user is admin
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(req.uid)
        .get();

      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        next();
        return;
      }

      // Check resource ownership
      const resourceId = req.params.id || req.body.id;
      if (!resourceId) {
        throw new AuthenticationError('Resource ID required');
      }

      // Get resource from request or database
      let resource;
      if (req.body[resourceField]) {
        resource = req.body;
      } else {
        // Try to get from database based on route
        const collection = getCollectionFromRoute(req.path);
        if (collection) {
          const doc = await admin.firestore()
            .collection(collection)
            .doc(resourceId)
            .get();
          resource = doc.data();
        }
      }

      if (!resource || resource[resourceField] !== req.uid) {
        throw new AuthorizationError('Access denied');
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(403).json({ error: 'Access denied' });
    }
  };
};

/**
 * Get collection name from route path
 */
function getCollectionFromRoute(path: string): string | null {
  const routeMap: Record<string, string> = {
    '/websites': 'websites',
    '/users': 'users',
    '/subscriptions': 'subscriptions',
    '/media': 'media',
  };

  for (const [route, collection] of Object.entries(routeMap)) {
    if (path.includes(route)) {
      return collection;
    }
  }

  return null;
}

/**
 * Get user from Firestore
 */
export const getUser = async (uid: string) => {
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(uid)
    .get();

  if (!userDoc.exists) {
    throw new AuthenticationError('User not found');
  }

  return userDoc.data();
};

/**
 * Check if user has valid subscription
 */
export const hasValidSubscription = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    if (!subscription) {
      return false;
    }

    // Check if subscription is active or trialing
    return subscription.status === 'active' || subscription.status === 'trialing';
  } catch (error) {
    console.error('Subscription check error:', error);
    return false;
  }
};

/**
 * Check if user can create website based on plan limits
 */
export const canCreateWebsite = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    if (!subscription) {
      return false;
    }

    // Get user's current website count
    const websitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('ownerId', '==', uid)
      .get();

    const currentCount = websitesSnapshot.size;
    const planLimits: Record<string, number> = {
      free: 1,
      pro: 10,
      business: 100,
    };

    const limit = planLimits[subscription.plan] || 0;
    return currentCount < limit;
  } catch (error) {
    console.error('Website creation check error:', error);
    return false;
  }
};

/**
 * Create user document in Firestore
 */
export const createUserDocument = async (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string
) => {
  const userData = {
    uid,
    email,
    displayName: displayName || '',
    photoURL: photoURL || '',
    role: 'user',
    subscription: {
      plan: 'free',
      status: 'active',
      features: {
        websites: 1,
        storage: 100, // 100MB
        bandwidth: 1, // 1GB
        customDomains: 0,
        teamMembers: 1,
        prioritySupport: false,
        advancedAnalytics: false,
        customCode: false,
      },
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      notifications: {
        email: true,
        push: true,
        marketing: false,
        updates: true,
        security: true,
      },
      privacy: {
        profilePublic: false,
        analyticsOptIn: true,
        dataSharing: false,
      },
      editor: {
        autoSave: true,
        showGrid: true,
        snapToGrid: true,
        defaultFont: 'Inter',
      },
    },
    stats: {
      websites: {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
      },
      storage: {
        used: 0,
        limit: 100,
      },
      bandwidth: {
        used: 0,
        limit: 1,
      },
      activity: {
        lastLogin: new Date(),
        totalLogins: 1,
        websitesCreated: 0,
        websitesPublished: 0,
      },
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true,
    emailVerified: false,
  };

  await admin.firestore()
    .collection('users')
    .doc(uid)
    .set(userData);

  return userData;
};

/**
 * Update user last login
 */
export const updateLastLogin = async (uid: string) => {
  await admin.firestore()
    .collection('users')
    .doc(uid)
    .update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      'stats.activity.lastLogin': admin.firestore.FieldValue.serverTimestamp(),
      'stats.activity.totalLogins': admin.firestore.FieldValue.increment(1),
    });
};
