// App configuration
export const APP_CONFIG = {
  name: 'Madas',
  description: 'Build beautiful websites with ease',
  version: '1.0.0',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001',
  builderUrl: process.env.NEXT_PUBLIC_BUILDER_URL || 'http://localhost:3002',
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003',
} as const;

// Firebase collections
export const COLLECTIONS = {
  USERS: 'users',
  WEBSITES: 'websites',
  TEMPLATES: 'templates',
  SUBSCRIPTIONS: 'subscriptions',
  INVOICES: 'invoices',
  ANALYTICS: 'analytics',
  MEDIA: 'media',
  CUSTOM_DOMAINS: 'custom_domains',
  PUBLISHING_LOGS: 'publishing_logs',
} as const;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    features: [
      '1 website',
      'Basic templates',
      'Community support',
      '1GB storage',
    ],
    limits: {
      websites: 1,
      storage: 1024, // MB
      bandwidth: 1, // GB
      customDomains: 0,
      teamMembers: 1,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month' as const,
    features: [
      '10 websites',
      'Premium templates',
      'Custom domains',
      'Priority support',
      'Analytics',
      '10GB storage',
    ],
    limits: {
      websites: 10,
      storage: 10240, // MB
      bandwidth: 10, // GB
      customDomains: 5,
      teamMembers: 3,
    },
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 99,
    interval: 'month' as const,
    features: [
      'Unlimited websites',
      'All templates',
      'Custom domains',
      'White-label',
      'API access',
      'Priority support',
      '100GB storage',
    ],
    limits: {
      websites: -1, // unlimited
      storage: 102400, // MB
      bandwidth: 100, // GB
      customDomains: -1, // unlimited
      teamMembers: 10,
    },
  },
} as const;

// Website statuses
export const WEBSITE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  WEBSITES: {
    LIST: '/api/websites',
    CREATE: '/api/websites',
    GET: '/api/websites/[id]',
    UPDATE: '/api/websites/[id]',
    DELETE: '/api/websites/[id]',
    PUBLISH: '/api/websites/[id]/publish',
  },
  SUBSCRIPTIONS: {
    GET: '/api/subscriptions',
    CREATE: '/api/subscriptions',
    UPDATE: '/api/subscriptions/[id]',
    CANCEL: '/api/subscriptions/[id]/cancel',
  },
  STRIPE: {
    WEBHOOK: '/api/stripe/webhook',
    CREATE_CHECKOUT: '/api/stripe/create-checkout',
    CREATE_PORTAL: '/api/stripe/create-portal',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  STRIPE_ERROR: 'Payment processing error. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  WEBSITE_CREATED: 'Website created successfully!',
  WEBSITE_UPDATED: 'Website updated successfully!',
  WEBSITE_PUBLISHED: 'Website published successfully!',
  SUBSCRIPTION_CREATED: 'Subscription created successfully!',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully!',
  PAYMENT_SUCCESS: 'Payment processed successfully!',
} as const;
