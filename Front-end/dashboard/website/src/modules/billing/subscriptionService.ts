import { db } from '@/lib/backend';
import { StripeService, SubscriptionPlan, Subscription } from './stripeService';
import { TrialService } from '@/modules/trial/trialService';

export interface SubscriptionData {
  uid: string;
  email: string;
  businessId: string | null;
  subscription: Subscription | null;
  trialData: {
    isTrialActive: boolean;
    trialDaysRemaining: number;
  };
  billingStatus: 'trial' | 'active' | 'canceled' | 'past_due' | 'unpaid';
}

/**
 * Subscription Service - Manages subscription lifecycle and business logic
 */
export class SubscriptionService {
  /**
   * Get user's subscription data
   * @param uid - User's ID
   * @returns Promise<SubscriptionData>
   */
  static async getSubscriptionData(uid: string): Promise<SubscriptionData> {
    try {
      console.log('Getting subscription data for user:', uid);

      // Get user document
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();

      // Get subscription from Stripe
      const subscription = await StripeService.getSubscription(uid);

      // Get trial data
      const trialData = await TrialService.checkTrialStatus(uid);

      // Determine billing status
      let billingStatus: SubscriptionData['billingStatus'] = 'trial';
      
      if (subscription) {
        switch (subscription.status) {
          case 'active':
            billingStatus = 'active';
            break;
          case 'canceled':
            billingStatus = 'canceled';
            break;
          case 'past_due':
            billingStatus = 'past_due';
            break;
          case 'unpaid':
            billingStatus = 'unpaid';
            break;
          case 'trialing':
            billingStatus = 'trial';
            break;
        }
      } else if (trialData && !trialData.isTrialActive) {
        billingStatus = 'canceled';
      }

      const subscriptionData: SubscriptionData = {
        uid,
        email: userData.email,
        businessId: userData.businessId,
        subscription,
        trialData: {
          isTrialActive: trialData?.isTrialActive || false,
          trialDaysRemaining: trialData?.trialDaysRemaining || 0
        },
        billingStatus
      };

      console.log('Subscription data retrieved:', subscriptionData);
      return subscriptionData;

    } catch (error) {
      console.error('Error getting subscription data:', error);
      throw new Error(`Failed to get subscription data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe user to a plan
   * @param uid - User's ID
   * @param planId - Plan ID
   * @returns Promise<string> - Checkout session URL
   */
  static async subscribeToPlan(uid: string, planId: string): Promise<string> {
    try {
      console.log('Subscribing user to plan:', uid, planId);

      // Get plan details
      const plan = StripeService.getPlanById(planId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      // Create or get customer
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      
      // Create Stripe customer if not exists
      let customer = await StripeService.createCustomer(uid, userData.email, userData.name);

      // Create checkout session
      const successUrl = `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/billing?plan=${planId}`;
      
      const checkoutUrl = await StripeService.createCheckoutSession(
        uid,
        plan.stripePriceId,
        successUrl,
        cancelUrl
      );

      console.log('Checkout session created:', checkoutUrl);
      return checkoutUrl;

    } catch (error) {
      console.error('Error subscribing to plan:', error);
      throw new Error(`Failed to subscribe to plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel user's subscription
   * @param uid - User's ID
   * @param cancelAtPeriodEnd - Whether to cancel at period end
   * @returns Promise<void>
   */
  static async cancelSubscription(uid: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      console.log('Canceling subscription for user:', uid);

      await StripeService.cancelSubscription(uid, cancelAtPeriodEnd);

      // Update user document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        subscriptionStatus: cancelAtPeriodEnd ? 'active' : 'canceled',
        subscriptionCanceledAt: cancelAtPeriodEnd ? null : serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Subscription canceled for user:', uid);

    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update subscription plan
   * @param uid - User's ID
   * @param newPlanId - New plan ID
   * @returns Promise<void>
   */
  static async updateSubscriptionPlan(uid: string, newPlanId: string): Promise<void> {
    try {
      console.log('Updating subscription plan for user:', uid, 'to', newPlanId);

      // Get new plan details
      const newPlan = StripeService.getPlanById(newPlanId);
      if (!newPlan) {
        throw new Error('Invalid plan ID');
      }

      // In a real implementation, this would call Stripe API to update subscription
      // For now, we'll simulate the update
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        plan: newPlanId,
        updatedAt: serverTimestamp()
      });

      console.log('Subscription plan updated for user:', uid);

    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw new Error(`Failed to update subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user can access a feature - Grant full access to all users
   * @param uid - User's ID
   * @param feature - Feature name
   * @returns Promise<boolean>
   */
  static async canAccessFeature(uid: string, feature: string): Promise<boolean> {
    try {
      // Grant full access to all authenticated users
      return true;

    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Get user's current plan
   * @param uid - User's ID
   * @returns Promise<SubscriptionPlan | null>
   */
  static async getCurrentPlan(uid: string): Promise<SubscriptionPlan | null> {
    try {
      const subscriptionData = await this.getSubscriptionData(uid);
      
      if (subscriptionData.subscription) {
        return StripeService.getPlanByPriceId(subscriptionData.subscription.priceId);
      }

      return null;

    } catch (error) {
      console.error('Error getting current plan:', error);
      return null;
    }
  }

  /**
   * Get billing portal URL
   * @param uid - User's ID
   * @returns Promise<string>
   */
  static async getBillingPortalUrl(uid: string): Promise<string> {
    try {
      return await StripeService.getBillingPortalUrl(uid);
    } catch (error) {
      console.error('Error getting billing portal URL:', error);
      throw error;
    }
  }

  /**
   * Handle successful FAKE payment (DEMO MODE)
   * @param uid - User's ID
   * @param sessionId - Fake checkout session ID
   * @returns Promise<void>
   */
  static async handleSuccessfulPayment(uid: string, sessionId: string): Promise<void> {
    try {
      console.log('🎭 FAKE PAYMENT: Processing demo payment for user:', uid, 'session:', sessionId);

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get session data
      const sessionRef = doc(db, 'checkout_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error('Demo checkout session not found');
      }

      const sessionData = sessionDoc.data();
      const plan = StripeService.getPlanByPriceId(sessionData.priceId);

      if (!plan) {
        throw new Error('Invalid demo plan');
      }

      // Create fake subscription data
      const subscriptionData = {
        id: `sub_demo_${uid}_${Date.now()}`,
        status: 'active',
        plan: plan.name,
        planId: plan.id,
        price: plan.price,
        interval: plan.interval,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (plan.interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000),
        isDemo: true,
        createdAt: serverTimestamp()
      };
      
      // Update user subscription status
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        plan: plan.id,
        subscription: subscriptionData,
        subscriptionStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update session status
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      console.log('🎭 FAKE PAYMENT: Demo payment processed successfully!', {
        userId: uid,
        plan: plan.name,
        price: plan.price,
        sessionId,
        isDemo: true
      });

    } catch (error) {
      console.error('Error handling fake payment:', error);
      throw new Error(`Failed to process demo payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription usage stats
   * @param uid - User's ID
   * @returns Promise<Record<string, number>>
   */
  static async getUsageStats(uid: string): Promise<Record<string, number>> {
    try {
      // This would typically query various collections to get usage stats
      // For now, we'll return mock data
      return {
        products: 0,
        orders: 0,
        staff: 0,
        storage: 0
      };

    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {};
    }
  }
}
