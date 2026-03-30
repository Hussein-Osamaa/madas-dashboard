/**
 * Shipping service — core business logic for shipment lifecycle.
 *
 * Shipping does NOT own orders, stock, or finance.
 * It owns shipments, carriers, and tracking.
 * It emits events that other modules (Orders, Finance) consume.
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../lib/logger';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { Shipment, IShipment, ShipmentStatus, IShippingAddress, validateShipmentTransition } from './shipment.schema';
import { Carrier } from './carrier.schema';
import { TrackingEvent, TrackingEventSource } from './tracking-event.schema';
import { CodCollection } from './cod-collection.schema';

const log = createLogger('shipping');

/* ── Input types ───────────────────────────────────────────────── */

export interface CreateShipmentData {
  fulfillmentJobId?: string;
  shippingAddress: Partial<IShippingAddress>;
  codAmount?: number;
  carrierId?: string;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateReturnShipmentData {
  shippingAddress: Partial<IShippingAddress>;
  carrierId?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackingEventData {
  location?: string;
  rawData?: Record<string, unknown>;
}

export interface CodReportData {
  reportDate: Date;
  expectedAmount: number;
  actualAmount: number;
  currency?: string;
  shipmentIds: string[];
  metadata?: Record<string, unknown>;
}

export interface ShipmentListFilters {
  status?: ShipmentStatus;
  type?: 'outbound' | 'return';
  carrierId?: string;
  page?: number;
  limit?: number;
}

/* ── Service ───────────────────────────────────────────────────── */

export const shippingService = {
  /**
   * Create an outbound shipment for an order.
   */
  async createShipment(
    tenantId: string,
    businessId: string,
    orderId: string,
    data: CreateShipmentData,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipmentId = uuidv4();

    const shipment = await Shipment.create({
      shipmentId,
      tenantId,
      businessId,
      orderId,
      fulfillmentJobId: data.fulfillmentJobId,
      type: 'outbound',
      carrierId: data.carrierId,
      status: 'created',
      shippingAddress: {
        address: data.shippingAddress.address || '',
        city: data.shippingAddress.city || '',
        state: data.shippingAddress.state,
        postalCode: data.shippingAddress.postalCode,
        country: data.shippingAddress.country || 'EG',
      },
      codAmount: data.codAmount ?? 0,
      codCollected: false,
      retryCount: 0,
      maxRetries: data.maxRetries ?? 3,
      metadata: data.metadata,
    });

    await eventBus.safePublish('shipment.created', {
      shipmentId,
      orderId,
      tenantId,
      businessId,
      type: 'outbound',
    }, { tenantId, correlationId });

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'shipping',
      action: 'shipment.created',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId,
      details: { orderId, type: 'outbound' },
      correlationId,
    });

    log.info(`Shipment created: ${shipmentId} for order ${orderId}`, { tenantId, shipmentId });
    return shipment;
  },

  /**
   * Create a return shipment (reverse logistics).
   */
  async createReturnShipment(
    tenantId: string,
    businessId: string,
    returnId: string,
    orderId: string,
    data: CreateReturnShipmentData,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipmentId = uuidv4();

    const shipment = await Shipment.create({
      shipmentId,
      tenantId,
      businessId,
      orderId,
      returnId,
      type: 'return',
      carrierId: data.carrierId,
      status: 'created',
      shippingAddress: {
        address: data.shippingAddress.address || '',
        city: data.shippingAddress.city || '',
        state: data.shippingAddress.state,
        postalCode: data.shippingAddress.postalCode,
        country: data.shippingAddress.country || 'EG',
      },
      codAmount: 0,
      codCollected: false,
      retryCount: 0,
      maxRetries: 3,
      metadata: data.metadata,
    });

    await eventBus.safePublish('shipment.created', {
      shipmentId,
      orderId,
      returnId,
      tenantId,
      businessId,
      type: 'return',
    }, { tenantId, correlationId });

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'shipping',
      action: 'shipment.created',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId,
      details: { orderId, returnId, type: 'return' },
      correlationId,
    });

    log.info(`Return shipment created: ${shipmentId} for return ${returnId}`, { tenantId, shipmentId });
    return shipment;
  },

  /**
   * Generate a shipping label for a shipment.
   * In production this calls the carrier API; for now generates a placeholder.
   */
  async generateLabel(shipmentId: string, correlationId?: string): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    validateShipmentTransition(shipment.status, 'label_generated');

    // Placeholder AWB generation — replace with carrier API call in production
    const trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const awb = trackingNumber;
    const labelUrl = `/labels/${shipmentId}.pdf`; // Placeholder

    shipment.status = 'label_generated';
    shipment.trackingNumber = trackingNumber;
    shipment.awb = awb;
    shipment.labelUrl = labelUrl;
    await shipment.save();

    await TrackingEvent.create({
      shipmentId,
      tenantId: shipment.tenantId,
      status: 'label_generated',
      source: 'manual' as TrackingEventSource,
      timestamp: new Date(),
    });

    await eventBus.safePublish('shipment.label_generated', {
      shipmentId,
      orderId: shipment.orderId,
      tenantId: shipment.tenantId,
      trackingNumber,
      awb,
      labelUrl,
    }, { tenantId: shipment.tenantId, correlationId });

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'shipping',
      action: 'shipment.label_generated',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId: shipment.tenantId,
      details: { trackingNumber, awb },
      correlationId,
    });

    log.info(`Label generated for shipment ${shipmentId}: ${trackingNumber}`, { tenantId: shipment.tenantId });
    return shipment;
  },

  /**
   * Book a carrier for pickup.
   */
  async bookCarrier(shipmentId: string, correlationId?: string): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    validateShipmentTransition(shipment.status, 'carrier_booked');

    shipment.status = 'carrier_booked';
    await shipment.save();

    await TrackingEvent.create({
      shipmentId,
      tenantId: shipment.tenantId,
      status: 'carrier_booked',
      source: 'manual' as TrackingEventSource,
      timestamp: new Date(),
    });

    await eventBus.safePublish('shipment.carrier_booked', {
      shipmentId,
      orderId: shipment.orderId,
      tenantId: shipment.tenantId,
      carrierId: shipment.carrierId,
    }, { tenantId: shipment.tenantId, correlationId });

    log.info(`Carrier booked for shipment ${shipmentId}`, { tenantId: shipment.tenantId });
    return shipment;
  },

  /**
   * Update tracking status for a shipment.
   * Idempotent: if the current status matches newStatus, it is a no-op.
   */
  async updateTracking(
    shipmentId: string,
    newStatus: ShipmentStatus,
    eventData: TrackingEventData,
    source: TrackingEventSource,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    // Idempotency: same status repeated = no-op
    if (shipment.status === newStatus) {
      log.debug(`Idempotent skip: shipment ${shipmentId} already in status ${newStatus}`, { tenantId: shipment.tenantId });
      return shipment;
    }

    validateShipmentTransition(shipment.status, newStatus);

    shipment.status = newStatus;

    // Set milestone timestamps
    if (newStatus === 'picked_up') {
      shipment.pickedUpAt = new Date();
    } else if (newStatus === 'delivered') {
      shipment.deliveredAt = new Date();
      if (shipment.codAmount > 0) {
        shipment.codCollected = true;
      }
    }

    await shipment.save();

    await TrackingEvent.create({
      shipmentId,
      tenantId: shipment.tenantId,
      status: newStatus,
      location: eventData.location,
      rawData: eventData.rawData,
      source,
      timestamp: new Date(),
    });

    // Emit status-specific events
    const eventPayload = {
      shipmentId,
      orderId: shipment.orderId,
      tenantId: shipment.tenantId,
      businessId: shipment.businessId,
      status: newStatus,
      trackingNumber: shipment.trackingNumber,
    };

    switch (newStatus) {
      case 'picked_up':
        await eventBus.safePublish('shipment.picked_up', eventPayload, { tenantId: shipment.tenantId, correlationId });
        break;
      case 'in_transit':
        await eventBus.safePublish('shipment.in_transit', eventPayload, { tenantId: shipment.tenantId, correlationId });
        break;
      case 'out_for_delivery':
        await eventBus.safePublish('shipment.out_for_delivery', eventPayload, { tenantId: shipment.tenantId, correlationId });
        break;
      case 'delivered':
        await eventBus.safePublish('shipment.delivered', {
          ...eventPayload,
          codAmount: shipment.codAmount,
          codCollected: shipment.codCollected,
          type: shipment.type,
        }, { tenantId: shipment.tenantId, correlationId });
        break;
      case 'failed_delivery':
        await shippingService.handleFailedDelivery(shipmentId, correlationId);
        break;
      case 'returned_to_sender':
        await eventBus.safePublish('shipment.returned_to_sender', eventPayload, { tenantId: shipment.tenantId, correlationId });
        break;
      case 'exception':
        await eventBus.safePublish('shipment.exception', eventPayload, { tenantId: shipment.tenantId, correlationId });
        break;
      default:
        break;
    }

    log.info(`Tracking updated: shipment ${shipmentId} -> ${newStatus}`, { tenantId: shipment.tenantId, source });
    return shipment;
  },

  /**
   * Handle a failed delivery: increment retry count and decide next step.
   */
  async handleFailedDelivery(shipmentId: string, correlationId?: string): Promise<void> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    shipment.retryCount += 1;
    await shipment.save();

    if (shipment.retryCount < shipment.maxRetries) {
      log.info(`Failed delivery retry scheduled: shipment ${shipmentId}, attempt ${shipment.retryCount}/${shipment.maxRetries}`, { tenantId: shipment.tenantId });
      // Retry will be picked up by processFailedDeliveryRetries job
    } else {
      // Max retries exhausted — emit event for merchant decision
      await eventBus.safePublish('shipment.failed_delivery', {
        shipmentId,
        orderId: shipment.orderId,
        tenantId: shipment.tenantId,
        businessId: shipment.businessId,
        retryCount: shipment.retryCount,
        maxRetries: shipment.maxRetries,
        final: true,
      }, { tenantId: shipment.tenantId, correlationId });

      log.warn(`Shipment ${shipmentId} exhausted all ${shipment.maxRetries} delivery retries`, { tenantId: shipment.tenantId });
    }

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'shipping',
      action: 'shipment.failed_delivery',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId: shipment.tenantId,
      details: { retryCount: shipment.retryCount, maxRetries: shipment.maxRetries },
      correlationId,
    });
  },

  /**
   * Admin/merchant manual tracking status update.
   */
  async manualTracking(
    shipmentId: string,
    status: ShipmentStatus,
    actor: string,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipment = await shippingService.updateTracking(shipmentId, status, {}, 'manual', correlationId);

    await auditService.log({
      actor,
      actorType: 'user',
      module: 'shipping',
      action: 'shipment.manual_tracking',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId: shipment.tenantId,
      details: { status },
      correlationId,
    });

    log.info(`Manual tracking update: shipment ${shipmentId} -> ${status} by ${actor}`, { tenantId: shipment.tenantId });
    return shipment;
  },

  /**
   * Override the carrier assignment for a shipment (before pickup).
   */
  async overrideCarrier(
    shipmentId: string,
    newCarrierId: string,
    actor: string,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    // Can only override before physical pickup
    const prePickupStatuses: string[] = ['created', 'label_generated', 'carrier_booked'];
    if (!prePickupStatuses.includes(shipment.status)) {
      throw new Error(`Cannot override carrier: shipment ${shipmentId} is already in status ${shipment.status}`);
    }

    const oldCarrierId = shipment.carrierId;
    shipment.carrierId = newCarrierId;
    await shipment.save();

    await auditService.log({
      actor,
      actorType: 'user',
      module: 'shipping',
      action: 'shipment.carrier_override',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId: shipment.tenantId,
      details: { oldCarrierId, newCarrierId },
      correlationId,
    });

    log.info(`Carrier override: shipment ${shipmentId}, ${oldCarrierId || 'none'} -> ${newCarrierId} by ${actor}`, { tenantId: shipment.tenantId });
    return shipment;
  },

  /**
   * Cancel a shipment (only before physical pickup).
   */
  async cancelShipment(
    shipmentId: string,
    reason: string,
    actor: string,
    correlationId?: string,
  ): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) throw new Error(`Shipment not found: ${shipmentId}`);

    validateShipmentTransition(shipment.status, 'cancelled');

    shipment.status = 'cancelled';
    await shipment.save();

    await TrackingEvent.create({
      shipmentId,
      tenantId: shipment.tenantId,
      status: 'cancelled',
      source: 'manual' as TrackingEventSource,
      timestamp: new Date(),
    });

    await eventBus.safePublish('shipment.cancelled', {
      shipmentId,
      orderId: shipment.orderId,
      tenantId: shipment.tenantId,
      businessId: shipment.businessId,
      reason,
    }, { tenantId: shipment.tenantId, correlationId });

    await auditService.log({
      actor,
      actorType: actor === 'system' ? 'system' : 'user',
      module: 'shipping',
      action: 'shipment.cancelled',
      entityType: 'shipment',
      entityId: shipmentId,
      tenantId: shipment.tenantId,
      details: { reason },
      correlationId,
    });

    log.info(`Shipment cancelled: ${shipmentId} by ${actor}, reason: ${reason}`, { tenantId: shipment.tenantId });
    return shipment;
  },

  /**
   * Record a COD collection report from a carrier.
   */
  async recordCodCollection(
    tenantId: string,
    businessId: string,
    carrierId: string,
    reportData: CodReportData,
    correlationId?: string,
  ): Promise<void> {
    const discrepancy = reportData.expectedAmount - reportData.actualAmount;
    const status = Math.abs(discrepancy) < 0.01 ? 'reconciled' : 'discrepancy';

    await CodCollection.create({
      tenantId,
      businessId,
      carrierId,
      reportDate: reportData.reportDate,
      expectedAmount: reportData.expectedAmount,
      actualAmount: reportData.actualAmount,
      discrepancy,
      currency: reportData.currency || 'EGP',
      status,
      shipmentIds: reportData.shipmentIds,
      metadata: reportData.metadata,
    });

    // Emit cod.collected for each shipment in the report
    for (const sid of reportData.shipmentIds) {
      await eventBus.safePublish('cod.collected', {
        shipmentId: sid,
        tenantId,
        businessId,
        carrierId,
        amount: reportData.actualAmount / reportData.shipmentIds.length, // pro-rata
      }, { tenantId, correlationId });
    }

    await auditService.log({
      actor: 'system',
      actorType: 'system',
      module: 'shipping',
      action: 'cod.collection_recorded',
      entityType: 'cod_collection',
      entityId: carrierId,
      tenantId,
      details: {
        expectedAmount: reportData.expectedAmount,
        actualAmount: reportData.actualAmount,
        discrepancy,
        status,
        shipmentCount: reportData.shipmentIds.length,
      },
      correlationId,
    });

    log.info(`COD collection recorded: carrier ${carrierId}, expected=${reportData.expectedAmount}, actual=${reportData.actualAmount}, status=${status}`, { tenantId });
  },

  /**
   * Load a shipment by orderId.
   */
  async getShipmentByOrder(orderId: string): Promise<IShipment | null> {
    return Shipment.findOne({ orderId }).lean<IShipment>();
  },

  /**
   * Load a shipment by shipmentId.
   */
  async getShipment(shipmentId: string): Promise<IShipment | null> {
    return Shipment.findOne({ shipmentId }).lean<IShipment>();
  },

  /**
   * Paginated list of shipments for a tenant.
   */
  async listShipments(tenantId: string, filters: ShipmentListFilters = {}): Promise<{ shipments: IShipment[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.carrierId) query.carrierId = filters.carrierId;

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
      Shipment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IShipment[]>(),
      Shipment.countDocuments(query),
    ]);

    return { shipments, total };
  },

  /**
   * Public tracking lookup by tracking number.
   */
  async getPublicTracking(tenantId: string, trackingNumber: string): Promise<{ shipment: IShipment | null; events: unknown[] }> {
    const shipment = await Shipment.findOne({ tenantId, trackingNumber }).lean<IShipment>();
    if (!shipment) return { shipment: null, events: [] };

    const events = await TrackingEvent.find({ shipmentId: shipment.shipmentId })
      .sort({ timestamp: 1 })
      .select('status location timestamp source')
      .lean();

    return { shipment, events };
  },
};
