import { v4 as uuidv4 } from 'uuid';
import { Event, IEvent } from './event-bus.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('event-bus');

type EventHandler = (event: IEvent) => Promise<void>;
const handlers: Map<string, EventHandler[]> = new Map();

export const eventBus = {
  /**
   * Publish an event: persist to MongoDB with status=pending.
   * Returns the generated eventId.
   */
  async publish(
    type: string,
    payload: Record<string, unknown>,
    metadata?: { tenantId?: string; correlationId?: string }
  ): Promise<string> {
    const eventId = uuidv4();
    await Event.create({
      eventId,
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      tenantId: metadata?.tenantId,
      correlationId: metadata?.correlationId,
    });
    log.info(`Event published: ${type}`, { eventId, tenantId: metadata?.tenantId });
    return eventId;
  },

  /**
   * Safe publish: wraps publish in try-catch so callers don't crash.
   * Returns eventId on success, null on failure (logged).
   * Use this from business services where event loss is acceptable.
   */
  async safePublish(type: string, payload: Record<string, unknown>, metadata?: { tenantId?: string; correlationId?: string }): Promise<string | null> {
    try {
      return await eventBus.publish(type, payload, metadata);
    } catch (err) {
      log.error(`Failed to publish event: ${type}`, { error: (err as Error).message, tenantId: metadata?.tenantId });
      return null;
    }
  },

  /**
   * Subscribe: register an in-process handler for an event type.
   */
  subscribe(type: string, handler: EventHandler): void {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type)!.push(handler);
    log.info(`Handler registered for: ${type}`);
  },

  /**
   * Worker: poll for pending events and dispatch to registered handlers.
   * Respects scheduledAt for retry backoff — only picks events where
   * scheduledAt is null OR scheduledAt <= now.
   */
  async processNext(batchSize = 10): Promise<number> {
    const now = new Date();
    const events = await Event.find({
      status: 'pending',
      $or: [
        { scheduledAt: null },
        { scheduledAt: { $exists: false } },
        { scheduledAt: { $lte: now } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    let processed = 0;
    for (const event of events) {
      // Claim the event atomically (prevent double-pickup by other workers)
      const claimed = await Event.findOneAndUpdate(
        { _id: event._id, status: 'pending' },
        { $set: { status: 'processing' } }
      );
      if (!claimed) continue;

      const eventHandlers = handlers.get(event.type) || [];
      if (eventHandlers.length === 0) {
        log.warn(`No handlers for event type: ${event.type}`, { eventId: event.eventId });
      }
      try {
        const handlerErrors: string[] = [];
        for (const handler of eventHandlers) {
          try {
            await handler(event);
          } catch (handlerErr) {
            // Per-handler resilience: log and continue to next handler
            const msg = (handlerErr as Error).message?.slice(0, 200) || 'Unknown handler error';
            handlerErrors.push(msg);
            log.error(`Handler failed for ${event.type}`, { eventId: event.eventId, error: msg });
          }
        }
        // If ANY handler failed, treat as event failure (for retry)
        if (handlerErrors.length > 0) {
          throw new Error(`${handlerErrors.length} handler(s) failed: ${handlerErrors[0]}`);
        }
        await Event.updateOne(
          { _id: event._id },
          { $set: { status: 'processed', processedAt: new Date() } }
        );
        processed++;
      } catch (err) {
        const retryCount = event.retryCount + 1;
        const isDead = retryCount >= event.maxRetries;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);

        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              status: isDead ? 'dead_letter' : 'pending',
              retryCount,
              lastError: (err as Error).message?.slice(0, 500),
              scheduledAt: isDead ? undefined : new Date(Date.now() + backoffMs),
            },
          }
        );

        if (isDead) {
          log.error(`Event dead-lettered: ${event.type} ${event.eventId}`, {
            eventId: event.eventId,
            retryCount: String(retryCount),
            error: (err as Error).message,
          });
        } else {
          log.warn(
            `Event retry scheduled: ${event.type} ${event.eventId} (attempt ${retryCount})`,
            { eventId: event.eventId, backoffMs: String(backoffMs) }
          );
        }
      }
    }
    return processed;
  },

  /**
   * Start a polling worker loop.
   */
  startWorker(intervalMs = 1000): NodeJS.Timeout {
    log.info('Event bus worker started', { intervalMs: String(intervalMs) });
    return setInterval(async () => {
      try {
        await eventBus.processNext();
      } catch (err) {
        log.error('Event bus worker error', { error: (err as Error).message });
      }
    }, intervalMs);
  },

  /** Get total handler count (for health checks). */
  getHandlerCount(): number {
    let count = 0;
    handlers.forEach((h) => (count += h.length));
    return count;
  },

  /** Get pending event count (for health checks). */
  async getPendingCount(): Promise<number> {
    return Event.countDocuments({ status: 'pending' });
  },

  /** Get dead letter event count. */
  async getDeadLetterCount(): Promise<number> {
    return Event.countDocuments({ status: 'dead_letter' });
  },
};
