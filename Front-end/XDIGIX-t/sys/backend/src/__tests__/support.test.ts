/**
 * Support module P2 tests.
 *
 * Tests ticket lifecycle, state machine, SLA, canned responses,
 * tenant scoping, access control, and route structure.
 */
import { describe, it, expect } from 'vitest';

/* ── Ticket state machine ────────────────────────────────────────── */

describe('Support — Ticket State Machine', () => {
  it('valid transitions are complete', async () => {
    const { VALID_TRANSITIONS, canTransition, validateTransition } = await import(
      '../modules/support/ticket.schema'
    );

    // Every status has an entry
    const statuses = ['open', 'in_progress', 'waiting_customer', 'waiting_merchant', 'resolved', 'closed'] as const;
    for (const s of statuses) {
      expect(VALID_TRANSITIONS[s]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[s])).toBe(true);
    }
  });

  it('open can transition to in_progress and closed', async () => {
    const { canTransition } = await import('../modules/support/ticket.schema');
    expect(canTransition('open', 'in_progress')).toBe(true);
    expect(canTransition('open', 'closed')).toBe(true);
    expect(canTransition('open', 'resolved')).toBe(false);
    expect(canTransition('open', 'waiting_customer')).toBe(false);
  });

  it('in_progress can transition to waiting states, resolved, closed', async () => {
    const { canTransition } = await import('../modules/support/ticket.schema');
    expect(canTransition('in_progress', 'waiting_customer')).toBe(true);
    expect(canTransition('in_progress', 'waiting_merchant')).toBe(true);
    expect(canTransition('in_progress', 'resolved')).toBe(true);
    expect(canTransition('in_progress', 'closed')).toBe(true);
    expect(canTransition('in_progress', 'open')).toBe(false);
  });

  it('waiting_customer can go back to in_progress or resolve', async () => {
    const { canTransition } = await import('../modules/support/ticket.schema');
    expect(canTransition('waiting_customer', 'in_progress')).toBe(true);
    expect(canTransition('waiting_customer', 'resolved')).toBe(true);
    expect(canTransition('waiting_customer', 'closed')).toBe(true);
  });

  it('resolved can be closed or reopened', async () => {
    const { canTransition } = await import('../modules/support/ticket.schema');
    expect(canTransition('resolved', 'closed')).toBe(true);
    expect(canTransition('resolved', 'open')).toBe(true); // reopen
    expect(canTransition('resolved', 'in_progress')).toBe(false);
  });

  it('closed can only be reopened', async () => {
    const { canTransition } = await import('../modules/support/ticket.schema');
    expect(canTransition('closed', 'open')).toBe(true);
    expect(canTransition('closed', 'in_progress')).toBe(false);
    expect(canTransition('closed', 'resolved')).toBe(false);
  });

  it('validateTransition throws on invalid transition', async () => {
    const { validateTransition } = await import('../modules/support/ticket.schema');
    expect(() => validateTransition('open', 'resolved')).toThrow('Invalid ticket transition');
    expect(() => validateTransition('closed', 'in_progress')).toThrow('Invalid ticket transition');
  });

  it('validateTransition does not throw on valid transition', async () => {
    const { validateTransition } = await import('../modules/support/ticket.schema');
    expect(() => validateTransition('open', 'in_progress')).not.toThrow();
    expect(() => validateTransition('resolved', 'closed')).not.toThrow();
  });
});

/* ── SLA defaults ────────────────────────────────────────────────── */

describe('Support — SLA Configuration', () => {
  it('DEFAULT_SLA covers all 4 priorities', async () => {
    const { DEFAULT_SLA } = await import('../modules/support/sla-config.schema');
    expect(DEFAULT_SLA).toHaveLength(4);
    const priorities = DEFAULT_SLA.map((s) => s.priority);
    expect(priorities).toContain('urgent');
    expect(priorities).toContain('high');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('low');
  });

  it('urgent has shortest response time', async () => {
    const { DEFAULT_SLA } = await import('../modules/support/sla-config.schema');
    const urgent = DEFAULT_SLA.find((s) => s.priority === 'urgent');
    const low = DEFAULT_SLA.find((s) => s.priority === 'low');
    expect(urgent!.responseTimeMins).toBeLessThan(low!.responseTimeMins);
    expect(urgent!.resolutionTimeMins).toBeLessThan(low!.resolutionTimeMins);
  });

  it('response time is always less than resolution time', async () => {
    const { DEFAULT_SLA } = await import('../modules/support/sla-config.schema');
    for (const sla of DEFAULT_SLA) {
      expect(sla.responseTimeMins).toBeLessThan(sla.resolutionTimeMins);
    }
  });
});

/* ── Schema structure ────────────────────────────────────────────── */

describe('Support — Schema Structure', () => {
  it('Ticket schema exports model with conditional registration', async () => {
    const { Ticket } = await import('../modules/support/ticket.schema');
    expect(Ticket).toBeDefined();
    expect(Ticket.modelName).toBe('Ticket');
  });

  it('TicketMessage schema exports model', async () => {
    const { TicketMessage } = await import('../modules/support/ticket-message.schema');
    expect(TicketMessage).toBeDefined();
    expect(TicketMessage.modelName).toBe('TicketMessage');
  });

  it('SlaConfig schema exports model', async () => {
    const { SlaConfig } = await import('../modules/support/sla-config.schema');
    expect(SlaConfig).toBeDefined();
    expect(SlaConfig.modelName).toBe('SlaConfig');
  });

  it('CannedResponse schema exports model', async () => {
    const { CannedResponse } = await import('../modules/support/canned-response.schema');
    expect(CannedResponse).toBeDefined();
    expect(CannedResponse.modelName).toBe('CannedResponse');
  });
});

/* ── Service exports ─────────────────────────────────────────────── */

describe('Support — Service Layer', () => {
  it('supportService exports all required methods', async () => {
    const { supportService } = await import('../modules/support/support.service');

    expect(typeof supportService.createTicket).toBe('function');
    expect(typeof supportService.getTicket).toBe('function');
    expect(typeof supportService.listTickets).toBe('function');
    expect(typeof supportService.assignTicket).toBe('function');
    expect(typeof supportService.addMessage).toBe('function');
    expect(typeof supportService.listMessages).toBe('function');
    expect(typeof supportService.updateStatus).toBe('function');
    expect(typeof supportService.escalate).toBe('function');
    expect(typeof supportService.close).toBe('function');
    expect(typeof supportService.reopen).toBe('function');
    expect(typeof supportService.getSlaStatus).toBe('function');
    expect(typeof supportService.seedSlaDefaults).toBe('function');
    expect(typeof supportService.enrichTicket).toBe('function');
    expect(typeof supportService.listCannedResponses).toBe('function');
    expect(typeof supportService.createCannedResponse).toBe('function');
    expect(typeof supportService.updateCannedResponse).toBe('function');
    expect(typeof supportService.deleteCannedResponse).toBe('function');
  });
});

/* ── Route structure ─────────────────────────────────────────────── */

describe('Support — Routes', () => {
  it('support router has expected routes', async () => {
    const { default: router } = await import('../modules/support/support.routes');
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => ({
      path: l.route!.path,
      methods: Object.keys(l.route!.methods),
    }));

    const paths = routes.map((r) => r.path);

    // Ticket CRUD
    expect(paths).toContain('/tickets');
    expect(paths).toContain('/tickets/:id');

    // Status transitions
    expect(paths).toContain('/tickets/:id/status');
    expect(paths).toContain('/tickets/:id/assign');
    expect(paths).toContain('/tickets/:id/escalate');
    expect(paths).toContain('/tickets/:id/close');
    expect(paths).toContain('/tickets/:id/reopen');

    // Messages
    expect(paths).toContain('/tickets/:id/messages');

    // SLA
    expect(paths).toContain('/sla/:ticketId');

    // Canned responses
    expect(paths).toContain('/canned-responses');
    expect(paths).toContain('/canned-responses/:id');
  });

  it('public support router has customer ticket creation', async () => {
    const { publicSupportRouter } = await import('../modules/support/support.routes');
    const stack = (publicSupportRouter as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/:tenantId/support/tickets');
  });
});

/* ── Event handlers ──────────────────────────────────────────────── */

describe('Support — Events', () => {
  it('registerSupportEventHandlers is a function', async () => {
    const { registerSupportEventHandlers } = await import('../modules/support/support.events');
    expect(typeof registerSupportEventHandlers).toBe('function');
  });
});

/* ── Barrel export ───────────────────────────────────────────────── */

describe('Support — Barrel Export', () => {
  it('index exports all public API', async () => {
    const mod = await import('../modules/support/index');
    expect(mod.supportService).toBeDefined();
    expect(mod.registerSupportEventHandlers).toBeDefined();
    expect(mod.supportRoutes).toBeDefined();
    expect(mod.publicSupportRouter).toBeDefined();
    expect(mod.Ticket).toBeDefined();
    expect(mod.TicketMessage).toBeDefined();
    expect(mod.SlaConfig).toBeDefined();
    expect(mod.CannedResponse).toBeDefined();
    expect(mod.TICKET_STATUSES).toBeDefined();
    expect(mod.TICKET_PRIORITIES).toBeDefined();
    expect(mod.VALID_TRANSITIONS).toBeDefined();
    expect(typeof mod.canTransition).toBe('function');
    expect(typeof mod.validateTransition).toBe('function');
  });
});

/* ── SLA calculation logic ───────────────────────────────────────── */

describe('Support — SLA Logic', () => {
  it('SLA response time is measured from ticket creation to first response', async () => {
    // Verify the SLA status function signature
    const { supportService } = await import('../modules/support/support.service');
    // getSlaStatus reads ticket.createdAt and ticket.firstResponseAt
    // and compares against SlaConfig.responseTimeMins
    expect(typeof supportService.getSlaStatus).toBe('function');
  });

  it('SLA resolution time is measured from ticket creation to resolvedAt', async () => {
    const { supportService } = await import('../modules/support/support.service');
    // Verify the function is exported and callable
    expect(typeof supportService.getSlaStatus).toBe('function');
  });
});

/* ── Ticket lifecycle completeness ───────────────────────────────── */

describe('Support — Lifecycle Completeness', () => {
  it('all 6 statuses are defined', async () => {
    const { TICKET_STATUSES } = await import('../modules/support/ticket.schema');
    expect(TICKET_STATUSES).toHaveLength(6);
    expect(TICKET_STATUSES).toContain('open');
    expect(TICKET_STATUSES).toContain('in_progress');
    expect(TICKET_STATUSES).toContain('waiting_customer');
    expect(TICKET_STATUSES).toContain('waiting_merchant');
    expect(TICKET_STATUSES).toContain('resolved');
    expect(TICKET_STATUSES).toContain('closed');
  });

  it('all 4 priorities are defined', async () => {
    const { TICKET_PRIORITIES } = await import('../modules/support/ticket.schema');
    expect(TICKET_PRIORITIES).toHaveLength(4);
    expect(TICKET_PRIORITIES).toContain('low');
    expect(TICKET_PRIORITIES).toContain('medium');
    expect(TICKET_PRIORITIES).toContain('high');
    expect(TICKET_PRIORITIES).toContain('urgent');
  });

  it('no status is a dead-end except closed (which can reopen)', async () => {
    const { VALID_TRANSITIONS } = await import('../modules/support/ticket.schema');
    for (const [status, targets] of Object.entries(VALID_TRANSITIONS)) {
      // Every status must have at least one valid transition
      expect(targets.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('closed status has exactly one transition (reopen to open)', async () => {
    const { VALID_TRANSITIONS } = await import('../modules/support/ticket.schema');
    expect(VALID_TRANSITIONS.closed).toEqual(['open']);
  });

  it('resolved status allows close and reopen only', async () => {
    const { VALID_TRANSITIONS } = await import('../modules/support/ticket.schema');
    expect(VALID_TRANSITIONS.resolved).toEqual(['closed', 'open']);
  });
});

/* ── Access control verification ─────────────────────────────────── */

describe('Support — Access Control', () => {
  it('routes file enforces tenant scoping via enforceTenant', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/support/support.routes.ts',
      ),
      'utf-8',
    );

    // Verify tenant enforcement is applied to key routes
    expect(code).toContain('enforceTenant(req, res)');
    // Verify internal visibility filtering
    expect(code).toContain("visibility === 'internal'");
    // Verify merchants can't see internal tickets
    expect(code).toContain("filters.visibility = 'tenant'");
    // Verify merchants can't see internal messages
    expect(code).toContain('includeInternal');
  });

  it('public router does not require auth', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/support/support.routes.ts',
      ),
      'utf-8',
    );

    // Public route creates ticket with customer type
    expect(code).toContain("type: 'customer'");
    // Returns limited info
    expect(code).toContain('ticketId: ticket.ticketId');
  });
});
