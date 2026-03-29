'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, serverTimestamp, db } from '@/lib/backend';

interface Subscription {
  id: string;
  uid: string;
  email: string;
  businessId: string;
  businessName: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  subscriptionId?: string;
  customerId?: string;
  currentPeriodStart?: any;
  currentPeriodEnd?: any;
  cancelAtPeriodEnd?: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load customers (subscriptions)
      const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const customersSnapshot = await getDocs(customersQuery);

      // Load users to get email and business info
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));

      // Load businesses to get business names
      const businessesQuery = query(collection(db, 'businesses'));
      const businessesSnapshot = await getDocs(businessesQuery);
      const businessesMap = new Map(businessesSnapshot.docs.map(doc => [doc.id, doc.data()]));

      const subscriptionsData: Subscription[] = customersSnapshot.docs.map(doc => {
        const customerData = doc.data();
        const userData = usersMap.get(customerData.uid) || {};
        const businessData = businessesMap.get(customerData.businessId) || {};

        return {
          id: doc.id,
          uid: customerData.uid,
          email: userData.email || customerData.email || 'N/A',
          businessId: customerData.businessId || 'N/A',
          businessName: businessData.businessName || 'N/A',
          plan: businessData.plan || 'N/A',
          status: customerData.subscription?.status || 'trialing',
          subscriptionId: customerData.subscription?.id,
          customerId: customerData.id,
          currentPeriodStart: customerData.subscription?.currentPeriodStart,
          currentPeriodEnd: customerData.subscription?.currentPeriodEnd,
          cancelAtPeriodEnd: customerData.subscription?.cancelAtPeriodEnd,
          createdAt: customerData.createdAt,
          updatedAt: customerData.updatedAt
        };
      });

      setSubscriptions(subscriptionsData);

    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setError('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string, uid: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      // Update customer document
      const customerRef = doc(db, 'customers', subscriptionId);
      await updateDoc(customerRef, {
        'subscription.status': 'canceled',
        'subscription.canceledAt': serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'canceled',
        updatedAt: serverTimestamp()
      });

      // Reload subscriptions
      await loadSubscriptions();

    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string, uid: string) => {
    try {
      // Update customer document
      const customerRef = doc(db, 'customers', subscriptionId);
      await updateDoc(customerRef, {
        'subscription.status': 'active',
        'subscription.canceledAt': null,
        updatedAt: serverTimestamp()
      });

      // Update user document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        updatedAt: serverTimestamp()
      });

      // Reload subscriptions
      await loadSubscriptions();

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Failed to reactivate subscription');
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Starter':
        return 'bg-blue-100 text-blue-800';
      case 'Pro':
        return 'bg-green-100 text-green-800';
      case 'Enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600">Manage customer subscriptions and billing</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search by email or business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="canceled">Canceled</option>
              <option value="past_due">Past Due</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <select
              id="plan"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">All Plans</option>
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Subscriptions ({filteredSubscriptions.length})
          </h2>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No subscriptions have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{subscription.email}</div>
                        <div className="text-sm text-gray-500">ID: {subscription.uid}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subscription.businessName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(subscription.plan)}`}>
                        {subscription.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.currentPeriodEnd ? (
                        <div>
                          <div>Until: {subscription.currentPeriodEnd.toDate().toLocaleDateString()}</div>
                          {subscription.cancelAtPeriodEnd && (
                            <div className="text-red-600 text-xs">Cancels at period end</div>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {subscription.status === 'active' ? (
                          <button
                            onClick={() => handleCancelSubscription(subscription.id, subscription.uid)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        ) : subscription.status === 'canceled' ? (
                          <button
                            onClick={() => handleReactivateSubscription(subscription.id, subscription.uid)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
