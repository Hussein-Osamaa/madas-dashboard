export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise';

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'unpaid' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'trialing';

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    websites: number;
    storage: number; // in MB
    bandwidth: number; // in GB
    customDomains: number;
    teamMembers: number;
  };
  stripePriceId: string;
  isPopular?: boolean;
}

export interface BillingInfo {
  customerId: string;
  email: string;
  name?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: {
    id: string;
    type: string;
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  };
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  invoiceUrl: string;
  hostedInvoiceUrl: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  paidAt?: Date;
}

export interface UsageStats {
  subscriptionId: string;
  period: {
    start: Date;
    end: Date;
  };
  websites: {
    used: number;
    limit: number;
  };
  storage: {
    used: number; // in MB
    limit: number; // in MB
  };
  bandwidth: {
    used: number; // in GB
    limit: number; // in GB
  };
  customDomains: {
    used: number;
    limit: number;
  };
  teamMembers: {
    used: number;
    limit: number;
  };
}
