/**
 * Analytics - Firebase Analytics removed. All tracking is a no-op.
 * Replace with a real analytics provider (Mixpanel, PostHog, etc.) if needed.
 */

export function trackPageView(_pageName: string, _pageTitle?: string, _pageLocation?: string): void {
  // no-op: Firebase Analytics removed
}

export function trackEvent(_eventName: string, _eventParams?: Record<string, unknown>): void {
  // no-op: Firebase Analytics removed
}

export function setAnalyticsUserId(_userId: string): void {
  // no-op: Firebase Analytics removed
}

export function setAnalyticsUserProperties(_properties: Record<string, string>): void {
  // no-op: Firebase Analytics removed
}

export function trackEngagement(_engagementTimeMsec: number): void {
  // no-op: Firebase Analytics removed
}
