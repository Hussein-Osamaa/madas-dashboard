import * as admin from 'firebase-admin';
import { logSystemEvent } from './logger';

/**
 * Track analytics event
 */
export const trackEvent = async (
  event: string,
  category: 'page_view' | 'user_action' | 'system_event' | 'error',
  properties: Record<string, any> = {},
  userId?: string,
  websiteId?: string,
  sessionId?: string
) => {
  try {
    const analyticsEvent = {
      event,
      category,
      properties,
      userId,
      websiteId,
      sessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      hour: new Date().getHours(),
    };

    await admin.firestore()
      .collection('analytics')
      .add(analyticsEvent);

    // Also track in real-time analytics collection
    await admin.firestore()
      .collection('analytics_realtime')
      .add(analyticsEvent);

    logSystemEvent('info', `Analytics event tracked: ${event}`, 'system', { event, category, userId, websiteId });
  } catch (error) {
    logSystemEvent('error', 'Failed to track analytics event', 'system', { event, category, error: error.message });
  }
};

/**
 * Track page view
 */
export const trackPageView = async (
  page: string,
  title: string,
  userId?: string,
  websiteId?: string,
  sessionId?: string,
  referrer?: string,
  duration?: number
) => {
  return trackEvent(
    'page_view',
    'page_view',
    {
      page,
      title,
      referrer,
      duration,
    },
    userId,
    websiteId,
    sessionId
  );
};

/**
 * Track user action
 */
export const trackUserAction = async (
  action: string,
  element?: string,
  value?: any,
  userId?: string,
  websiteId?: string,
  sessionId?: string
) => {
  return trackEvent(
    'user_action',
    'user_action',
    {
      action,
      element,
      value,
    },
    userId,
    websiteId,
    sessionId
  );
};

/**
 * Track system event
 */
export const trackSystemEvent = async (
  type: string,
  severity: 'info' | 'warning' | 'error',
  message: string,
  metadata?: Record<string, any>
) => {
  return trackEvent(
    'system_event',
    'system_event',
    {
      type,
      severity,
      message,
      ...metadata,
    }
  );
};

/**
 * Track error event
 */
export const trackError = async (
  error: string,
  stack?: string,
  url?: string,
  line?: number,
  column?: number,
  userId?: string,
  websiteId?: string,
  sessionId?: string
) => {
  return trackEvent(
    'error',
    'error',
    {
      error,
      stack,
      url,
      line,
      column,
    },
    userId,
    websiteId,
    sessionId
  );
};

/**
 * Get analytics metrics for a date range
 */
export const getAnalyticsMetrics = async (
  startDate: Date,
  endDate: Date,
  websiteId?: string,
  userId?: string
) => {
  try {
    const db = admin.firestore();
    let query = db.collection('analytics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate);

    if (websiteId) {
      query = query.where('websiteId', '==', websiteId);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const pageViews = events.filter(e => e.event === 'page_view').length;
    const uniqueVisitors = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const sessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size;
    const errors = events.filter(e => e.event === 'error').length;

    // Calculate bounce rate (sessions with only one page view)
    const sessionPageViews: Record<string, number> = {};
    events.forEach(event => {
      if (event.event === 'page_view' && event.sessionId) {
        sessionPageViews[event.sessionId] = (sessionPageViews[event.sessionId] || 0) + 1;
      }
    });
    const bouncedSessions = Object.values(sessionPageViews).filter(count => count === 1).length;
    const bounceRate = sessions > 0 ? (bouncedSessions / sessions) * 100 : 0;

    // Calculate average session duration
    const sessionDurations: Record<string, number[]> = {};
    events.forEach(event => {
      if (event.sessionId && event.properties?.duration) {
        if (!sessionDurations[event.sessionId]) {
          sessionDurations[event.sessionId] = [];
        }
        sessionDurations[event.sessionId].push(event.properties.duration);
      }
    });
    const totalDuration = Object.values(sessionDurations)
      .flat()
      .reduce((sum, duration) => sum + duration, 0);
    const averageSessionDuration = sessions > 0 ? totalDuration / sessions : 0;

    return {
      pageViews,
      uniqueVisitors,
      sessions,
      bounceRate,
      averageSessionDuration,
      errors,
      events: events.length,
    };
  } catch (error) {
    logSystemEvent('error', 'Failed to get analytics metrics', 'system', { error: error.message });
    throw error;
  }
};

/**
 * Get top pages analytics
 */
export const getTopPages = async (
  startDate: Date,
  endDate: Date,
  websiteId?: string,
  limit: number = 10
) => {
  try {
    const db = admin.firestore();
    let query = db.collection('analytics')
      .where('event', '==', 'page_view')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate);

    if (websiteId) {
      query = query.where('websiteId', '==', websiteId);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map(doc => doc.data());

    // Group by page
    const pageStats: Record<string, {
      page: string;
      views: number;
      uniqueVisitors: Set<string>;
      totalDuration: number;
      durations: number[];
    }> = {};

    events.forEach(event => {
      const page = event.properties?.page;
      if (!page) return;

      if (!pageStats[page]) {
        pageStats[page] = {
          page,
          views: 0,
          uniqueVisitors: new Set(),
          totalDuration: 0,
          durations: [],
        };
      }

      pageStats[page].views++;
      if (event.userId) {
        pageStats[page].uniqueVisitors.add(event.userId);
      }
      if (event.properties?.duration) {
        pageStats[page].totalDuration += event.properties.duration;
        pageStats[page].durations.push(event.properties.duration);
      }
    });

    // Convert to array and sort by views
    const topPages = Object.values(pageStats)
      .map(stats => ({
        page: stats.page,
        views: stats.views,
        uniqueVisitors: stats.uniqueVisitors.size,
        averageTimeOnPage: stats.durations.length > 0 
          ? stats.totalDuration / stats.durations.length 
          : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);

    return topPages;
  } catch (error) {
    logSystemEvent('error', 'Failed to get top pages', 'system', { error: error.message });
    throw error;
  }
};

/**
 * Get traffic sources analytics
 */
export const getTrafficSources = async (
  startDate: Date,
  endDate: Date,
  websiteId?: string
) => {
  try {
    const db = admin.firestore();
    let query = db.collection('analytics')
      .where('event', '==', 'page_view')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate);

    if (websiteId) {
      query = query.where('websiteId', '==', websiteId);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map(doc => doc.data());

    // Group by referrer
    const sourceStats: Record<string, {
      source: string;
      visitors: Set<string>;
      sessions: Set<string>;
      pageViews: number;
    }> = {};

    events.forEach(event => {
      const referrer = event.properties?.referrer || 'direct';
      const source = getSourceFromReferrer(referrer);

      if (!sourceStats[source]) {
        sourceStats[source] = {
          source,
          visitors: new Set(),
          sessions: new Set(),
          pageViews: 0,
        };
      }

      sourceStats[source].pageViews++;
      if (event.userId) {
        sourceStats[source].visitors.add(event.userId);
      }
      if (event.sessionId) {
        sourceStats[source].sessions.add(event.sessionId);
      }
    });

    // Convert to array and sort by visitors
    const trafficSources = Object.values(sourceStats)
      .map(stats => ({
        source: stats.source,
        visitors: stats.visitors.size,
        sessions: stats.sessions.size,
        pageViews: stats.pageViews,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    return trafficSources;
  } catch (error) {
    logSystemEvent('error', 'Failed to get traffic sources', 'system', { error: error.message });
    throw error;
  }
};

/**
 * Get source from referrer URL
 */
const getSourceFromReferrer = (referrer: string): string => {
  if (!referrer || referrer === 'direct') {
    return 'Direct';
  }

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('facebook')) return 'Facebook';
    if (hostname.includes('twitter')) return 'Twitter';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('reddit')) return 'Reddit';
    if (hostname.includes('github')) return 'GitHub';
    if (hostname.includes('stackoverflow')) return 'Stack Overflow';

    return hostname;
  } catch {
    return 'Other';
  }
};

/**
 * Clean up old analytics data
 */
export const cleanupAnalyticsData = async (olderThanDays: number = 90): Promise<number> => {
  try {
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete old analytics events
    const analyticsQuery = db.collection('analytics')
      .where('timestamp', '<', cutoffDate);
    
    const analyticsSnapshot = await analyticsQuery.get();
    const batch = db.batch();
    
    analyticsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logSystemEvent('info', 'Analytics data cleaned up', 'system', { 
      deletedCount: analyticsSnapshot.size, 
      olderThanDays 
    });

    return analyticsSnapshot.size;
  } catch (error) {
    logSystemEvent('error', 'Failed to cleanup analytics data', 'system', { error: error.message });
    throw error;
  }
};
