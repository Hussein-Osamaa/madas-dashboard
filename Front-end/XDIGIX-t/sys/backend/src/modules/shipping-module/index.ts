/**
 * Shipping module — public API barrel export.
 */

// Schemas & types
export {
  Shipment,
  type IShipment,
  type IShippingAddress,
  type ShipmentStatus,
  VALID_TRANSITIONS,
  canTransitionShipment,
  validateShipmentTransition,
} from './shipment.schema';

export {
  Carrier,
  type ICarrier,
  type CarrierType,
  type CarrierStatus,
} from './carrier.schema';

export {
  TrackingEvent,
  type ITrackingEvent,
  type TrackingEventSource,
} from './tracking-event.schema';

export {
  ShippingZone,
  type IShippingZone,
} from './shipping-zone.schema';

export {
  CodCollection,
  type ICodCollection,
  type CodCollectionStatus,
} from './cod-collection.schema';

// Service
export { shippingService } from './shipping.service';

// Event handlers
export { registerShippingEventHandlers } from './shipping.events';

// Background jobs
export { pollCarrierTracking, processFailedDeliveryRetries } from './shipping.jobs';

// Routes
export { default as shippingModuleRoutes } from './shipping.routes';
