import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logSystemEvent } from '@/utils/logger';
import { trackEvent, getAnalyticsMetrics, getTopPages, getTrafficSources } from '@/utils/analytics';

/**
 * Track website view
 */
export const trackWebsiteView = functions.https.onCall(async (data, context) => {
  try {
    const { websiteId, page, title, referrer, sessionId } = data;
    const userId = context.auth?.uid;

    await trackEvent(
      'page_view',
      'page_view',
      {
        page,
        title,
        referrer,
      },
      userId,
      websiteId,
      sessionId
    );

    // Update website analytics
    await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .update({
        'analytics.views': admin.firestore.FieldValue.increment(1),
        'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    await logSystemEvent('error', 'Failed to track website view', 'analytics', { 
      error: error.message, 
      websiteId: data.websiteId 
    });
    throw new functions.https.HttpsError('internal', 'Failed to track website view');
  }
});

/**
 * Get website analytics
 */
export const getWebsiteAnalytics = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId, period = 'month' } = data;

    // Verify ownership
    const websiteDoc = await admin.firestore()
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Website not found');
    }

    const websiteData = websiteDoc.data();
    if (websiteData?.ownerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

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

    // Get analytics metrics
    const metrics = await getAnalyticsMetrics(startDate, now, websiteId);
    const topPages = await getTopPages(startDate, now, websiteId);
    const trafficSources = await getTrafficSources(startDate, now, websiteId);

    return {
      websiteId,
      websiteName: websiteData.name,
      period,
      startDate,
      endDate: now,
      metrics,
      topPages,
      trafficSources,
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get website analytics', 'analytics', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get website analytics');
  }
});

/**
 * Get platform analytics
 */
export const getPlatformAnalytics = functions.https.onCall(async (data, context) => {
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

    // Get platform-wide analytics
    const metrics = await getAnalyticsMetrics(startDate, now);
    const topPages = await getTopPages(startDate, now);
    const trafficSources = await getTrafficSources(startDate, now);

    // Get platform statistics
    const usersSnapshot = await admin.firestore().collection('users').get();
    const websitesSnapshot = await admin.firestore().collection('websites').get();
    const subscriptionsSnapshot = await admin.firestore().collection('subscriptions').get();

    return {
      period,
      startDate,
      endDate: now,
      metrics,
      topPages,
      trafficSources,
      platform: {
        totalUsers: usersSnapshot.size,
        totalWebsites: websitesSnapshot.size,
        totalSubscriptions: subscriptionsSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(doc => {
          const data = doc.data();
          const lastLogin = data.lastLoginAt?.toDate();
          return lastLogin && (now.getTime() - lastLogin.getTime()) < (30 * 24 * 60 * 60 * 1000);
        }).length,
      },
    };
  } catch (error) {
    await logSystemEvent('error', 'Failed to get platform analytics', 'analytics', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to get platform analytics');
  }
});

/**
 * Generate analytics report
 */
export const generateAnalyticsReport = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { websiteId, period = 'month', format = 'json' } = data;

    // Verify ownership if websiteId is provided
    if (websiteId) {
      const websiteDoc = await admin.firestore()
        .collection('websites')
        .doc(websiteId)
        .get();

      if (!websiteDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Website not found');
      }

      const websiteData = websiteDoc.data();
      if (websiteData?.ownerId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
      }
    }

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

    // Get analytics data
    const metrics = await getAnalyticsMetrics(startDate, now, websiteId, userId);
    const topPages = await getTopPages(startDate, now, websiteId, 20);
    const trafficSources = await getTrafficSources(startDate, now, websiteId);

    const report = {
      id: admin.firestore().collection('analytics_reports').doc().id,
      type: websiteId ? 'website' : 'user',
      targetId: websiteId || userId,
      period,
      startDate,
      endDate: now,
      metrics,
      topPages,
      trafficSources,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: userId,
      format,
    };

    // Store report
    await admin.firestore()
      .collection('analytics_reports')
      .doc(report.id)
      .set(report);

    await logSystemEvent('info', 'Analytics report generated', 'analytics', { 
      reportId: report.id, 
      userId, 
      websiteId, 
      period 
    });

    return { success: true, reportId: report.id, report };
  } catch (error) {
    await logSystemEvent('error', 'Failed to generate analytics report', 'analytics', { 
      error: error.message, 
      userId: context.auth?.uid 
    });
    throw new functions.https.HttpsError('internal', 'Failed to generate analytics report');
  }
});

export const analyticsFunctions = {
  trackWebsiteView,
  getWebsiteAnalytics,
  getPlatformAnalytics,
  generateAnalyticsReport,
};
