'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const id = searchParams.get('businessId');
    if (id) {
      setBusinessId(id);
    }

    // Auto-redirect after 5 seconds
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.replace('/dashboard-redirect.html'); // Redirect to main dashboard
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Next Gen Coders!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your business account has been created successfully. You're now ready to start building your digital presence.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/dashboard-redirect.html"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Go to Dashboard
              </a>

              <Link
                href="/E-comm/professional-builder-new.html"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Start Building Website
              </Link>
            </div>

            <div className="text-sm text-gray-500">
              Auto-redirecting to dashboard in {countdown} seconds...
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Guide</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Access Your Dashboard</p>
                  <p className="text-sm text-gray-600">View analytics, manage settings, and track your business performance.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Build Your Website</p>
                  <p className="text-sm text-gray-600">Use our drag-and-drop builder to create a professional website.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Publish & Go Live</p>
                  <p className="text-sm text-gray-600">Publish your website and start attracting customers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help getting started?{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
