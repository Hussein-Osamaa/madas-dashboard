'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import DomainManager from '@/components/DomainManager';
import { SubscriptionService } from '@/modules/billing/subscriptionService';

export default function DomainsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    const loadUserData = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Get user's subscription data to find business ID
        const subscriptionData = await SubscriptionService.getSubscriptionData(user.uid);
        
        if (!subscriptionData.businessId) {
          router.push('/business-setup');
          return;
        }

        setBusinessId(subscriptionData.businessId);

        // For now, we'll use a mock site ID
        // In a real implementation, you'd get this from the user's sites
        setSiteId('mock-site-id');

      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading && user) {
      loadUserData();
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access this page</p>
        </div>
      </div>
    );
  }

  if (!businessId || !siteId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load domain management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <DomainManager businessId={businessId} siteId={siteId} />
      </div>
    </div>
  );
}
