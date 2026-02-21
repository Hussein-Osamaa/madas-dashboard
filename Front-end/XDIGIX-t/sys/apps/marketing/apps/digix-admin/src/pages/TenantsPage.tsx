/**
 * Tenants Management Page
 * Super admin page to manage all tenant businesses
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc, deleteDoc, addDoc } from '../lib/firebase';
import type { Tenant } from '@shared/types/rbac';

export default function TenantsPage() {
  const { user } = useRBAC();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');

  const [newTenant, setNewTenant] = useState({
    name: '',
    plan: 'basic' as 'basic' | 'professional' | 'enterprise',
    status: 'trial' as 'active' | 'trial' | 'suspended' | 'cancelled'
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'tenants'));
      const tenantsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tenant[];
      setTenants(tenantsData);
    } catch (error) {
      console.error('[TenantsPage] Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name.trim()) return;

    try {
      await addDoc(collection(db, 'tenants'), {
        ...newTenant,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setShowCreateModal(false);
      setNewTenant({ name: '', plan: 'basic', status: 'trial' });
      loadTenants();
    } catch (error) {
      console.error('[TenantsPage] Error creating tenant:', error);
      alert('Failed to create tenant');
    }
  };

  const handleUpdateTenant = async (tenantId: string, updates: Partial<Tenant>) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        ...updates,
        updated_at: new Date().toISOString()
      });
      loadTenants();
    } catch (error) {
      console.error('[TenantsPage] Error updating tenant:', error);
      alert('Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
      loadTenants();
    } catch (error) {
      console.error('[TenantsPage] Error deleting tenant:', error);
      alert('Failed to delete tenant');
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || tenant.plan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });


  return (
    <PermissionGuard
      permission="super_admin.manage_all_tenants"
      showError
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tenants Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage all tenant businesses on the platform
            </p>
          </div>
          <PermissionGuard permission="super_admin.manage_all_tenants">
            <button
              onClick={() => {
                setSelectedTenant(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Add Tenant
            </button>
          </PermissionGuard>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tenants..."
                className="w-full px-3 py-2 border rounded-lg"
              />
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
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Plan
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
                    No tenants found
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
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          tenant.plan === 'enterprise'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : tenant.plan === 'professional'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={tenant.status}
                        onChange={(e) =>
                          handleUpdateTenant(tenant.id, {
                            status: e.target.value as Tenant['status']
                          })
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
                      <button
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setShowCreateModal(true);
                        }}
                        className="text-primary hover:text-primary-dark mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">
                {selectedTenant ? 'Edit Tenant' : 'Create New Tenant'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant Name</label>
                  <input
                    type="text"
                    value={selectedTenant?.name || newTenant.name}
                    onChange={(e) =>
                      selectedTenant
                        ? setSelectedTenant({ ...selectedTenant, name: e.target.value })
                        : setNewTenant({ ...newTenant, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select
                    value={selectedTenant?.plan || newTenant.plan}
                    onChange={(e) =>
                      selectedTenant
                        ? setSelectedTenant({
                            ...selectedTenant,
                            plan: e.target.value as Tenant['plan']
                          })
                        : setNewTenant({
                            ...newTenant,
                            plan: e.target.value as Tenant['plan']
                          })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={selectedTenant?.status || newTenant.status}
                    onChange={(e) =>
                      selectedTenant
                        ? handleUpdateTenant(selectedTenant.id, {
                            status: e.target.value as Tenant['status']
                          })
                        : setNewTenant({
                            ...newTenant,
                            status: e.target.value as Tenant['status']
                          })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedTenant(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {selectedTenant ? (
                    <button
                      onClick={() => {
                        handleUpdateTenant(selectedTenant.id, {
                          name: selectedTenant.name,
                          plan: selectedTenant.plan,
                          status: selectedTenant.status
                        });
                        setShowCreateModal(false);
                        setSelectedTenant(null);
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Update
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateTenant}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Create
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

