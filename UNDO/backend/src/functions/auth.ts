import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemEvent, logUserActivity } from '@/utils/logger';
import { sendWelcomeEmail } from '@/utils/email';
import { createUserDocument, getUser, updateLastLogin } from '@/utils/auth';

/**
 * Create user document when new user signs up
 */
export const createUser = functions.auth.user().onCreate(async (user) => {
  try {
    await createUserDocument(
      user.uid,
      user.email!,
      user.displayName,
      user.photoURL
    );

    // Send welcome email
    await sendWelcomeEmail({
      email: user.email!,
      displayName: user.displayName || user.email!,
    });

    await logSystemEvent('info', 'User created', 'auth', { userId: user.uid, email: user.email });
  } catch (error) {
    await logSystemEvent('error', 'Failed to create user document', 'auth', { 
      userId: user.uid, 
      error: error.message 
    });
  }
});

/**
 * Update user profile
 */
export const updateUser = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { displayName, photoURL, bio, location, website, socialLinks, preferences } = data;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (preferences !== undefined) updateData.preferences = preferences;

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update(updateData);

    await logUserActivity(userId, 'update_profile', 'user', userId, { fields: Object.keys(updateData) });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update user', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update user');
  }
});

/**
 * Delete user
 */
export const deleteUser = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { password } = data;

    // Verify password before deletion
    if (password) {
      const user = await admin.auth().getUser(userId);
      // Note: In a real implementation, you'd verify the password here
      // This is a simplified version
    }

    // Delete user's websites
    const websitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('ownerId', '==', userId)
      .get();

    const batch = admin.firestore().batch();
    websitesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete user's subscriptions
    const subscriptionsSnapshot = await admin.firestore()
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();

    const subscriptionBatch = admin.firestore().batch();
    subscriptionsSnapshot.docs.forEach(doc => {
      subscriptionBatch.delete(doc.ref);
    });
    await subscriptionBatch.commit();

    // Delete user document
    await admin.firestore().collection('users').doc(userId).delete();

    // Delete user from Firebase Auth
    await admin.auth().deleteUser(userId);

    await logSystemEvent('info', 'User deleted', 'auth', { userId });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to delete user', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to delete user');
  }
});

/**
 * Get user profile
 */
export const getUserProfile = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userData = await getUser(userId);

    // Update last login
    await updateLastLogin(userId);

    return {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      socialLinks: userData.socialLinks,
      preferences: userData.preferences,
      subscription: userData.subscription,
      stats: userData.stats,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get user profile', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get user profile');
  }
});

/**
 * Update user preferences
 */
export const updateUserPreferences = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { preferences } = data;

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logUserActivity(userId, 'update_preferences', 'user', userId, { preferences });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update user preferences', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update user preferences');
  }
});

/**
 * Get user analytics
 */
export const getUserAnalytics = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { period = 'month' } = data;

    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get user's websites
    const websitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('ownerId', '==', userId)
      .get();

    const websiteIds = websitesSnapshot.docs.map(doc => doc.id);

    // Get analytics data
    const analyticsSnapshot = await admin.firestore()
      .collection('analytics')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', now)
      .get();

    const analytics = analyticsSnapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const pageViews = analytics.filter(a => a.event === 'page_view').length;
    const uniqueVisitors = new Set(analytics.map(a => a.userId).filter(Boolean)).size;
    const sessions = new Set(analytics.map(a => a.sessionId).filter(Boolean)).size;

    return {
      period,
      startDate,
      endDate: now,
      metrics: {
        pageViews,
        uniqueVisitors,
        sessions,
        websites: websiteIds.length,
      },
      analytics: analytics.slice(0, 100), // Limit to recent 100 events
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get user analytics', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get user analytics');
  }
});

/**
 * Get user subscription
 */
export const getUserSubscription = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userData = await getUser(userId);

    return {
      subscription: userData.subscription,
      features: userData.subscription?.features,
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get user subscription', 'auth', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get user subscription');
  }
});

export const authFunctions = {
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserPreferences,
  getUserAnalytics,
  getUserSubscription,
};
