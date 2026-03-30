export { eventBus } from './event-bus.service';
export { tenantService } from './tenant.service';
export { planService } from './plan.service';
export { featureFlagService } from './feature-flag.service';
export { auditService } from './audit.service';
export type { AuditEntry, AuditQueryFilters } from './audit.service';
export { healthService } from './health.service';
export type { HealthCheck } from './health.service';

// Re-export schemas for direct access when needed
export { Event } from './event-bus.schema';
export type { IEvent } from './event-bus.schema';
export { Tenant } from './tenant.schema';
export type { ITenant, TenantStatus, PlanActivation } from './tenant.schema';
export { Plan } from './plan.schema';
export type { IPlan, IPlanLimits } from './plan.schema';
export { FeatureFlag } from './feature-flag.schema';
export type { IFeatureFlag } from './feature-flag.schema';
export { AuditLog } from './audit.schema';
export type { IAuditEntry, ActorType } from './audit.schema';

// Event type constants and payload interfaces
export * from './event-types';
