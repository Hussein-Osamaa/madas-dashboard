import { AuditLog, IAuditEntry, ActorType } from './audit.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('audit');

export interface AuditEntry {
  actor: string;
  actorType: ActorType;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  tenantId?: string | null;
  details?: Record<string, unknown>;
  correlationId?: string | null;
}

export interface AuditQueryFilters {
  tenantId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export const auditService = {
  /**
   * Append an audit entry. This is insert-only — no updates or deletes.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await AuditLog.create({
        ...entry,
        details: entry.details ?? {},
        timestamp: new Date(),
      });
      log.debug(`Audit logged: ${entry.module}.${entry.action} on ${entry.entityType}:${entry.entityId}`, {
        tenantId: entry.tenantId ?? undefined,
        actor: entry.actor,
      });
    } catch (err) {
      // Audit logging failures should not break the calling operation
      log.error('Failed to write audit log', {
        error: (err as Error).message,
        module: entry.module,
        action: entry.action,
      });
    }
  },

  /**
   * Query audit entries with optional filters.
   */
  async query(filters: AuditQueryFilters): Promise<IAuditEntry[]> {
    const query: Record<string, unknown> = {};

    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.module) query.module = filters.module;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;

    if (filters.from || filters.to) {
      const timeFilter: Record<string, Date> = {};
      if (filters.from) timeFilter.$gte = filters.from;
      if (filters.to) timeFilter.$lte = filters.to;
      query.timestamp = timeFilter;
    }

    const limit = Math.min(filters.limit ?? 100, 1000);

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean<IAuditEntry[]>();
  },
};
