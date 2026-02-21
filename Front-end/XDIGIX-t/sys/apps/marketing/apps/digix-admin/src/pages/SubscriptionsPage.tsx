/**
 * Subscriptions Management Page
 * Manage tenant subscriptions and plans
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc } from '../lib/firebase';
import type { Tenant } from '@shared/types/rbac';

export default function SubscriptionsPage() {
  const { user } = useRBAC();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'tenants'));
      const tenantsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tenant[];
      setTenants(tenantsData);
    } catch (error) {
      console.error('[SubscriptionsPage] Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (tenantId: string, newPlan: Tenant['plan']) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        plan: newPlan,
        updated_at: new Date().toISOString()
      });
      loadSubscriptions();
    } catch (error) {
      console.error('[SubscriptionsPage] Error updating plan:', error);
      alert('Failed to update subscription plan');
    }
  };

  const handleUpdateStatus = async (tenantId: string, newStatus: Tenant['status']) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      loadSubscriptions();
    } catch (error) {
      console.error('[SubscriptionsPage] Error updating status:', error);
      alert('Failed to update subscription status');
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesPlan = filterPlan === 'all' || tenant.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesPlan && matchesStatus;
  });

  const planStats = {
    basic: tenants.filter(t => t.plan === 'basic').length,
    professional: tenants.filter(t => t.plan === 'professional').length,
    enterprise: tenants.filter(t => t.plan === 'enterprise').length
  };

  const statusStats = {
    active: tenants.filter(t => t.status === 'active').length,
    trial: tenants.filter(t => t.status === 'trial').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
    cancelled: tenants.filter(t => t.status === 'cancelled').length
  };


  return (
    <PermissionGuard
      permission="super_admin.manage_subscriptions"
      showError
    >
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Subscriptions Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage tenant subscription plans and status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Basic Plan</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {planStats.basic}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Professional Plan</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {planStats.professional}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Enterprise Plan</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {planStats.enterprise}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tenants</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {tenants.length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Plans</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Current Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tenant.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={tenant.plan}
                        onChange={(e) =>
                          handleUpdatePlan(tenant.id, e.target.value as Tenant['plan'])
                        }
                        className={`text-xs rounded-full px-2 py-1 border-0 ${
                          tenant.plan === 'enterprise'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : tenant.plan === 'professional'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        <option value="basic">Basic</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={tenant.status}
                        onChange={(e) =>
                          handleUpdateStatus(tenant.id, e.target.value as Tenant['status'])
                        }
                        className={`text-xs rounded-full px-2 py-1 border-0 ${
                          tenant.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : tenant.status === 'trial'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : tenant.status === 'suspended'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tenant.created_at
                        ? new Date(tenant.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/tenants`}
                        className="text-primary hover:text-primary-dark"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGuard>
  );
}

