export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'admin' | 'user';
  subscription?: Subscription;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  dashboard: {
    defaultView: 'grid' | 'list';
    itemsPerPage: number;
  };
}

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Import Subscription type (will be defined in subscription.ts)
export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
}
