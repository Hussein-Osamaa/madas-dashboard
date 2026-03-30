/**
 * Fulfillment Service.
 *
 * Manages the lifecycle of fulfillment jobs (pick, pack, ship)
 * and return receiving / inspection. Does NOT own stock — emits
 * events that the Inventory module handles.
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../lib/logger';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { FulfillmentJob, IFulfillmentJob, IFulfillmentItem, FulfillmentJobStatus, validateJobTransition } from './fulfillment-job.schema';
import { ReceivingLog, IReceivingItem } from './receiving-log.schema';

const log = createLogger('fulfillment');

/* ── Helper ─────────────────────────────────────────────────────── */

function audit(
  action: string,
  entityType: string,
  entityId: string,
  actor: string,
  tenantId?: string,
  details?: Record<string, unknown>,
  correlationId?: string,
) {
  auditService.log({
    actor,
    actorType: actor === 'system' ? 'system' : 'user',
    module: 'fulfillment',
    action,
    entityType,
    entityId,
    tenantId,
    details,
    correlationId,
  });
}

/* ── Service ────────────────────────────────────────────────────── */

export const fulfillmentService = {
  /* ── Create Job ─────────────────────────────────────────────── */

  async createJob(
    tenantId: string,
    businessId: string,
    orderId: string,
    items: Omit<IFulfillmentItem, 'pickedQty' | 'packedQty' | 'shortQty'>[],
    priority: 'normal' | 'high' | 'urgent' = 'normal',
  ): Promise<IFulfillmentJob> {
    const fulfillmentJobId = uuidv4();

    const jobItems: IFulfillmentItem[] = items.map((item) => ({
      ...item,
      pickedQty: 0,
      packedQty: 0,
      shortQty: 0,
    }));

    const job = await FulfillmentJob.create({
      fulfillmentJobId,
      tenantId,
      businessId,
      orderId,
      status: 'created',
      items: jobItems,
      priority,
    });

    audit('create_job', 'fulfillment_job', fulfillmentJobId, 'system', tenantId, { orderId, itemCount: items.length });
    log.info('Fulfillment job created', { fulfillmentJobId, orderId, tenantId });

    return job;
  },

  /* ── Read ────────────────────────────────────────────────────── */

  async getJob(fulfillmentJobId: string): Promise<IFulfillmentJob | null> {
    return FulfillmentJob.findOne({ fulfillmentJobId }).lean<IFulfillmentJob>();
  },

  async listJobs(
    tenantId: string,
    filters: {
      status?: FulfillmentJobStatus;
      assignedTo?: string;
      priority?: 'normal' | 'high' | 'urgent';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ jobs: IFulfillmentJob[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.priority) query.priority = filters.priority;

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(Math.max(1, filters.limit ?? 50), 200);
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      FulfillmentJob.find(query).sort({ priority: -1, createdAt: 1 }).skip(skip).limit(limit).lean<IFulfillmentJob[]>(),
      FulfillmentJob.countDocuments(query),
    ]);

    return { jobs, total };
  },

  /* ── Picking ─────────────────────────────────────────────────── */

  async startPicking(fulfillmentJobId: string, staffId: string, correlationId?: string): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    validateJobTransition(job.status, 'picking');

    job.status = 'picking';
    job.assignedTo = staffId;
    job.startedAt = new Date();
    await job.save();

    await eventBus.safePublish('fulfillment.picking_started', {
      fulfillmentJobId,
      orderId: job.orderId,
      staffId,
    }, { tenantId: job.tenantId, correlationId });

    audit('start_picking', 'fulfillment_job', fulfillmentJobId, staffId, job.tenantId, { orderId: job.orderId }, correlationId);
    log.info('Picking started', { fulfillmentJobId, staffId, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  async completePick(
    fulfillmentJobId: string,
    pickedItems: { lineItemIndex: number; pickedQty: number }[],
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    if (job.status !== 'picking') {
      throw new Error(`Cannot complete pick: job status is '${job.status}', expected 'picking'`);
    }

    // Update picked quantities
    for (const picked of pickedItems) {
      const item = job.items.find((i) => i.lineItemIndex === picked.lineItemIndex);
      if (item) {
        item.pickedQty = picked.pickedQty;
        item.shortQty = Math.max(0, item.qty - picked.pickedQty);
      }
    }

    // Determine outcome
    const allPicked = job.items.every((item) => item.pickedQty >= item.qty);

    if (allPicked) {
      job.status = 'picked';
      await eventBus.safePublish('fulfillment.picked', {
        fulfillmentJobId,
        orderId: job.orderId,
        items: job.items.map((i) => ({ lineItemIndex: i.lineItemIndex, pickedQty: i.pickedQty })),
      }, { tenantId: job.tenantId, correlationId });
    } else {
      job.status = 'short_pick';
      const shortItems = job.items.filter((i) => i.pickedQty < i.qty).map((i) => ({
        lineItemIndex: i.lineItemIndex,
        expected: i.qty,
        picked: i.pickedQty,
        short: i.shortQty,
      }));
      await eventBus.safePublish('fulfillment.short_pick', {
        fulfillmentJobId,
        orderId: job.orderId,
        shortItems,
      }, { tenantId: job.tenantId, correlationId });
    }

    job.pickedAt = new Date();
    job.markModified('items');
    await job.save();

    audit('complete_pick', 'fulfillment_job', fulfillmentJobId, job.assignedTo || 'system', job.tenantId, {
      status: job.status,
      pickedItems,
    }, correlationId);
    log.info('Pick completed', { fulfillmentJobId, status: job.status, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  async reportShortPick(
    fulfillmentJobId: string,
    shortItems: { lineItemIndex: number; shortQty: number }[],
    reason: string,
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    job.shortPickReason = reason;
    for (const si of shortItems) {
      const item = job.items.find((i) => i.lineItemIndex === si.lineItemIndex);
      if (item) {
        item.shortQty = si.shortQty;
      }
    }

    job.markModified('items');
    await job.save();

    audit('report_short_pick', 'fulfillment_job', fulfillmentJobId, job.assignedTo || 'system', job.tenantId, {
      reason,
      shortItems,
    }, correlationId);
    log.info('Short pick reported', { fulfillmentJobId, reason, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  /* ── Packing ─────────────────────────────────────────────────── */

  async startPacking(fulfillmentJobId: string, correlationId?: string): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    validateJobTransition(job.status, 'packing');

    job.status = 'packing';
    await job.save();

    audit('start_packing', 'fulfillment_job', fulfillmentJobId, job.assignedTo || 'system', job.tenantId, {
      orderId: job.orderId,
    }, correlationId);
    log.info('Packing started', { fulfillmentJobId, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  async completePack(
    fulfillmentJobId: string,
    packageDetails?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    validateJobTransition(job.status, 'packed');

    job.status = 'packed';
    job.packedAt = new Date();

    // Update packedQty to match pickedQty
    for (const item of job.items) {
      item.packedQty = item.pickedQty;
    }
    job.markModified('items');
    await job.save();

    await eventBus.safePublish('fulfillment.packed', {
      fulfillmentJobId,
      orderId: job.orderId,
      packageDetails: packageDetails || {},
    }, { tenantId: job.tenantId, correlationId });

    audit('complete_pack', 'fulfillment_job', fulfillmentJobId, job.assignedTo || 'system', job.tenantId, {
      orderId: job.orderId,
      packageDetails,
    }, correlationId);
    log.info('Pack completed', { fulfillmentJobId, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  /* ── Hand to Shipping ───────────────────────────────────────── */

  async handToShipping(fulfillmentJobId: string, correlationId?: string): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    validateJobTransition(job.status, 'handed_to_shipping');

    job.status = 'handed_to_shipping';
    job.handedToShippingAt = new Date();
    await job.save();

    await eventBus.safePublish('fulfillment.handed_to_shipping', {
      fulfillmentJobId,
      orderId: job.orderId,
    }, { tenantId: job.tenantId, correlationId });

    audit('hand_to_shipping', 'fulfillment_job', fulfillmentJobId, job.assignedTo || 'system', job.tenantId, {
      orderId: job.orderId,
    }, correlationId);
    log.info('Handed to shipping', { fulfillmentJobId, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  /* ── Cancel ──────────────────────────────────────────────────── */

  async cancelJob(
    fulfillmentJobId: string,
    reason: string,
    actor: string,
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    validateJobTransition(job.status, 'cancelled');

    job.status = 'cancelled';
    job.notes = reason;
    await job.save();

    audit('cancel_job', 'fulfillment_job', fulfillmentJobId, actor, job.tenantId, {
      reason,
      previousStatus: job.status,
    }, correlationId);
    log.info('Job cancelled', { fulfillmentJobId, reason, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  /* ── Returns ─────────────────────────────────────────────────── */

  async receiveReturn(
    tenantId: string,
    businessId: string,
    returnId: string,
    items: IReceivingItem[],
    staffId: string,
    correlationId?: string,
  ): Promise<typeof ReceivingLog.prototype> {
    const receivingLog = await ReceivingLog.create({
      tenantId,
      businessId,
      type: 'return',
      referenceType: 'return',
      referenceId: returnId,
      items,
      receivedBy: staffId,
    });

    await eventBus.safePublish('return.received', {
      returnId,
      tenantId,
      businessId,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        qty: i.qty,
        condition: i.condition,
      })),
    }, { tenantId, correlationId });

    audit('receive_return', 'receiving_log', receivingLog._id.toString(), staffId, tenantId, {
      returnId,
      itemCount: items.length,
    }, correlationId);
    log.info('Return received', { returnId, tenantId, itemCount: String(items.length) });

    return receivingLog;
  },

  async inspectReturnItem(
    returnId: string,
    lineItemIndex: number,
    condition: 'good' | 'damaged' | 'missing',
    actor: string,
    correlationId?: string,
  ): Promise<void> {
    await eventBus.safePublish('return.inspected', {
      returnId,
      lineItemIndex,
      condition,
    }, { correlationId });

    audit('inspect_return_item', 'return', returnId, actor, undefined, {
      lineItemIndex,
      condition,
    }, correlationId);
    log.info('Return item inspected', { returnId, lineItemIndex: String(lineItemIndex), condition });
  },

  /* ── Admin ───────────────────────────────────────────────────── */

  async escalate(
    fulfillmentJobId: string,
    priority: 'normal' | 'high' | 'urgent',
    reason: string,
    actor: string,
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    const previousPriority = job.priority;
    job.priority = priority;
    await job.save();

    audit('escalate', 'fulfillment_job', fulfillmentJobId, actor, job.tenantId, {
      previousPriority,
      newPriority: priority,
      reason,
    }, correlationId);
    log.info('Job escalated', { fulfillmentJobId, priority, reason, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },

  async forceComplete(
    fulfillmentJobId: string,
    reason: string,
    actor: string,
    correlationId?: string,
  ): Promise<IFulfillmentJob> {
    const job = await FulfillmentJob.findOne({ fulfillmentJobId });
    if (!job) throw new Error(`Fulfillment job not found: ${fulfillmentJobId}`);

    const previousStatus = job.status;
    job.status = 'packed';
    job.packedAt = new Date();
    job.notes = `[FORCE COMPLETE] ${reason}`;
    await job.save();

    audit('force_complete', 'fulfillment_job', fulfillmentJobId, actor, job.tenantId, {
      previousStatus,
      reason,
      warning: 'Admin override — forced to packed status',
    }, correlationId);
    log.warn('Job force-completed by admin', { fulfillmentJobId, previousStatus, reason, actor, tenantId: job.tenantId });

    return job.toObject() as IFulfillmentJob;
  },
};

export default fulfillmentService;
