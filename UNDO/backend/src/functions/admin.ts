import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemEvent, logUserActivity } from '@/utils/logger';
import { sendAdminNotification } from '@/utils/email';
import { requireAdmin } from '@/utils/auth';

/**
 * Get admin statistics
 */
export const getAdminStats = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin permissions
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

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

    // Get user statistics
    const usersSnapshot = await admin.firestore().collection('users').get();
    const newUsersSnapshot = await admin.firestore()
      .collection('users')
      .where('createdAt', '>=', startDate)
      .get();

    // Get website statistics
    const websitesSnapshot = await admin.firestore().collection('websites').get();
    const publishedWebsitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('status', '==', 'published')
      .get();

    // Get subscription statistics
    const subscriptionsSnapshot = await admin.firestore().collection('subscriptions').get();
    const activeSubscriptionsSnapshot = await admin.firestore()
      .collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    // Calculate revenue
    let monthlyRevenue = 0;
    activeSubscriptionsSnapshot.docs.forEach(doc => {
      const subscription = doc.data();
      monthlyRevenue += subscription.amount || 0;
    });

    // Get user growth data
    const userGrowth = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayUsersSnapshot = await admin.firestore()
        .collection('users')
        .where('createdAt', '>=', dayStart)
        .where('createdAt', '<=', dayEnd)
        .get();

      userGrowth.unshift({
        date: dayStart.toISOString().split('T')[0],
        count: dayUsersSnapshot.size,
      });
    }

    const stats = {
      overview: {
        totalUsers: usersSnapshot.size,
        totalWebsites: websitesSnapshot.size,
        totalSubscriptions: subscriptionsSnapshot.size,
        monthlyRevenue,
        activeUsers: usersSnapshot.docs.filter(doc => {
          const data = doc.data();
          const lastLogin = data.lastLoginAt?.toDate();
          return lastLogin && (now.getTime() - lastLogin.getTime()) < (30 * 24 * 60 * 60 * 1000);
        }).length,
        newUsersToday: newUsersSnapshot.size,
        newUsersThisWeek: 0, // Calculate based on period
        newUsersThisMonth: 0, // Calculate based on period
      },
      users: {
        byPlan: {
          free: usersSnapshot.docs.filter(doc => doc.data().subscription?.plan === 'free').length,
          pro: usersSnapshot.docs.filter(doc => doc.data().subscription?.plan === 'pro').length,
          business: usersSnapshot.docs.filter(doc => doc.data().subscription?.plan === 'business').length,
        },
        byStatus: {
          active: usersSnapshot.docs.filter(doc => doc.data().isActive).length,
          inactive: usersSnapshot.docs.filter(doc => !doc.data().isActive).length,
          suspended: 0, // Add suspended field to user schema
        },
        growth: userGrowth,
      },
      websites: {
        byStatus: {
          published: publishedWebsitesSnapshot.size,
          draft: websitesSnapshot.docs.filter(doc => doc.data().status === 'draft').length,
          archived: websitesSnapshot.docs.filter(doc => doc.data().status === 'archived').length,
        },
        byTemplate: {}, // Calculate template distribution
        totalViews: 0, // Calculate from analytics
        averageViewsPerWebsite: 0,
      },
      subscriptions: {
        byPlan: {
          free: usersSnapshot.docs.filter(doc => doc.data().subscription?.plan === 'free').length,
          pro: subscriptionsSnapshot.docs.filter(doc => doc.data().plan === 'pro').length,
          business: subscriptionsSnapshot.docs.filter(doc => doc.data().plan === 'business').length,
        },
        byStatus: {
          active: activeSubscriptionsSnapshot.size,
          canceled: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'canceled').length,
          past_due: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'past_due').length,
          unpaid: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'unpaid').length,
        },
        revenue: {
          monthly: monthlyRevenue,
          yearly: monthlyRevenue * 12,
          total: monthlyRevenue * 12, // Simplified calculation
        },
        churnRate: 0, // Calculate churn rate
        conversionRate: 0, // Calculate conversion rate
      },
      system: {
        uptime: 99.9, // Get from monitoring
        responseTime: 45, // Get from monitoring
        errorRate: 0.1, // Get from logs
        activeSessions: 0, // Get from active sessions
        storageUsed: 0, // Calculate from storage
        bandwidthUsed: 0, // Calculate from bandwidth
      },
    };

    await logUserActivity(context.auth.uid, 'view_admin_stats', 'admin', 'stats', { period });

    return stats;
  } catch (error) {
    await logSystemEvent('error', 'Failed to get admin stats', 'admin', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get admin stats');
  }
});

/**
 * Get system logs
 */
export const getSystemLogs = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin permissions
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { level, category, limit = 100, offset = 0 } = data;

    let query = admin.firestore()
      .collection('system_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    if (level) {
      query = query.where('level', '==', level);
    }

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { logs, total: snapshot.size };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get system logs', 'admin', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get system logs');
  }
});

/**
 * Update system settings
 */
export const updateSystemSettings = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin permissions
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { settings } = data;

    await admin.firestore()
      .collection('system_settings')
      .doc('main')
      .set({
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      }, { merge: true });

    await logUserActivity(context.auth.uid, 'update_system_settings', 'admin', 'settings', { settings });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to update system settings', 'admin', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to update system settings');
  }
});

/**
 * Export user data
 */
export const exportUserData = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin permissions
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, format = 'json' } = data;

    // Get user data
    const userData = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userData.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Get user's websites
    const websitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('ownerId', '==', userId)
      .get();

    // Get user's subscriptions
    const subscriptionsSnapshot = await admin.firestore()
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();

    // Get user's analytics
    const analyticsSnapshot = await admin.firestore()
      .collection('analytics')
      .where('userId', '==', userId)
      .limit(1000)
      .get();

    const exportData = {
      user: userData.data(),
      websites: websitesSnapshot.docs.map(doc => doc.data()),
      subscriptions: subscriptionsSnapshot.docs.map(doc => doc.data()),
      analytics: analyticsSnapshot.docs.map(doc => doc.data()),
      exportedAt: new Date().toISOString(),
      exportedBy: context.auth.uid,
    };

    // Store export request
    await admin.firestore()
      .collection('user_exports')
      .add({
        userId,
        requestedBy: context.auth.uid,
        status: 'completed',
        format,
        data: exportData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await logUserActivity(context.auth.uid, 'export_user_data', 'admin', userId, { format });

    return { success: true, data: exportData };
  } catch (error) {
    await logSystemEvent('error', 'Failed to export user data', 'admin', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to export user data');
  }
});

/**
 * Send admin notification
 */
export const sendAdminNotification = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin permissions
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { subject, message, data: notificationData } = data;

    await sendAdminNotification(subject, message, notificationData);

    await logUserActivity(context.auth.uid, 'send_admin_notification', 'admin', 'notification', { subject });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to send admin notification', 'admin', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to send admin notification');
  }
});

export const adminFunctions = {
  getAdminStats,
  getSystemLogs,
  updateSystemSettings,
  exportUserData,
  sendAdminNotification,
};
