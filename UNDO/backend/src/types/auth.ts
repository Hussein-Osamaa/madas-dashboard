export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user';
  subscription: UserSubscription;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  emailVerified: boolean;
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
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profilePublic: boolean;
    analyticsOptIn: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  displayName?: string;
  photoURL?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByPlan: {
    free: number;
    pro: number;
    business: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
}
