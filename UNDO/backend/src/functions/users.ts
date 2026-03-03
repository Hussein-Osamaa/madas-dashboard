import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemEvent, logUserActivity } from '@/utils/logger';
import { getUser } from '@/utils/auth';

/**
 * Update user profile
 */
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { displayName, photoURL, bio, location, website, socialLinks } = data;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update(updateData);

    await logUserActivity(userId, 'update_profile', 'user', userId, { fields: Object.keys(updateData) });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update user profile', 'user', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update user profile');
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
    await logSystemEvent('error', 'Failed to get user analytics', 'user', { 
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
    await logSystemEvent('error', 'Failed to get user subscription', 'user', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get user subscription');
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
    await logSystemEvent('error', 'Failed to update user preferences', 'user', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update user preferences');
  }
});

export const userFunctions = {
  updateUserProfile,
  getUserAnalytics,
  getUserSubscription,
  updateUserPreferences,
};
