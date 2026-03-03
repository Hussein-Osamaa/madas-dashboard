export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  preferences: UserPreferences;
  subscription: UserSubscription;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    updates: boolean;
    security: boolean;
  };
  privacy: {
    profilePublic: boolean;
    analyticsOptIn: boolean;
    dataSharing: boolean;
  };
  editor: {
    autoSave: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    defaultFont: string;
  };
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'business';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date;
  features: {
    websites: number;
    storage: number; // in MB
    bandwidth: number; // in GB
    customDomains: number;
    teamMembers: number;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
    customCode: boolean;
  };
}

export interface UserStats {
  websites: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  storage: {
    used: number; // in MB
    limit: number; // in MB
  };
  bandwidth: {
    used: number; // in GB
    limit: number; // in GB
  };
  activity: {
    lastLogin: Date;
    totalLogins: number;
    websitesCreated: number;
    websitesPublished: number;
  };
}

export interface UpdateUserProfileRequest {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: Partial<UserProfile['socialLinks']>;
  preferences?: Partial<UserPreferences>;
}

export interface UserAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
    averageSessionDuration: number;
    topPages: Array<{
      page: string;
      views: number;
    }>;
    trafficSources: Array<{
      source: string;
      visitors: number;
    }>;
    deviceTypes: Array<{
      device: string;
      visitors: number;
    }>;
    countries: Array<{
      country: string;
      visitors: number;
    }>;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'website_created' | 'website_published' | 'website_updated' | 'subscription_changed';
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  device: {
    userAgent: string;
    platform: string;
    browser: string;
    version: string;
  };
  location: {
    country?: string;
    city?: string;
    ip: string;
  };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}
