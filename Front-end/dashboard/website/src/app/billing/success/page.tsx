'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { SubscriptionService } from '@/modules/billing/subscriptionService';

export default function BillingSuccessPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Initialize auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const processPayment = async () => {
      if (!user || !sessionId) {
        setMessage('Invalid session. Please try again.');
        setMessageType('error');
        setIsProcessing(false);
        return;
      }

      try {
        console.log('Processing successful payment...');
        
        await SubscriptionService.handleSuccessfulPayment(user.uid, sessionId);
        
        setMessage('🎭 Demo Payment Successful! Your subscription is now active. (This is a fake payment for testing purposes)');
        setMessageType('success');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/pages/dashboard');
        }, 3000);

      } catch (error) {
        console.error('Error processing payment:', error);
        setMessage(error instanceof Error ? error.message : 'Failed to process payment');
        setMessageType('error');
      } finally {
        setIsProcessing(false);
      }
    };

    if (!loading && user) {
      processPayment();
    }
  }, [user, loading, sessionId, router]);

  if (loading || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Icon */}
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${
            messageType === 'success' ? 'bg-green-100' : 
            messageType === 'error' ? 'bg-red-100' : 
            'bg-blue-100'
          }`}>
            {messageType === 'success' ? (
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : messageType === 'error' ? (
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h2 className={`text-3xl font-extrabold mb-2 ${
            messageType === 'success' ? 'text-green-900' : 
            messageType === 'error' ? 'text-red-900' : 
            'text-blue-900'
          }`}>
            {messageType === 'success' ? 'Payment Successful!' : 
             messageType === 'error' ? 'Payment Failed' : 
             'Processing Payment'}
          </h2>
          
          <p className={`text-lg mb-8 ${
            messageType === 'success' ? 'text-green-600' : 
            messageType === 'error' ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {message}
          </p>
        </div>

        {/* Success Actions */}
        {messageType === 'success' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">What's Next?</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your subscription is now active</li>
                <li>• You have access to all premium features</li>
                <li>• You can manage your billing anytime</li>
                <li>• Redirecting to your dashboard...</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/pages/dashboard')}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/billing')}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Manage Billing
              </button>
            </div>
          </div>
        )}

        {/* Error Actions */}
        {messageType === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Need Help?</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Check your payment method</li>
                <li>• Contact support if the issue persists</li>
                <li>• Try again with a different payment method</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/billing')}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.open('mailto:support@madas.com', '_blank')}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Session Info (for debugging) */}
        {sessionId && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600">
              Session ID: {sessionId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
