/**
 * Fulfillment module — public API barrel export.
 */

// Schemas & types
export {
  FulfillmentJob,
  type IFulfillmentJob,
  type IFulfillmentItem,
  type FulfillmentJobStatus,
  VALID_TRANSITIONS,
  canTransitionJob,
  validateJobTransition,
} from './fulfillment-job.schema';

export {
  WarehouseLocation,
  type IWarehouseLocation,
} from './warehouse-location.schema';

export {
  ReceivingLog,
  type IReceivingLog,
  type IReceivingItem,
} from './receiving-log.schema';

// Service
export { fulfillmentService } from './fulfillment.service';

// Event handlers
export { registerFulfillmentEventHandlers } from './fulfillment.events';

// Background jobs
export { checkOverdueJobs } from './fulfillment.jobs';

// Routes
export { default as fulfillmentRoutes } from './fulfillment.routes';
