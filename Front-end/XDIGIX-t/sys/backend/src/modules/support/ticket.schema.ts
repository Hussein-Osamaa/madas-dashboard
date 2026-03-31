/**
 * Support Ticket schema — owns the ticket lifecycle.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

/* ── Enums ────────────────────────────────────────────────────────── */

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_merchant'
  | 'resolved'
  | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketVisibility = 'tenant' | 'internal';
export type ActorType = 'customer' | 'merchant' | 'agent' | 'system';

export const TICKET_STATUSES: TicketStatus[] = [
  'open', 'in_progress', 'waiting_customer', 'waiting_merchant', 'resolved', 'closed',
];

export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

/* ── State machine ────────────────────────────────────────────────── */

export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['waiting_customer', 'waiting_merchant', 'resolved', 'closed'],
  waiting_customer: ['in_progress', 'resolved', 'closed'],
  waiting_merchant: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'open'], // reopen goes back to open
  closed: ['open'], // admin reopen only
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid ticket transition: ${from} → ${to}`);
  }
}

/* ── Interface ────────────────────────────────────────────────────── */

export interface ITicketCreator {
  type: ActorType;
  userId?: string;
  email: string;
}

export interface ITicketAssignee {
  type: 'agent' | 'system';
  userId: string;
}

export interface ITicket extends Document {
  ticketId: string;
  tenantId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  visibility: TicketVisibility;
  createdBy: ITicketCreator;
  assignedTo?: ITicketAssignee | null;
  linkedOrderId?: string | null;
  linkedShipmentId?: string | null;
  linkedReturnId?: string | null;
  tags: string[];
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ───────────────────────────────────────────────────────── */

const TicketCreatorSchema = new Schema<ITicketCreator>(
  {
    type: { type: String, enum: ['customer', 'merchant', 'agent', 'system'], required: true },
    userId: { type: String },
    email: { type: String, required: true },
  },
  { _id: false },
);

const TicketAssigneeSchema = new Schema<ITicketAssignee>(
  {
    type: { type: String, enum: ['agent', 'system'], required: true },
    userId: { type: String, required: true },
  },
  { _id: false },
);

const TicketSchema = new Schema<ITicket>(
  {
    ticketId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    subject: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      required: true,
      default: 'open',
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      required: true,
      default: 'medium',
    },
    category: { type: String, required: true, default: 'general' },
    visibility: {
      type: String,
      enum: ['tenant', 'internal'],
      required: true,
      default: 'tenant',
    },
    createdBy: { type: TicketCreatorSchema, required: true },
    assignedTo: { type: TicketAssigneeSchema, default: null },
    linkedOrderId: { type: String, default: null },
    linkedShipmentId: { type: String, default: null },
    linkedReturnId: { type: String, default: null },
    tags: { type: [String], default: [] },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* ── Indexes ──────────────────────────────────────────────────────── */
TicketSchema.index({ tenantId: 1, status: 1 });
TicketSchema.index({ tenantId: 1, createdAt: -1 });
TicketSchema.index({ 'assignedTo.userId': 1, status: 1 });
TicketSchema.index({ linkedOrderId: 1 }, { sparse: true });
TicketSchema.index({ linkedShipmentId: 1 }, { sparse: true });
TicketSchema.index({ priority: 1, status: 1 });
TicketSchema.index({ category: 1, tenantId: 1 });

export const Ticket: Model<ITicket> =
  (mongoose.models.Ticket as Model<ITicket>) || mongoose.model<ITicket>('Ticket', TicketSchema);
