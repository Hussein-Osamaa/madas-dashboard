'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTrialMiddleware } from '@/modules/trial/trialMiddleware';

interface TrialBannerProps {
  className?: string;
}

export default function TrialBanner({ className = '' }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();
  
  const {
    isOnTrial,
    hasActiveSubscription,
    getDaysRemaining,
    getTrialData
  } = useTrialMiddleware();

  useEffect(() => {
    // Check if banner should be visible
    const trialData = getTrialData();
    const daysRemaining = getDaysRemaining();
    
    if (isOnTrial() && !hasActiveSubscription() && daysRemaining <= 7 && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOnTrial, hasActiveSubscription, getDaysRemaining, isDismissed]);

  const handleUpgrade = () => {
    router.push('/billing');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    // Store dismissal in localStorage for session
    localStorage.setItem('trialBannerDismissed', 'true');
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining <= 3;
  const isExpired = daysRemaining <= 0;

  return (
    <div className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 shadow-lg ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isExpired ? (
              <svg className="h-6 w-6 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : isExpiringSoon ? (
              <svg className="h-6 w-6 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            {isExpired ? (
              <div>
                <h3 className="text-lg font-semibold">Trial Expired</h3>
                <p className="text-sm opacity-90">
                  Your 15-day trial has ended. Upgrade now to continue using all features.
                </p>
              </div>
            ) : isExpiringSoon ? (
              <div>
                <h3 className="text-lg font-semibold">Trial Expiring Soon</h3>
                <p className="text-sm opacity-90">
                  Your trial expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
                  Upgrade now to avoid losing access to your data.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold">Free Trial Active</h3>
                <p className="text-sm opacity-90">
                  You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your free trial. 
                  Upgrade anytime to unlock all features.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpgrade}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isExpired 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white text-orange-600 hover:bg-orange-50'
            }`}
          >
            {isExpired ? 'Upgrade Now' : 'Upgrade'}
          </button>
          
          {!isExpired && (
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 transition-colors"
              title="Dismiss for this session"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
