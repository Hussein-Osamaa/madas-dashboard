/**
 * XDIGIX Super Admin Overview Dashboard
 * Main dashboard page for the super admin control panel
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, query, where } from '../lib/firebase';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  Activity,
  Shield,
  DollarSign
} from 'lucide-react';

type PlatformStats = {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  suspendedClients: number;
  totalStaff: number;
  activeStaff: number;
  totalRevenue: number;
  mrr: number;
};

export default function SuperAdminOverviewPage() {
  const { user } = useRBAC();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalClients: 0,
    activeClients: 0,
    trialClients: 0,
    suspendedClients: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalRevenue: 0,
    mrr: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      let tenants: any[] = [];
      let staff: any[] = [];

      // Get all tenants (clients) - try both tenants and businesses collections
      try {
        const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
        tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.warn('[SuperAdminOverviewPage] Could not load from tenants collection:', error);
      }

      // Also try businesses collection
      try {
        const businessesSnapshot = await getDocs(collection(db, 'businesses'));
        const businesses = businessesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.businessName || data.name || 'Unnamed Business',
            status: data.plan?.status || data.status || 'active',
            plan: data.plan?.type || data.plan || 'basic'
          };
        });
        // Merge businesses into tenants if they don't already exist
        businesses.forEach(business => {
          if (!tenants.find(t => t.id === business.id)) {
            tenants.push(business);
          }
        });
      } catch (error) {
        console.warn('[SuperAdminOverviewPage] Could not load from businesses collection:', error);
      }

      const totalClients = tenants.length;
      const activeClients = tenants.filter((t: any) => t.status === 'active').length;
      const trialClients = tenants.filter((t: any) => t.status === 'trial').length;
      const suspendedClients = tenants.filter((t: any) => t.status === 'suspended').length;

      // Get all super admin users (company staff)
      try {
        const staffQuery = query(collection(db, 'users'), where('type', '==', 'super_admin'));
        const staffSnapshot = await getDocs(staffQuery);
        staff = staffSnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.warn('[SuperAdminOverviewPage] Could not load staff:', error);
        // If query fails, try without where clause
        try {
          const allUsersSnapshot = await getDocs(collection(db, 'users'));
          staff = allUsersSnapshot.docs
            .map(doc => doc.data())
            .filter((s: any) => s.type === 'super_admin');
        } catch (fallbackError) {
          console.error('[SuperAdminOverviewPage] Could not load users at all:', fallbackError);
        }
      }

      const totalStaff = staff.length;
      const activeStaff = staff.filter((s: any) => s.status === 'active').length;

      // Calculate revenue (placeholder - would need subscription data)
      const totalRevenue = 0;
      const mrr = 0;

      setStats({
        totalClients,
        activeClients,
        trialClients,
        suspendedClients,
        totalStaff,
        activeStaff,
        totalRevenue,
        mrr
      });
    } catch (error: any) {
      console.error('[SuperAdminOverviewPage] Error loading stats:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // If it's a permission error, show helpful message
      if (error.code === 'permission-denied') {
        console.error('\n💡 SOLUTION:');
        console.error('   Deploy Firestore rules from sys/firestore.rules');
        console.error('   Go to: https://console.firebase.google.com/project/madas-store/firestore/rules');
      }
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      onClick: () => navigate('/clients')
    },
    {
      title: 'Active Clients',
      value: stats.activeClients,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      onClick: () => navigate('/clients?status=active')
    },
    {
      title: 'Trial Clients',
      value: stats.trialClients,
      icon: <Clock className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      onClick: () => navigate('/clients?status=trial')
    },
    {
      title: 'Company Staff',
      value: stats.totalStaff,
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
      onClick: () => navigate('/staff')
    },
    {
      title: 'Active Staff',
      value: stats.activeStaff,
      icon: <Shield className="w-6 h-6" />,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-500/10',
      textColor: 'text-indigo-400',
      onClick: () => navigate('/staff')
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.mrr.toLocaleString()}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      onClick: () => navigate('/subscriptions')
    }
  ];

  const quickActions = [
    {
      title: 'Manage Clients',
      description: 'Add, edit, or remove client businesses',
      icon: <Building2 className="w-6 h-6" />,
      to: '/clients',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Manage Staff',
      description: 'Add or remove company staff members',
      icon: <Users className="w-6 h-6" />,
      to: '/staff',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Access Control',
      description: 'Manage roles and permissions',
      icon: <Shield className="w-6 h-6" />,
      to: '/access',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Subscriptions',
      description: 'Manage client subscription plans',
      icon: <CreditCard className="w-6 h-6" />,
      to: '/subscriptions',
      color: 'from-emerald-500 to-teal-600'
    }
  ];


  return (
    <PermissionGuard permission="super_admin.view_analytics" showError>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, <span className="text-amber-400">{user?.name?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              onClick={card.onClick}
              className="group bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl p-6 cursor-pointer hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-xl`}>
                  <div className={card.textColor}>{card.icon}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm font-medium text-gray-400 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => navigate(action.to)}
                className="group bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl p-6 cursor-pointer hover:border-amber-500/30 transition-all duration-300"
              >
                <div className={`bg-gradient-to-br ${action.color} p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  <div className="text-white">{action.icon}</div>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{action.title}</h3>
                <p className="text-sm text-gray-400">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">Activity log coming soon...</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">System Alerts</h2>
              <AlertCircle className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-gray-300 font-medium">All systems operational</p>
              <p className="text-sm text-gray-500 mt-1">No alerts at this time</p>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
