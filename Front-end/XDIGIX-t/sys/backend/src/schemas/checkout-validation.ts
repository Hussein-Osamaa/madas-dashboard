import { z } from 'zod';

export const CheckoutCustomerSchema = z.object({
  email: z.string().email().max(200),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: z.string().max(20).optional(),
});

export const CheckoutShippingSchema = z.object({
  address: z.string().min(5).max(500).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(2).max(100).trim(),
  method: z.string().max(50).optional(),
});

export const CheckoutRequestSchema = z.object({
  cartToken: z.string().min(1).max(200),
  customer: CheckoutCustomerSchema,
  shipping: CheckoutShippingSchema,
  paymentMethod: z.enum(['cod', 'stripe', 'paymob', 'fawry', 'instapay', 'vodafone_cash', 'bank_transfer']),
  notes: z.string().max(1000).optional(),
  customerNote: z.string().max(500).optional(),
  idempotencyKey: z.string().max(100).optional(),
  locale: z.string().max(10).optional(),
  utm: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(200).optional(),
    term: z.string().max(200).optional(),
    content: z.string().max(200).optional(),
  }).optional(),
});

export const ManualPaymentConfirmSchema = z.object({
  paymentReference: z.string().min(1).max(200).trim(),
  notes: z.string().max(500).optional(),
});

export const OrderLookupSchema = z.object({
  token: z.string().min(1).max(200),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type ManualPaymentConfirm = z.infer<typeof ManualPaymentConfirmSchema>;
