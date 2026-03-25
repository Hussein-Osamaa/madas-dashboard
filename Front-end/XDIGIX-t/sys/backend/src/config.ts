import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongo: {
    /** No local default; set MONGODB_URI (e.g. Atlas) in .env or deployment. */
    uri: process.env.MONGODB_URI ?? '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || 'madas-storage',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    publicUrl: process.env.S3_PUBLIC_URL || 'http://localhost:4000/storage',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(
      process.env.RATE_LIMIT_MAX ||
        (process.env.NODE_ENV === 'production' ? '500' : '2000'),
      10
    ),
  },

  /** External API (multi-tenant): rate limit per tenant */
  externalApi: {
    /** Max requests per tenant per window (orders + webhook) */
    rateLimitPerTenant: parseInt(process.env.EXTERNAL_API_RATE_LIMIT_PER_TENANT || '100', 10),
    rateLimitWindowMs: parseInt(process.env.EXTERNAL_API_RATE_LIMIT_WINDOW_MS || '60000', 10),
    /** Webhook signature timestamp: reject if older than this (seconds). Replay protection. */
    webhookTimestampToleranceSec: parseInt(process.env.EXTERNAL_WEBHOOK_TIMESTAMP_TOLERANCE_SEC || '300', 10),
    /** Require HTTPS in production for external routes */
    requireHttps: process.env.EXTERNAL_API_REQUIRE_HTTPS !== 'false' && process.env.NODE_ENV === 'production',
  },

  /** Zammit integration */
  zammit: {
    /** 64-char hex string (32 bytes) for AES-256-GCM encryption of stored credentials */
    encryptionKey: process.env.ZAMMIT_ENCRYPTION_KEY || '',
    /** Zammit API base URL */
    apiBaseUrl: process.env.ZAMMIT_API_BASE_URL || 'https://api.zammit.shop',
  },
};
