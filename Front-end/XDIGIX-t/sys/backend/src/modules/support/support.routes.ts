/**
 * Support routes — ticket management, messages, SLA, canned responses.
 *
 * Access control:
 *   - req.tenantId set by JWT middleware → merchants see only own tenant
 *   - req.tenantId undefined (super-admin) → can see all, must pass tenantId in body/query
 *   - Customer-created tickets: POST /api/public/:tenantId/support/tickets (no auth)
 *   - Internal visibility tickets: visible only to agents/admin
 */
import { Router, Request, Response } from 'express';
import { supportService, CreateTicketInput, ListTicketsFilters } from './support.service';
import { TicketStatus, TicketPriority, TICKET_STATUSES, TICKET_PRIORITIES } from './ticket.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('support-routes');
const router = Router();

/* ── Helpers ──────────────────────────────────────────────────────── */

function getActor(req: Request) {
  return {
    email: (req as Record<string, unknown>).userEmail as string || 'unknown',
    type: (req as Record<string, unknown>).userRole as string || 'agent',
  };
}

function getTenantId(req: Request): string | undefined {
  return (req as Record<string, unknown>).tenantId as string | undefined;
}

function enforceTenant(req: Request, res: Response): string | null {
  const tid = getTenantId(req);
  if (!tid) {
    // Super-admin — no restriction
    return null;
  }
  return tid;
}

/* ── Ticket CRUD ──────────────────────────────────────────────────── */

/** POST /tickets — create a new ticket (admin/agent) */
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const tenantScope = enforceTenant(req, res);
    const body = req.body as CreateTicketInput;

    if (!body.subject || !body.message) {
      return res.status(400).json({ ok: false, error: 'subject and message are required' });
    }

    const input: CreateTicketInput = {
      tenantId: tenantScope || body.tenantId,
      subject: body.subject,
      message: body.message,
      priority: TICKET_PRIORITIES.includes(body.priority as TicketPriority) ? body.priority : 'medium',
      category: body.category || 'general',
      visibility: body.visibility === 'internal' ? 'internal' : 'tenant',
      createdBy: body.createdBy || { type: 'agent', email: getActor(req).email },
      linkedOrderId: body.linkedOrderId,
      linkedShipmentId: body.linkedShipmentId,
      linkedReturnId: body.linkedReturnId,
      tags: body.tags,
    };

    if (!input.tenantId) {
      return res.status(400).json({ ok: false, error: 'tenantId is required' });
    }

    const ticket = await supportService.createTicket(input);
    res.status(201).json({ ok: true, ticket });
  } catch (err) {
    log.error('Create ticket failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to create ticket' });
  }
});

/** GET /tickets — list tickets */
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const tenantScope = enforceTenant(req, res);
    const query = req.query as Record<string, string>;

    const filters: ListTicketsFilters = {
      tenantId: tenantScope || query.tenantId,
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      assignedTo: query.assignedTo,
      category: query.category,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
    };

    // Merchants cannot see internal tickets
    if (tenantScope) {
      filters.visibility = 'tenant';
    } else if (query.visibility === 'internal') {
      filters.visibility = 'internal';
    }

    const result = await supportService.listTickets(filters);
    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('List tickets failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list tickets' });
  }
});

/** GET /tickets/:id — get ticket with optional enrichment */
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const tenantScope = enforceTenant(req, res);
    const ticket = await supportService.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });

    // Tenant scoping
    if (tenantScope && ticket.tenantId !== tenantScope) {
      return res.status(404).json({ ok: false, error: 'Ticket not found' });
    }
    // Internal visibility check
    if (tenantScope && ticket.visibility === 'internal') {
      return res.status(404).json({ ok: false, error: 'Ticket not found' });
    }

    const enrich = req.query.enrich === 'true';
    const data = enrich ? await supportService.enrichTicket(ticket) : ticket;
    res.json({ ok: true, ticket: data });
  } catch (err) {
    log.error('Get ticket failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get ticket' });
  }
});

/* ── Status transitions ───────────────────────────────────────────── */

/** PATCH /tickets/:id/status — update ticket status */
router.patch('/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Valid status is required' });
    }
    const ticket = await supportService.updateStatus(req.params.id, status, getActor(req));
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, ticket });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Invalid ticket transition')) {
      return res.status(400).json({ ok: false, error: msg });
    }
    log.error('Update status failed', { error: msg });
    res.status(500).json({ ok: false, error: 'Failed to update status' });
  }
});

/** PATCH /tickets/:id/assign — assign ticket to agent */
router.patch('/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

    const ticket = await supportService.assignTicket(
      req.params.id,
      { type: 'agent', userId },
      getActor(req),
    );
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, ticket });
  } catch (err) {
    log.error('Assign ticket failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to assign ticket' });
  }
});

/** POST /tickets/:id/escalate */
router.post('/tickets/:id/escalate', async (req: Request, res: Response) => {
  try {
    const ticket = await supportService.escalate(req.params.id, getActor(req), req.body.reason);
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, ticket });
  } catch (err) {
    log.error('Escalate failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to escalate ticket' });
  }
});

/** POST /tickets/:id/close */
router.post('/tickets/:id/close', async (req: Request, res: Response) => {
  try {
    const ticket = await supportService.close(req.params.id, getActor(req));
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, ticket });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Invalid ticket transition')) {
      return res.status(400).json({ ok: false, error: msg });
    }
    log.error('Close failed', { error: msg });
    res.status(500).json({ ok: false, error: 'Failed to close ticket' });
  }
});

/** POST /tickets/:id/reopen */
router.post('/tickets/:id/reopen', async (req: Request, res: Response) => {
  try {
    const ticket = await supportService.reopen(req.params.id, getActor(req));
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, ticket });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('Invalid ticket transition')) {
      return res.status(400).json({ ok: false, error: msg });
    }
    log.error('Reopen failed', { error: msg });
    res.status(500).json({ ok: false, error: 'Failed to reopen ticket' });
  }
});

/* ── Messages ─────────────────────────────────────────────────────── */

/** POST /tickets/:id/messages — add a message */
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { message, internal } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'message is required' });

    const actor = getActor(req);
    const msg = await supportService.addMessage(
      req.params.id,
      { type: actor.type as 'agent', email: actor.email },
      message,
      { internal: !!internal, attachments: req.body.attachments },
    );
    if (!msg) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.status(201).json({ ok: true, message: msg });
  } catch (err) {
    log.error('Add message failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to add message' });
  }
});

/** GET /tickets/:id/messages — list messages */
router.get('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const tenantScope = enforceTenant(req, res);
    // Merchants don't see internal messages
    const includeInternal = !tenantScope;
    const messages = await supportService.listMessages(req.params.id, { includeInternal });
    res.json({ ok: true, messages });
  } catch (err) {
    log.error('List messages failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list messages' });
  }
});

/* ── SLA ──────────────────────────────────────────────────────────── */

/** GET /sla/:ticketId — get SLA status for a ticket */
router.get('/sla/:ticketId', async (req: Request, res: Response) => {
  try {
    const sla = await supportService.getSlaStatus(req.params.ticketId);
    if (!sla) return res.status(404).json({ ok: false, error: 'Ticket not found' });
    res.json({ ok: true, sla });
  } catch (err) {
    log.error('Get SLA failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to get SLA status' });
  }
});

/* ── Canned responses ─────────────────────────────────────────────── */

router.get('/canned-responses', async (req: Request, res: Response) => {
  try {
    const items = await supportService.listCannedResponses(req.query.category as string);
    res.json({ ok: true, cannedResponses: items });
  } catch (err) {
    log.error('List canned responses failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to list canned responses' });
  }
});

router.post('/canned-responses', async (req: Request, res: Response) => {
  try {
    const { title, category, body } = req.body;
    if (!title || !body) return res.status(400).json({ ok: false, error: 'title and body required' });
    const item = await supportService.createCannedResponse({
      title, category, body, createdBy: getActor(req).email,
    });
    res.status(201).json({ ok: true, cannedResponse: item });
  } catch (err) {
    log.error('Create canned response failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to create canned response' });
  }
});

router.patch('/canned-responses/:id', async (req: Request, res: Response) => {
  try {
    const { title, category, body } = req.body;
    const updated = await supportService.updateCannedResponse(req.params.id, { title, category, body });
    if (!updated) return res.status(404).json({ ok: false, error: 'Canned response not found' });
    res.json({ ok: true, cannedResponse: updated });
  } catch (err) {
    log.error('Update canned response failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to update canned response' });
  }
});

router.delete('/canned-responses/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await supportService.deleteCannedResponse(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Canned response not found' });
    res.json({ ok: true });
  } catch (err) {
    log.error('Delete canned response failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to delete canned response' });
  }
});

/* ── Public ticket creation (no auth) ─────────────────────────────── */

export const publicSupportRouter = Router();

/** POST /api/public/:tenantId/support/tickets — customer-created ticket */
publicSupportRouter.post('/:tenantId/support/tickets', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { subject, message, email, name, linkedOrderId } = req.body;

    if (!subject || !message || !email) {
      return res.status(400).json({ ok: false, error: 'subject, message, and email are required' });
    }

    const ticket = await supportService.createTicket({
      tenantId,
      subject,
      message,
      priority: 'medium',
      category: 'general',
      visibility: 'tenant',
      createdBy: { type: 'customer', email, userId: name || email },
      linkedOrderId,
    });

    // Return limited info (no internal fields)
    res.status(201).json({
      ok: true,
      ticket: {
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err) {
    log.error('Public ticket creation failed', { error: (err as Error).message });
    res.status(500).json({ ok: false, error: 'Failed to create ticket' });
  }
});

export default router;
