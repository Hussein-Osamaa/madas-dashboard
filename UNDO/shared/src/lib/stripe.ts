import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
} as const;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      '1 website',
      'Basic templates',
      'Community support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 29,
    interval: 'month',
    features: [
      '10 websites',
      'Premium templates',
      'Custom domains',
      'Priority support',
      'Analytics',
    ],
  },
  BUSINESS: {
    name: 'Business',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited websites',
      'All templates',
      'Custom domains',
      'White-label',
      'API access',
      'Priority support',
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
