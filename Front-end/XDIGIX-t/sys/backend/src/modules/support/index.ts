/**
 * Support module — barrel export.
 */
export { supportService } from './support.service';
export { registerSupportEventHandlers } from './support.events';
export { default as supportRoutes, publicSupportRouter } from './support.routes';
export { Ticket, type ITicket, type TicketStatus, type TicketPriority, TICKET_STATUSES, TICKET_PRIORITIES, VALID_TRANSITIONS, canTransition, validateTransition } from './ticket.schema';
export { TicketMessage, type ITicketMessage } from './ticket-message.schema';
export { SlaConfig, type ISlaConfig, DEFAULT_SLA } from './sla-config.schema';
export { CannedResponse, type ICannedResponse } from './canned-response.schema';
