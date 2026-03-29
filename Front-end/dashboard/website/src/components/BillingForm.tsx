'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/backend';
import { SubscriptionService } from '@/modules/billing/subscriptionService';
import { StripeService, SubscriptionPlan } from '@/modules/billing/stripeService';

interface BillingFormProps {
  selectedPlan?: string;
}

export default function BillingForm({ selectedPlan }: BillingFormProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(selectedPlan || 'pro');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      loadSubscriptionData();
    }
  }, [user, loading]);

  useEffect(() => {
    setPlans(StripeService.getSubscriptionPlans());
  }, []);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      const data = await SubscriptionService.getSubscriptionData(user.uid);
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🎭 FAKE PAYMENT: Subscribing to demo plan:', selectedPlanId);
      
      const checkoutUrl = await SubscriptionService.subscribeToPlan(user.uid, selectedPlanId);
      
      // Redirect to fake checkout
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('Error subscribing to plan:', error);
      alert(error instanceof Error ? error.message : 'Failed to subscribe to plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscriptionData?.subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to all premium features.')) {
      return;
    }

    setIsLoading(true);

    try {
      await SubscriptionService.cancelSubscription(user.uid, true);
      await loadSubscriptionData();
      alert('Subscription canceled. You will retain access until the end of your billing period.');
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    try {
      const portalUrl = await SubscriptionService.getBillingPortalUrl(user.uid);
      window.open(portalUrl, '_blank');
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to manage your subscription</h2>
        <button
          onClick={() => router.push('/login')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Demo Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-2xl">🎭</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Demo Mode - Fake Payments
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              This is a demonstration. All payments are fake and no real money will be charged.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {/* Current Subscription Status */}
      {subscriptionData && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{subscriptionData.billingStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-medium">
                {subscriptionData.subscription?.plan?.name || 'Trial'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trial Days Remaining</p>
              <p className="font-medium">
                {subscriptionData.trialData.trialDaysRemaining} days
              </p>
            </div>
          </div>

          {subscriptionData.billingStatus === 'active' && (
            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleManageBilling}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Manage Billing
              </button>
              <button
                onClick={handleCancelSubscription}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-lg p-6 border-2 ${
              selectedPlanId === plan.id
                ? 'border-indigo-500'
                : 'border-gray-200'
            } ${plan.id === 'pro' ? 'relative' : ''}`}
          >
            {plan.id === 'pro' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                ${plan.price}
                <span className="text-lg text-gray-500">/{plan.interval}</span>
              </div>
              {plan.trialDays && (
                <p className="text-sm text-gray-600">{plan.trialDays} days free trial</p>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePlanSelect(plan.id)}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedPlanId === plan.id
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {selectedPlanId === plan.id ? 'Selected' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Subscribe Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleSubscribe}
          disabled={isLoading || subscriptionData?.billingStatus === 'active'}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : subscriptionData?.billingStatus === 'active' ? (
            'Already Subscribed'
          ) : (
            `Subscribe to ${plans.find(p => p.id === selectedPlanId)?.name}`
          )}
        </button>
      </div>

      {/* Trial Information */}
      {subscriptionData?.billingStatus === 'trial' && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Free Trial Active
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have {subscriptionData.trialData.trialDaysRemaining} days remaining in your free trial. 
                  Subscribe now to continue using all features after your trial ends.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
