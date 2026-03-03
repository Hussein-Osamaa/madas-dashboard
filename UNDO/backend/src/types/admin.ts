export interface AdminStats {
  overview: {
    totalUsers: number;
    totalWebsites: number;
    totalSubscriptions: number;
    monthlyRevenue: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  };
  users: {
    byPlan: {
      free: number;
      pro: number;
      business: number;
    };
    byStatus: {
      active: number;
      inactive: number;
      suspended: number;
    };
    byCountry: Array<{
      country: string;
      count: number;
    }>;
    growth: Array<{
      date: string;
      count: number;
    }>;
  };
  websites: {
    byStatus: {
      published: number;
      draft: number;
      archived: number;
    };
    byTemplate: Array<{
      template: string;
      count: number;
    }>;
    totalViews: number;
    averageViewsPerWebsite: number;
  };
  subscriptions: {
    byPlan: {
      free: number;
      pro: number;
      business: number;
    };
    byStatus: {
      active: number;
      canceled: number;
      past_due: number;
      unpaid: number;
    };
    revenue: {
      monthly: number;
      yearly: number;
      total: number;
    };
    churnRate: number;
    conversionRate: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeSessions: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  category: 'auth' | 'payment' | 'website' | 'system' | 'security';
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  storage: {
    maxFileSize: number; // in MB
    allowedFileTypes: string[];
    storageQuota: {
      free: number;
      pro: number;
      business: number;
    };
  };
  security: {
    sessionTimeout: number; // in minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // in minutes
    requireStrongPasswords: boolean;
    twoFactorEnabled: boolean;
  };
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    trackingEnabled: boolean;
    anonymizeIp: boolean;
  };
  features: {
    customDomains: boolean;
    whiteLabel: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    ssl: boolean;
  };
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  category: 'system' | 'security' | 'billing' | 'user' | 'website';
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserExport {
  id: string;
  userId: string;
  requestedBy: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'json' | 'csv' | 'xlsx';
  includeData: {
    profile: boolean;
    websites: boolean;
    analytics: boolean;
    subscriptions: boolean;
    activity: boolean;
  };
  downloadUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'maintenance';
    uptime: number;
    responseTime: number;
    lastCheck: Date;
  }>;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  lastUpdated: Date;
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'website' | 'subscription' | 'system';
  targetId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt: Date;
  error?: string;
}
