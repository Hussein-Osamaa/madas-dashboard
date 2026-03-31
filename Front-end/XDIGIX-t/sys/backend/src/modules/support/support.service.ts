/**
 * Support service — ticket lifecycle, messages, assignment, SLA, context enrichment.
 *
 * Owns: Ticket, TicketMessage, SlaConfig, CannedResponse collections.
 * Reads: StorefrontOrder, Shipment, Tenant (context enrichment only, never mutates).
 */
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { Ticket, ITicket, TicketStatus, TicketPriority, validateTransition } from './ticket.schema';
import { TicketMessage, ITicketMessage, IMessageSender } from './ticket-message.schema';
import { SlaConfig, ISlaConfig, DEFAULT_SLA } from './sla-config.schema';
import { CannedResponse, ICannedResponse } from './canned-response.schema';
import { auditService } from '../platform-core/audit.service';
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('support');

/* ── Types ────────────────────────────────────────────────────────── */

export interface CreateTicketInput {
  tenantId: string;
  subject: string;
  message: string;
  priority?: TicketPriority;
  category?: string;
  visibility?: 'tenant' | 'internal';
  createdBy: { type: 'customer' | 'merchant' | 'agent' | 'system'; userId?: string; email: string };
  linkedOrderId?: string;
  linkedShipmentId?: string;
  linkedReturnId?: string;
  tags?: string[];
}

export interface ListTicketsFilters {
  tenantId?: string;
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority;
  assignedTo?: string;
  category?: string;
  visibility?: 'tenant' | 'internal';
  page?: number;
  limit?: number;
}

/* ── Service ──────────────────────────────────────────────────────── */

export const supportService = {

  /* ─── Ticket CRUD ───────────────────────────────────────────────── */

  async createTicket(input: CreateTicketInput): Promise<ITicket> {
    const ticketId = `TKT-${uuidv4().slice(0, 8).toUpperCase()}`;

    const ticket = await Ticket.create({
      ticketId,
      tenantId: input.tenantId,
      subject: input.subject,
      status: 'open',
      priority: input.priority || 'medium',
      category: input.category || 'general',
      visibility: input.visibility || 'tenant',
      createdBy: input.createdBy,
      linkedOrderId: input.linkedOrderId || null,
      linkedShipmentId: input.linkedShipmentId || null,
      linkedReturnId: input.linkedReturnId || null,
      tags: input.tags || [],
    });

    // Create the initial message
    await TicketMessage.create({
      ticketId,
      sender: input.createdBy,
      message: input.message,
      internal: false,
    });

    await auditService.log({
      actor: input.createdBy.email,
      actorType: input.createdBy.type === 'system' ? 'system' : 'user',
      module: 'support',
      action: 'ticket_created',
      entityType: 'ticket',
      entityId: ticketId,
      tenantId: input.tenantId,
      details: {
        priority: ticket.priority,
        category: ticket.category,
        linkedOrderId: input.linkedOrderId,
      },
    });

    await eventBus.safePublish(
      'ticket.created',
      { ticketId, tenantId: input.tenantId, subject: input.subject, priority: ticket.priority },
      { tenantId: input.tenantId },
    );

    log.info(`Ticket created: ${ticketId}`, { tenantId: input.tenantId });
    return ticket;
  },

  async getTicket(ticketId: string): Promise<ITicket | null> {
    return Ticket.findOne({ ticketId }).lean<ITicket>();
  },

  async listTickets(filters: ListTicketsFilters) {
    const query: Record<string, unknown> = {};
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.status) {
      query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query['assignedTo.userId'] = filters.assignedTo;
    if (filters.category) query.category = filters.category;
    if (filters.visibility) query.visibility = filters.visibility;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(Math.max(1, filters.limit || 50), 200);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ITicket[]>(),
      Ticket.countDocuments(query),
    ]);

    return { tickets, total, page, limit };
  },

  /* ─── Status transitions ────────────────────────────────────────── */

  async updateStatus(
    ticketId: string,
    newStatus: TicketStatus,
    actor: { email: string; type: string },
  ): Promise<ITicket | null> {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return null;

    validateTransition(ticket.status, newStatus);

    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'resolved' && !ticket.resolvedAt) {
      updates.resolvedAt = new Date();
    }
    if (newStatus === 'closed' && !ticket.closedAt) {
      updates.closedAt = new Date();
      if (!ticket.resolvedAt) updates.resolvedAt = new Date();
    }
    if (newStatus === 'open' && ticket.status === 'closed') {
      // Reopen — clear resolved/closed timestamps
      updates.resolvedAt = null;
      updates.closedAt = null;
    }

    const updated = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: updates },
      { new: true },
    ).lean<ITicket>();

    await auditService.log({
      actor: actor.email,
      actorType: actor.type === 'system' ? 'system' : 'admin',
      module: 'support',
      action: `ticket_${newStatus}`,
      entityType: 'ticket',
      entityId: ticketId,
      tenantId: ticket.tenantId,
      details: { previousStatus: ticket.status, newStatus },
    });

    if (newStatus === 'resolved') {
      await eventBus.safePublish(
        'ticket.resolved',
        { ticketId, tenantId: ticket.tenantId },
        { tenantId: ticket.tenantId },
      );
    }
    if (newStatus === 'closed') {
      await eventBus.safePublish(
        'ticket.closed',
        { ticketId, tenantId: ticket.tenantId },
        { tenantId: ticket.tenantId },
      );
    }

    return updated;
  },

  async escalate(
    ticketId: string,
    actor: { email: string; type: string },
    reason?: string,
  ): Promise<ITicket | null> {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return null;

    // Escalate: bump priority to next level
    const priorityOrder: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
    const currentIdx = priorityOrder.indexOf(ticket.priority);
    const newPriority = currentIdx < priorityOrder.length - 1
      ? priorityOrder[currentIdx + 1]
      : 'urgent';

    const updated = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: { priority: newPriority } },
      { new: true },
    ).lean<ITicket>();

    await auditService.log({
      actor: actor.email,
      actorType: 'admin',
      module: 'support',
      action: 'ticket_escalated',
      entityType: 'ticket',
      entityId: ticketId,
      tenantId: ticket.tenantId,
      details: { previousPriority: ticket.priority, newPriority, reason },
    });

    await eventBus.safePublish(
      'ticket.escalated',
      { ticketId, tenantId: ticket.tenantId, priority: newPriority, reason },
      { tenantId: ticket.tenantId },
    );

    log.info(`Ticket escalated: ${ticketId} → ${newPriority}`, { tenantId: ticket.tenantId });
    return updated;
  },

  async close(
    ticketId: string,
    actor: { email: string; type: string },
  ): Promise<ITicket | null> {
    return this.updateStatus(ticketId, 'closed', actor);
  },

  async reopen(
    ticketId: string,
    actor: { email: string; type: string },
  ): Promise<ITicket | null> {
    return this.updateStatus(ticketId, 'open', actor);
  },

  /* ─── Assignment ────────────────────────────────────────────────── */

  async assignTicket(
    ticketId: string,
    assignee: { type: 'agent' | 'system'; userId: string },
    actor: { email: string; type: string },
  ): Promise<ITicket | null> {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return null;

    const updates: Record<string, unknown> = { assignedTo: assignee };
    // Auto-transition to in_progress if still open
    if (ticket.status === 'open') {
      updates.status = 'in_progress';
    }

    const updated = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: updates },
      { new: true },
    ).lean<ITicket>();

    await auditService.log({
      actor: actor.email,
      actorType: 'admin',
      module: 'support',
      action: 'ticket_assigned',
      entityType: 'ticket',
      entityId: ticketId,
      tenantId: ticket.tenantId,
      details: { assignedTo: assignee.userId },
    });

    await eventBus.safePublish(
      'ticket.assigned',
      { ticketId, tenantId: ticket.tenantId, assignedTo: assignee.userId },
      { tenantId: ticket.tenantId },
    );

    log.info(`Ticket assigned: ${ticketId} → ${assignee.userId}`, { tenantId: ticket.tenantId });
    return updated;
  },

  /* ─── Messages ──────────────────────────────────────────────────── */

  async addMessage(
    ticketId: string,
    sender: IMessageSender,
    message: string,
    options?: { internal?: boolean; attachments?: string[] },
  ): Promise<ITicketMessage | null> {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return null;

    const msg = await TicketMessage.create({
      ticketId,
      sender,
      message,
      attachments: options?.attachments || [],
      internal: options?.internal || false,
    });

    // Track first response time (agent/system replies to customer/merchant ticket)
    if (
      !ticket.firstResponseAt &&
      (sender.type === 'agent' || sender.type === 'system') &&
      (ticket.createdBy.type === 'customer' || ticket.createdBy.type === 'merchant')
    ) {
      await Ticket.updateOne({ ticketId }, { $set: { firstResponseAt: new Date() } });
    }

    return msg;
  },

  async listMessages(
    ticketId: string,
    options?: { includeInternal?: boolean },
  ): Promise<ITicketMessage[]> {
    const query: Record<string, unknown> = { ticketId };
    if (!options?.includeInternal) {
      query.internal = false;
    }
    return TicketMessage.find(query).sort({ createdAt: 1 }).lean<ITicketMessage[]>();
  },

  /* ─── Context enrichment ────────────────────────────────────────── */

  async enrichTicket(ticket: ITicket): Promise<Record<string, unknown>> {
    const enriched: Record<string, unknown> = { ...ticket };
    const promises: Array<Promise<void>> = [];

    if (ticket.linkedOrderId) {
      promises.push(
        (async () => {
          const Order = mongoose.models.StorefrontOrder;
          if (Order) {
            const order = await Order.findOne(
              { orderId: ticket.linkedOrderId },
              { orderId: 1, status: 1, total: 1, paymentMethod: 1, createdAt: 1 },
            ).lean();
            enriched.linkedOrder = order || null;
          }
        })(),
      );
    }

    if (ticket.linkedShipmentId) {
      promises.push(
        (async () => {
          const Shipment = mongoose.models.Shipment;
          if (Shipment) {
            const shipment = await Shipment.findOne(
              { shipmentId: ticket.linkedShipmentId },
              { shipmentId: 1, status: 1, trackingNumber: 1, carrierId: 1, createdAt: 1 },
            ).lean();
            enriched.linkedShipment = shipment || null;
          }
        })(),
      );
    }

    if (ticket.tenantId) {
      promises.push(
        (async () => {
          const Tenant = mongoose.models.Tenant;
          if (Tenant) {
            const tenant = await Tenant.findOne(
              { tenantId: ticket.tenantId },
              { tenantId: 1, plan: 1, status: 1 },
            ).lean();
            enriched.tenantContext = tenant || null;
          }
        })(),
      );
    }

    await Promise.all(promises);
    return enriched;
  },

  /* ─── SLA ───────────────────────────────────────────────────────── */

  async getSlaStatus(ticketId: string) {
    const ticket = await Ticket.findOne({ ticketId }).lean<ITicket>();
    if (!ticket) return null;

    const sla = await SlaConfig.findOne({ priority: ticket.priority }).lean<ISlaConfig>();
    if (!sla) return { ticketId, priority: ticket.priority, sla: null, message: 'No SLA configured' };

    const now = new Date();
    const createdAt = new Date(ticket.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    const ageMins = Math.floor(ageMs / 60000);

    // First response SLA
    const responseDeadline = new Date(createdAt.getTime() + sla.responseTimeMins * 60000);
    const responseBreached = !ticket.firstResponseAt && now > responseDeadline;
    const responseMet = !!ticket.firstResponseAt &&
      new Date(ticket.firstResponseAt).getTime() <= responseDeadline.getTime();

    // Resolution SLA
    const resolutionDeadline = new Date(createdAt.getTime() + sla.resolutionTimeMins * 60000);
    const resolved = ticket.status === 'resolved' || ticket.status === 'closed';
    const resolutionBreached = !resolved && now > resolutionDeadline;
    const resolutionMet = resolved && ticket.resolvedAt &&
      new Date(ticket.resolvedAt).getTime() <= resolutionDeadline.getTime();

    return {
      ticketId,
      priority: ticket.priority,
      status: ticket.status,
      ageMins,
      sla: {
        responseTimeMins: sla.responseTimeMins,
        resolutionTimeMins: sla.resolutionTimeMins,
      },
      response: {
        deadline: responseDeadline,
        met: responseMet,
        breached: responseBreached,
        respondedAt: ticket.firstResponseAt || null,
      },
      resolution: {
        deadline: resolutionDeadline,
        met: resolutionMet || false,
        breached: resolutionBreached,
        resolvedAt: ticket.resolvedAt || null,
      },
      overdue: responseBreached || resolutionBreached,
    };
  },

  async seedSlaDefaults(): Promise<void> {
    for (const sla of DEFAULT_SLA) {
      await SlaConfig.updateOne(
        { priority: sla.priority },
        { $setOnInsert: sla },
        { upsert: true },
      );
    }
    log.info('SLA defaults seeded');
  },

  /* ─── Canned responses ──────────────────────────────────────────── */

  async listCannedResponses(category?: string) {
    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    return CannedResponse.find(query).sort({ title: 1 }).lean<ICannedResponse[]>();
  },

  async createCannedResponse(input: {
    title: string;
    category?: string;
    body: string;
    createdBy: string;
  }): Promise<ICannedResponse> {
    const cannedResponseId = `CR-${uuidv4().slice(0, 8).toUpperCase()}`;
    return CannedResponse.create({
      cannedResponseId,
      title: input.title,
      category: input.category || 'general',
      body: input.body,
      createdBy: input.createdBy,
    });
  },

  async updateCannedResponse(
    cannedResponseId: string,
    updates: { title?: string; category?: string; body?: string },
  ): Promise<ICannedResponse | null> {
    return CannedResponse.findOneAndUpdate(
      { cannedResponseId },
      { $set: updates },
      { new: true },
    ).lean<ICannedResponse>();
  },

  async deleteCannedResponse(cannedResponseId: string): Promise<boolean> {
    const result = await CannedResponse.deleteOne({ cannedResponseId });
    return result.deletedCount > 0;
  },
};
