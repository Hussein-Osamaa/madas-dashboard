import { getAnalytics, logEvent, setUserId, setUserProperties, Analytics } from 'firebase/analytics';
import { app } from './firebase';

/**
 * Firebase Analytics Helper
 * Provides utilities for tracking analytics events
 */

/**
 * Track a page view event
 */
export function trackPageView(pageName: string, pageTitle?: string, pageLocation?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Try to get analytics instance
    let analyticsInstance: Analytics;
    try {
      analyticsInstance = getAnalytics(app);
    } catch (error) {
      console.debug('[Analytics] Analytics not initialized');
      return;
    }

    logEvent(analyticsInstance, 'page_view', {
      page_title: pageTitle || pageName,
      page_location: pageLocation || window.location.href,
      page_path: window.location.pathname,
    });
  } catch (error) {
    console.debug('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const analyticsInstance = getAnalytics(app);
    logEvent(analyticsInstance, eventName, eventParams || {});
  } catch (error) {
    console.debug('[Analytics] Failed to track event:', error);
  }
}

/**
 * Set user ID for analytics
 */
export function setAnalyticsUserId(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const analyticsInstance = getAnalytics(app);
    setUserId(analyticsInstance, userId);
  } catch (error) {
    console.debug('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * Set user properties for analytics
 */
export function setAnalyticsUserProperties(properties: Record<string, string>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const analyticsInstance = getAnalytics(app);
    setUserProperties(analyticsInstance, properties);
  } catch (error) {
    console.debug('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Track user engagement
 */
export function trackEngagement(engagementTimeMsec: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const analyticsInstance = getAnalytics(app);
    logEvent(analyticsInstance, 'user_engagement', {
      engagement_time_msec: engagementTimeMsec,
    });
  } catch (error) {
    console.debug('[Analytics] Failed to track engagement:', error);
  }
}

