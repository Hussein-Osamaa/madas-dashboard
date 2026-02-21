/**
 * Analytics Page
 * Platform-wide analytics and metrics for super admins
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, query, where } from '../lib/firebase';

type AnalyticsData = {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  suspendedClients: number;
  totalUsers: number;
  superAdminUsers: number;
  tenantStaff: number;
  revenue: {
    mrr: number;
    arr: number;
    total: number;
  };
  growth: {
    newClientsThisMonth: number;
    newClientsLastMonth: number;
    growthRate: number;
  };
};

export default function AnalyticsPage() {
  const { user } = useRBAC();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalClients: 0,
    activeClients: 0,
    trialClients: 0,
    suspendedClients: 0,
    totalUsers: 0,
    superAdminUsers: 0,
    tenantStaff: 0,
    revenue: {
      mrr: 0,
      arr: 0,
      total: 0
    },
    growth: {
      newClientsThisMonth: 0,
      newClientsLastMonth: 0,
      growthRate: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get all tenants (clients)
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalClients = tenants.length;
      const activeClients = tenants.filter((t: any) => t.status === 'active').length;
      const trialClients = tenants.filter((t: any) => t.status === 'trial').length;
      const suspendedClients = tenants.filter((t: any) => t.status === 'suspended').length;

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => doc.data());

      const totalUsers = users.length;
      const superAdminUsers = users.filter((u: any) => u.type === 'super_admin').length;
      const tenantStaff = users.filter((u: any) => u.type === 'tenant_staff').length;

      // Calculate growth (this month vs last month)
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = thisMonth.getTime();
      const lastMonthStart = lastMonth.getTime();
      const lastMonthEnd = thisMonthStart;

      const newClientsThisMonth = tenants.filter((t: any) => {
        const created = t.created_at ? new Date(t.created_at).getTime() : 0;
        return created >= thisMonthStart;
      }).length;

      const newClientsLastMonth = tenants.filter((t: any) => {
        const created = t.created_at ? new Date(t.created_at).getTime() : 0;
        return created >= lastMonthStart && created < lastMonthEnd;
      }).length;

      const growthRate =
        newClientsLastMonth > 0
          ? ((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100
          : 0;

      // Revenue calculations (placeholder)
      const mrr = 0;
      const arr = mrr * 12;
      const total = 0;

      setAnalytics({
        totalClients,
        activeClients,
        trialClients,
        suspendedClients,
        totalUsers,
        superAdminUsers,
        tenantStaff,
        revenue: {
          mrr,
          arr,
          total
        },
        growth: {
          newClientsThisMonth,
          newClientsLastMonth,
          growthRate
        }
      });
    } catch (error) {
      console.error('[AnalyticsPage] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <PermissionGuard permission="super_admin.view_analytics" showError>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Platform Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive platform metrics and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Clients</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.totalClients}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Revenue (MRR)</div>
            <div className="text-3xl font-bold text-emerald-600">
              ${analytics.revenue.mrr.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Users</div>
            <div className="text-3xl font-bold text-purple-600">{analytics.totalUsers}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Growth Rate</div>
            <div className="text-3xl font-bold text-blue-600">
              {analytics.growth.growthRate > 0 ? '+' : ''}
              {analytics.growth.growthRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Client Status Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active</span>
                <span className="font-semibold text-green-600">{analytics.activeClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Trial</span>
                <span className="font-semibold text-yellow-600">{analytics.trialClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Suspended</span>
                <span className="font-semibold text-red-600">{analytics.suspendedClients}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">User Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Super Admins</span>
                <span className="font-semibold text-purple-600">{analytics.superAdminUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Tenant Staff</span>
                <span className="font-semibold text-blue-600">{analytics.tenantStaff}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Users</span>
                <span className="font-semibold">{analytics.totalUsers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Growth Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New Clients (This Month)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics.growth.newClientsThisMonth}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New Clients (Last Month)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics.growth.newClientsLastMonth}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</div>
              <div
                className={`text-2xl font-bold ${
                  analytics.growth.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {analytics.growth.growthRate > 0 ? '+' : ''}
                {analytics.growth.growthRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}

