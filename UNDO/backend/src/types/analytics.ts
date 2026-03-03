export interface AnalyticsEvent {
  id: string;
  userId?: string;
  websiteId?: string;
  event: string;
  category: 'page_view' | 'user_action' | 'system_event' | 'error';
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  url?: string;
}

export interface PageViewEvent extends AnalyticsEvent {
  event: 'page_view';
  properties: {
    page: string;
    title: string;
    referrer?: string;
    duration?: number;
  };
}

export interface UserActionEvent extends AnalyticsEvent {
  event: 'user_action';
  properties: {
    action: string;
    element?: string;
    value?: any;
  };
}

export interface SystemEvent extends AnalyticsEvent {
  event: 'system_event';
  properties: {
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
  };
}

export interface ErrorEvent extends AnalyticsEvent {
  event: 'error';
  properties: {
    error: string;
    stack?: string;
    url?: string;
    line?: number;
    column?: number;
  };
}

export interface AnalyticsMetrics {
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    averageSessionDuration: number;
    pagesPerSession: number;
    newVisitors: number;
    returningVisitors: number;
  };
  breakdown: {
    byPage: Array<{
      page: string;
      views: number;
      uniqueVisitors: number;
      bounceRate: number;
      averageTimeOnPage: number;
    }>;
    bySource: Array<{
      source: string;
      visitors: number;
      sessions: number;
      bounceRate: number;
    }>;
    byDevice: Array<{
      device: string;
      visitors: number;
      sessions: number;
    }>;
    byCountry: Array<{
      country: string;
      visitors: number;
      sessions: number;
    }>;
    byBrowser: Array<{
      browser: string;
      visitors: number;
      sessions: number;
    }>;
    byOS: Array<{
      os: string;
      visitors: number;
      sessions: number;
    }>;
  };
  trends: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
  }>;
}

export interface WebsiteAnalytics extends AnalyticsMetrics {
  websiteId: string;
  websiteName: string;
  customDomain?: string;
  publishedAt: Date;
  lastUpdated: Date;
}

export interface PlatformAnalytics extends AnalyticsMetrics {
  totalWebsites: number;
  activeWebsites: number;
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  revenue: {
    monthly: number;
    yearly: number;
    total: number;
  };
}

export interface UserAnalytics extends AnalyticsMetrics {
  userId: string;
  userEmail: string;
  subscriptionPlan: string;
  websitesCount: number;
  totalViews: number;
  averageViewsPerWebsite: number;
}

export interface AnalyticsReport {
  id: string;
  type: 'website' | 'platform' | 'user';
  targetId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: AnalyticsMetrics;
  generatedAt: Date;
  generatedBy: string;
  format: 'json' | 'csv' | 'pdf';
  downloadUrl?: string;
  expiresAt: Date;
}

export interface AnalyticsDashboard {
  overview: {
    totalPageViews: number;
    totalUniqueVisitors: number;
    totalSessions: number;
    averageBounceRate: number;
    averageSessionDuration: number;
    growthRate: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    uniqueVisitors: number;
    bounceRate: number;
  }>;
  topSources: Array<{
    source: string;
    visitors: number;
    sessions: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    percentage: number;
    visitors: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    percentage: number;
    visitors: number;
  }>;
  hourlyTrends: Array<{
    hour: number;
    pageViews: number;
    uniqueVisitors: number;
  }>;
  dailyTrends: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
  }>;
}

export interface AnalyticsConfig {
  trackingEnabled: boolean;
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  cookieConsent: boolean;
  dataRetentionDays: number;
  realTimeReporting: boolean;
  customEvents: string[];
  excludedPaths: string[];
  excludedReferrers: string[];
}
