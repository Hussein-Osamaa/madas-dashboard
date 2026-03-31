/**
 * Ticket message schema — threaded conversation per ticket.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ActorType } from './ticket.schema';

export interface IMessageSender {
  type: ActorType;
  userId?: string;
  email: string;
}

export interface ITicketMessage extends Document {
  ticketId: string;
  sender: IMessageSender;
  message: string;
  attachments: string[];
  internal: boolean; // true = visible only to agents, not customer/merchant
  createdAt: Date;
}

const MessageSenderSchema = new Schema<IMessageSender>(
  {
    type: { type: String, enum: ['customer', 'merchant', 'agent', 'system'], required: true },
    userId: { type: String },
    email: { type: String, required: true },
  },
  { _id: false },
);

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticketId: { type: String, required: true },
    sender: { type: MessageSenderSchema, required: true },
    message: { type: String, required: true, maxlength: 10000 },
    attachments: { type: [String], default: [] },
    internal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

TicketMessageSchema.index({ ticketId: 1, createdAt: 1 });

export const TicketMessage: Model<ITicketMessage> =
  (mongoose.models.TicketMessage as Model<ITicketMessage>) ||
  mongoose.model<ITicketMessage>('TicketMessage', TicketMessageSchema);
