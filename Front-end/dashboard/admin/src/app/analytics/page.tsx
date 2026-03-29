'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, db } from '@/lib/backend';

interface AnalyticsData {
  totalUsers: number;
  totalBusinesses: number;
  activeSubscriptions: number;
  trialUsers: number;
  revenue: number;
  userGrowth: Array<{ date: string; count: number }>;
  businessGrowth: Array<{ date: string; count: number }>;
  subscriptionStats: {
    starter: number;
    pro: number;
    enterprise: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load users
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;

      // Load businesses
      const businessesQuery = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
      const businessesSnapshot = await getDocs(businessesQuery);
      const totalBusinesses = businessesSnapshot.size;

      // Load customers (subscriptions)
      const customersQuery = query(collection(db, 'customers'));
      const customersSnapshot = await getDocs(customersQuery);
      const activeSubscriptions = customersSnapshot.size;

      // Calculate trial users
      const trialUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.isTrialActive === true;
      }).length;

      // Calculate revenue (mock data for now)
      const revenue = customersSnapshot.size * 79; // Assuming average $79/month

      // Calculate subscription stats
      const subscriptionStats = {
        starter: businessesSnapshot.docs.filter(doc => doc.data().plan === 'Starter').length,
        pro: businessesSnapshot.docs.filter(doc => doc.data().plan === 'Pro').length,
        enterprise: businessesSnapshot.docs.filter(doc => doc.data().plan === 'Enterprise').length,
      };

      // Mock growth data (in real implementation, you'd calculate this from actual data)
      const userGrowth = generateMockGrowthData(totalUsers, 30);
      const businessGrowth = generateMockGrowthData(totalBusinesses, 30);

      setAnalytics({
        totalUsers,
        totalBusinesses,
        activeSubscriptions,
        trialUsers,
        revenue,
        userGrowth,
        businessGrowth,
        subscriptionStats
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockGrowthData = (currentTotal: number, days: number) => {
    const data = [];
    const dailyGrowth = currentTotal / days;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(dailyGrowth * (days - i))
      });
    }
    
    return data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Overview of your platform's performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Businesses</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalBusinesses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.activeSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${analytics.revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Subscription Plans</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.subscriptionStats.starter}</div>
              <div className="text-sm text-gray-500">Starter Plans</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.subscriptionStats.pro}</div>
              <div className="text-sm text-gray-500">Pro Plans</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{analytics.subscriptionStats.enterprise}</div>
              <div className="text-sm text-gray-500">Enterprise Plans</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Trial Users</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.trialUsers}</p>
              <p className="text-sm text-gray-500">Users currently on trial</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-lg font-semibold text-green-600">
                {analytics.totalUsers > 0 ? Math.round((analytics.activeSubscriptions / analytics.totalUsers) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">User Growth</h2>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-2">Chart visualization would go here</p>
                <p className="text-sm">Integration with Chart.js or similar library</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Business Growth</h2>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="mt-2">Chart visualization would go here</p>
                <p className="text-sm">Integration with Chart.js or similar library</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








