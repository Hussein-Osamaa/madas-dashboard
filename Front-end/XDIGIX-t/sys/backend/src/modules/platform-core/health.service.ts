import mongoose from 'mongoose';
import { eventBus } from './event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('health');

const startTime = Date.now();

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    mongodb: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'down' | 'not_configured'; latencyMs?: number };
    eventBus: { status: 'up' | 'degraded'; pendingCount?: number; deadLetterCount?: number; handlerCount: number };
  };
  uptime: number;
}

export const healthService = {
  async checkHealth(): Promise<HealthCheck> {
    const checks: HealthCheck['checks'] = {
      mongodb: { status: 'down' },
      redis: { status: 'not_configured' },
      eventBus: { status: 'up', handlerCount: 0 },
    };

    // MongoDB check
    try {
      const mongoStart = Date.now();
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db!.admin().ping();
        checks.mongodb = { status: 'up', latencyMs: Date.now() - mongoStart };
      } else {
        checks.mongodb = { status: 'down' };
      }
    } catch {
      checks.mongodb = { status: 'down' };
    }

    // Redis check — only if REDIS_URL is configured
    if (process.env.REDIS_URL) {
      try {
        // Dynamic import to avoid hard dependency
        const { default: Redis } = await import('ioredis');
        const redis = new Redis(process.env.REDIS_URL, {
          connectTimeout: 3000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        const redisStart = Date.now();
        await redis.connect();
        await redis.ping();
        checks.redis = { status: 'up', latencyMs: Date.now() - redisStart };
        await redis.disconnect();
      } catch {
        checks.redis = { status: 'down' };
      }
    }

    // Event bus check
    try {
      const pendingCount = await eventBus.getPendingCount();
      const deadLetterCount = await eventBus.getDeadLetterCount();
      const handlerCount = eventBus.getHandlerCount();
      const isBusHealthy = pendingCount < 1000;
      checks.eventBus = {
        status: isBusHealthy ? 'up' : 'degraded',
        pendingCount,
        deadLetterCount,
        handlerCount,
      };
    } catch {
      checks.eventBus = { status: 'degraded', handlerCount: 0 };
    }

    // Overall status
    let status: HealthCheck['status'] = 'healthy';
    if (checks.mongodb.status === 'down') {
      status = 'unhealthy';
    } else if (
      checks.redis.status === 'down' ||
      checks.eventBus.status === 'degraded'
    ) {
      status = 'degraded';
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    if (status !== 'healthy') {
      log.warn(`Health check: ${status}`, {
        mongoStatus: checks.mongodb.status,
        redisStatus: checks.redis.status,
        eventBusStatus: checks.eventBus.status,
      });
    }

    return { status, checks, uptime };
  },
};
