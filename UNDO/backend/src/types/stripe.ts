export interface StripeCustomer {
  id: string;
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  address?: StripeAddress;
  created: number;
  updated: number;
}

export interface StripeAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  userId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    intervalCount: number;
  };
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialStart?: number;
  trialEnd?: number;
  created: number;
  updated: number;
}

export interface StripePrice {
  id: string;
  productId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata: Record<string, string>;
  features: string[];
  limits: {
    websites: number;
    storage: number; // in MB
    bandwidth: number; // in GB
    customDomains: number;
    teamMembers: number;
  };
}

export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  trialPeriodDays?: number;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

export interface SubscriptionUpdateRequest {
  subscriptionId: string;
  priceId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  cancellationReason?: string;
}

export interface StripeWebhookLog {
  id: string;
  eventId: string;
  eventType: string;
  processed: boolean;
  success: boolean;
  error?: string;
  timestamp: Date;
  data: any;
}
