/**
 * Zod schemas for external API request validation.
 */

import { z } from 'zod';

export const externalOrderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  size: z.string().optional(),
});

export const externalOrderPayloadSchema = z.object({
  items: z.array(externalOrderItemSchema).min(1, 'At least one item is required'),
  source: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
});

export type ExternalOrderPayloadInput = z.infer<typeof externalOrderPayloadSchema>;

export const webhookEventPayloadSchema = z.object({
  event: z.string().min(1, 'event is required'),
  timestamp: z.string().datetime({ message: 'timestamp must be ISO 8601' }),
  data: z.record(z.unknown()).default({}),
});

export type WebhookEventPayloadInput = z.infer<typeof webhookEventPayloadSchema>;
