'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrialMiddleware } from '@/modules/trial/trialMiddleware';

export default function TrialExpiredPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const {
    isOnTrial,
    hasActiveSubscription,
    getTrialData,
    getCurrentUser
  } = useTrialMiddleware();

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = getCurrentUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // If user has active subscription, redirect to dashboard
      if (hasActiveSubscription()) {
        const trialData = getTrialData();
        if (trialData?.businessId) {
          router.push(`/pages/dashboard/${trialData.businessId}`);
        } else {
          router.push('/business-setup');
        }
        return;
      }

      // If still on trial, redirect to dashboard
      if (isOnTrial()) {
        const trialData = getTrialData();
        if (trialData?.businessId) {
          router.push(`/pages/dashboard/${trialData.businessId}`);
        } else {
          router.push('/business-setup');
        }
        return;
      }

      setIsLoading(false);
    };

    checkAccess();
  }, [isOnTrial, hasActiveSubscription, getTrialData, getCurrentUser, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Trial Expired
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Your 15-day free trial has ended. Upgrade to continue using all features and access your data.
          </p>
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What you'll get with a paid plan:</h3>
          <ul className="space-y-3">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Unlimited products and orders</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Advanced analytics and reporting</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Staff management and collaboration</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Custom domain support</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Priority support</span>
            </li>
          </ul>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-indigo-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro Plan</h3>
              <div className="text-3xl font-bold text-indigo-600 mb-4">
                $79<span className="text-lg text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 mb-6">Perfect for growing businesses</p>
              <button
                onClick={() => router.push('/billing?plan=pro')}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Choose Pro Plan
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Starter Plan</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                $29<span className="text-lg text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 mb-6">Great for small businesses</p>
              <button
                onClick={() => router.push('/billing?plan=starter')}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Choose Starter Plan
              </button>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Need help choosing a plan? Our team is here to help.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.open('mailto:support@madas.com', '_blank')}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Contact Support
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => window.open('https://help.madas.com', '_blank')}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
