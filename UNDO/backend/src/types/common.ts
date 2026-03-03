export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeRange {
  start: string; // ISO time string
  end: string; // ISO time string
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
  region?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface SystemInfo {
  version: string;
  environment: 'development' | 'staging' | 'production';
  buildDate: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
  }>;
}

export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    idle: number;
  };
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export interface StorageConfig {
  provider: 'firebase' | 'aws' | 'gcp' | 'azure';
  bucket: string;
  region: string;
  credentials: Record<string, any>;
  maxFileSize: number;
  allowedTypes: string[];
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: string;
  bcryptRounds: number;
  rateLimit: RateLimit;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  helmet: Record<string, any>;
}

export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple' | 'combined';
  transports: Array<{
    type: 'console' | 'file' | 'http';
    options: Record<string, any>;
  }>;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetGroups?: string[];
  conditions?: Record<string, any>;
}

export interface A/BTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    config: Record<string, any>;
  }>;
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  results?: {
    winner: string;
    confidence: number;
    metrics: Record<string, any>;
  };
}
