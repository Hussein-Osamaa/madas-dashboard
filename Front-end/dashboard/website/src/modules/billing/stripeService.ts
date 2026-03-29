import { db } from '@/lib/backend';

// Note: In production, these would be loaded from environment variables
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  trialDays?: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  priceId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  subscription?: Subscription;
}

/**
 * Stripe Service - Manages billing and subscriptions
 */
export class StripeService {
  private static stripe: any = null;

  /**
   * Initialize Stripe (client-side only)
   */
  private static async initializeStripe() {
    if (typeof window === 'undefined') {
      throw new Error('Stripe can only be initialized on the client side');
    }

    if (!this.stripe) {
      // Dynamic import to avoid SSR issues
      const { loadStripe } = await import('@stripe/stripe-js');
      this.stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
    }

    return this.stripe;
  }

  /**
   * Get available subscription plans
   */
  static getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        interval: 'month',
        features: [
          'Up to 100 products',
          'Basic analytics',
          'Email support',
          'Standard templates'
        ],
        stripePriceId: 'price_starter_monthly',
        trialDays: 15
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 79,
        interval: 'month',
        features: [
          'Unlimited products',
          'Advanced analytics',
          'Priority support',
          'Custom templates',
          'Staff management',
          'API access'
        ],
        stripePriceId: 'price_pro_monthly',
        trialDays: 15
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 199,
        interval: 'month',
        features: [
          'Everything in Pro',
          'Custom domains',
          'White-label solution',
          'Dedicated support',
          'Custom integrations',
          'Advanced security'
        ],
        stripePriceId: 'price_enterprise_monthly',
        trialDays: 15
      }
    ];
  }

  /**
   * Create Stripe customer
   * @param uid - User's ID
   * @param email - User's email
   * @param name - User's name
   * @returns Promise<Customer>
   */
  static async createCustomer(uid: string, email: string, name?: string): Promise<Customer> {
    try {
      console.log('Creating Stripe customer for user:', uid);

      // In a real implementation, this would call a Cloud Function
      // For now, we'll simulate the customer creation
      const customerId = `cus_${uid}_${Date.now()}`;
      
      const customer: Customer = {
        id: customerId,
        email,
        name
      };

      // Store customer data in Firestore
      const customerRef = doc(db, 'customers', uid);
      await setDoc(customerRef, {
        ...customer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Stripe customer created:', customerId);
      return customer;

    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create FAKE subscription checkout session (DEMO MODE)
   * @param uid - User's ID
   * @param priceId - Stripe price ID
   * @param successUrl - Success redirect URL
   * @param cancelUrl - Cancel redirect URL
   * @returns Promise<string> - Checkout session URL
   */
  static async createCheckoutSession(
    uid: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      console.log('🎭 FAKE PAYMENT: Creating demo checkout session for user:', uid);

      // Simulate API delay for realism
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate a fake session ID
      const sessionId = `demo_cs_${uid}_${Date.now()}`;
      const checkoutUrl = `${window.location.origin}/billing/success?session_id=${sessionId}`;

      // Store fake session data in Firestore
      const sessionRef = doc(db, 'checkout_sessions', sessionId);
      await setDoc(sessionRef, {
        uid,
        priceId,
        successUrl,
        cancelUrl,
        status: 'pending',
        isDemo: true, // Mark as demo
        createdAt: serverTimestamp()
      });

      console.log('🎭 FAKE PAYMENT: Demo checkout session created:', sessionId);
      console.log('🎭 FAKE PAYMENT: Redirecting to:', checkoutUrl);
      
      return checkoutUrl;

    } catch (error) {
      console.error('Error creating fake checkout session:', error);
      throw new Error(`Failed to create demo checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer subscription
   * @param uid - User's ID
   * @returns Promise<Subscription | null>
   */
  static async getSubscription(uid: string): Promise<Subscription | null> {
    try {
      const customerRef = doc(db, 'customers', uid);
      const customerDoc = await getDoc(customerRef);

      if (!customerDoc.exists()) {
        return null;
      }

      const customerData = customerDoc.data();
      return customerData.subscription || null;

    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   * @param uid - User's ID
   * @param cancelAtPeriodEnd - Whether to cancel at period end
   * @returns Promise<void>
   */
  static async cancelSubscription(uid: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      console.log('Canceling subscription for user:', uid);

      // In a real implementation, this would call a Cloud Function
      // For now, we'll simulate the cancellation
      const customerRef = doc(db, 'customers', uid);
      const customerDoc = await getDoc(customerRef);

      if (!customerDoc.exists()) {
        throw new Error('Customer not found');
      }

      const customerData = customerDoc.data();
      if (!customerData.subscription) {
        throw new Error('No active subscription found');
      }

      // Update subscription status
      await updateDoc(customerRef, {
        'subscription.status': cancelAtPeriodEnd ? 'active' : 'canceled',
        'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
        'subscription.canceledAt': cancelAtPeriodEnd ? null : serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Subscription canceled for user:', uid);

    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update payment method
   * @param uid - User's ID
   * @param paymentMethodId - Stripe payment method ID
   * @returns Promise<void>
   */
  static async updatePaymentMethod(uid: string, paymentMethodId: string): Promise<void> {
    try {
      console.log('Updating payment method for user:', uid);

      // In a real implementation, this would call a Cloud Function
      const customerRef = doc(db, 'customers', uid);
      await updateDoc(customerRef, {
        paymentMethodId,
        updatedAt: serverTimestamp()
      });

      console.log('Payment method updated for user:', uid);

    } catch (error) {
      console.error('Error updating payment method:', error);
      throw new Error(`Failed to update payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get billing portal URL
   * @param uid - User's ID
   * @returns Promise<string>
   */
  static async getBillingPortalUrl(uid: string): Promise<string> {
    try {
      console.log('Getting billing portal URL for user:', uid);

      // In a real implementation, this would call a Cloud Function
      // For now, we'll return a mock URL
      const portalUrl = `${window.location.origin}/billing/portal?customer_id=${uid}`;

      console.log('Billing portal URL generated:', portalUrl);
      return portalUrl;

    } catch (error) {
      console.error('Error getting billing portal URL:', error);
      throw new Error(`Failed to get billing portal URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has active subscription
   * @param uid - User's ID
   * @returns Promise<boolean>
   */
  static async hasActiveSubscription(uid: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription(uid);
      return subscription?.status === 'active' || subscription?.status === 'trialing';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get subscription plan by ID
   * @param planId - Plan ID
   * @returns SubscriptionPlan | null
   */
  static getPlanById(planId: string): SubscriptionPlan | null {
    const plans = this.getSubscriptionPlans();
    return plans.find(plan => plan.id === planId) || null;
  }

  /**
   * Get subscription plan by Stripe price ID
   * @param priceId - Stripe price ID
   * @returns SubscriptionPlan | null
   */
  static getPlanByPriceId(priceId: string): SubscriptionPlan | null {
    const plans = this.getSubscriptionPlans();
    return plans.find(plan => plan.stripePriceId === priceId) || null;
  }
}
