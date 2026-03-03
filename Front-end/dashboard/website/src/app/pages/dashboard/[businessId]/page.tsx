'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function PagesDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const businessId = params.businessId as string;

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is authenticated
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        // Store business ID in localStorage for the HTML dashboard
        localStorage.setItem('currentBusinessId', businessId);
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userId', user.uid);

        // Redirect to the main dashboard
        window.location.replace('/main-dashboard.html');

      } catch (error) {
        console.error('Error initializing dashboard:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [businessId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}
