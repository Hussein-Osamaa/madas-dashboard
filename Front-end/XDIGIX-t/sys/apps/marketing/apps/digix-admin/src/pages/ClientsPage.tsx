/**
 * XDIGIX Clients Management Page
 * Manage all client businesses (tenants) on the platform
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc } from '../lib/firebase';
import type { Tenant } from '@shared/types/rbac';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Power,
  PowerOff,
  Settings,
  LayoutDashboard,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  UserCog,
  ExternalLink,
  Truck,
  Package
} from 'lucide-react';

export default function ClientsPage() {
  const { user } = useRBAC();
  const [clients, setClients] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Tenant | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');

  const [newClient, setNewClient] = useState({
    name: '',
    plan: 'basic' as 'basic' | 'professional' | 'enterprise',
    status: 'trial' as 'active' | 'trial' | 'suspended' | 'cancelled',
    ownerEmail: '',
    brandEmail: '',
    password: '',
    systemAccess: {
      dashboard: true,
      finance: true
    }
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      const [businessesSnapshot, tenantsSnapshot] = await Promise.all([
        getDocs(collection(db, 'businesses')).catch(() => null),
        getDocs(collection(db, 'tenants')).catch(() => null)
      ]);
      
      const clientsData: Tenant[] = [];
      
      if (businessesSnapshot && !businessesSnapshot.empty) {
        businessesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const clientData: any = {
            id: doc.id,
            name: data.businessName || data.name || 'Unnamed Business',
            plan: data.plan?.type || data.plan || 'basic',
            status: data.plan?.status || data.status || 'active',
            created_at: data.createdAt?.toDate?.()?.toISOString() || 
                       data.created_at || 
                       data.metadata?.createdAt ||
                       new Date().toISOString(),
            updated_at: data.updatedAt?.toDate?.()?.toISOString() || 
                       data.updated_at || 
                       data.metadata?.updatedAt ||
                       new Date().toISOString(),
            _source: 'businesses',
            ownerEmail: data.owner?.email || data.contact?.email || 'N/A',
            contactEmail: data.contact?.email || data.owner?.email || 'N/A',
            phone: data.contact?.phone || data.settings?.phone || 'N/A',
            systemAccess: data.systemAccess || {
              dashboard: true,
              finance: true
            },
            features: data.features || {},
            suspensionReason: data.suspensionReason || null
          };
          clientsData.push(clientData as Tenant);
        });
      }
      
      if (tenantsSnapshot && !tenantsSnapshot.empty) {
        tenantsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!clientsData.find(c => c.id === doc.id)) {
            clientsData.push({
              id: doc.id,
              name: data.name || 'Unnamed Tenant',
              plan: data.plan || 'basic',
              status: data.status || 'active',
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
              _source: 'tenants'
            } as Tenant);
          }
        });
      }
      
      setClients(clientsData);
    } catch (error) {
      console.error('[ClientsPage] Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const [creating, setCreating] = useState(false);

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      alert('Please enter a client name');
      return;
    }
    if (!newClient.ownerEmail.trim()) {
      alert('Please enter an owner email');
      return;
    }
    if (!newClient.password || newClient.password.length < 6) {
      alert('Please enter a password with at least 6 characters');
      return;
    }

    setCreating(true);

    try {
      // Use backend API when VITE_API_BACKEND_URL is set (MongoDB), else Firebase Cloud Function
      const apiBaseEnv = import.meta.env.VITE_API_BACKEND_URL;
      const useBackend = typeof apiBaseEnv === 'string' && apiBaseEnv.trim().length > 0;
      const apiUrl = useBackend
        ? `${String(apiBaseEnv).replace(/\/$/, '')}/create-client`
        : 'https://us-central1-madas-store.cloudfunctions.net/api/api/create-client';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessName: newClient.name,
          ownerEmail: newClient.ownerEmail,
          ownerPassword: newClient.password,
          ownerName: newClient.name + ' Owner',
          brandEmail: newClient.brandEmail || newClient.ownerEmail,
          plan: newClient.plan,
          status: newClient.status,
          systemAccess: newClient.systemAccess || { dashboard: true, finance: true }
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Client "${newClient.name}" created successfully!\n\nOwner account: ${newClient.ownerEmail}\nA welcome email has been sent.`);
        setShowCreateModal(false);
        setNewClient({ name: '', plan: 'basic', status: 'trial', ownerEmail: '', brandEmail: '', password: '', systemAccess: { dashboard: true, finance: true } });
        setShowPassword(false);
        loadClients();
      } else {
        alert(`❌ Failed to create client: ${result.message}`);
      }
    } catch (error) {
      console.error('[ClientsPage] Error creating client:', error);
      alert('Failed to create client. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Tenant> & { systemAccess?: any; features?: any; suspensionReason?: string | null }) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');
      
      // Determine which collection the client is in by checking both
      let collectionName: string;
      let currentDoc;
      let currentData;
      
      // Try businesses first
      try {
        currentDoc = await getDoc(doc(db, 'businesses', clientId));
        if (currentDoc.exists()) {
          collectionName = 'businesses';
          currentData = currentDoc.data();
        } else {
          // Try tenants
          currentDoc = await getDoc(doc(db, 'tenants', clientId));
          if (currentDoc.exists()) {
            collectionName = 'tenants';
            currentData = currentDoc.data();
          } else {
            throw new Error(`Client document not found in businesses or tenants collections`);
          }
        }
      } catch (error) {
        // If getDoc fails, try to determine from client data
        collectionName = (client as any)._source === 'businesses' ? 'businesses' : 'tenants';
        currentDoc = await getDoc(doc(db, collectionName, clientId));
        if (!currentDoc.exists()) {
          // Try the other collection
          const otherCollection = collectionName === 'businesses' ? 'tenants' : 'businesses';
          const otherDoc = await getDoc(doc(db, otherCollection, clientId));
          if (otherDoc.exists()) {
            collectionName = otherCollection;
            currentDoc = otherDoc;
            currentData = otherDoc.data();
          } else {
            throw new Error(`Client document not found in ${collectionName} or ${otherCollection} collections`);
          }
        } else {
          currentData = currentDoc.data();
        }
      }
      
      let updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (collectionName === 'businesses') {
        if (updates.status !== undefined) {
          updateData.status = updates.status;
          const currentPlan = currentData?.plan || {};
          updateData.plan = { ...currentPlan, status: updates.status };
        }
        if (updates.plan !== undefined) {
          const currentPlan = currentData?.plan || {};
          updateData.plan = { ...currentPlan, type: updates.plan };
        }
        if (updates.name !== undefined) {
          updateData.businessName = updates.name;
          updateData.name = updates.name;
        }
        if ((updates as any).ownerEmail !== undefined) {
          updateData.owner = { ...(currentData?.owner || {}), email: (updates as any).ownerEmail };
        }
        if ((updates as any).brandEmail !== undefined || (updates as any).contactEmail !== undefined) {
          const email = (updates as any).brandEmail || (updates as any).contactEmail;
          updateData.contact = { ...(currentData?.contact || {}), email: email };
        }
        if (updates.systemAccess !== undefined) {
          updateData.systemAccess = updates.systemAccess;
        }
        if (updates.features !== undefined) {
          updateData.features = { ...(currentData?.features || {}), ...updates.features };
        }
        if (updates.suspensionReason !== undefined) {
          updateData.suspensionReason = updates.suspensionReason;
        }
      } else {
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.plan !== undefined) updateData.plan = updates.plan;
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.systemAccess !== undefined) updateData.systemAccess = updates.systemAccess;
        if (updates.features !== undefined) {
          updateData.features = { ...(currentData?.features || {}), ...updates.features };
        }
        if (updates.suspensionReason !== undefined) updateData.suspensionReason = updates.suspensionReason;
      }
      
      await updateDoc(doc(db, collectionName, clientId), updateData);
      
      // Reload clients to get fresh data
      await loadClients();
      
      // Update selectedClient if it's the one we just updated
      if (selectedClient && selectedClient.id === clientId) {
        // Fetch the updated client to refresh the modal
        const updatedDoc = await getDoc(doc(db, collectionName, clientId));
        if (updatedDoc.exists()) {
          const updatedData = updatedDoc.data();
          const updatedClient: any = {
            id: updatedDoc.id,
            name: updatedData.businessName || updatedData.name || 'Unnamed Business',
            plan: updatedData.plan?.type || updatedData.plan || 'basic',
            status: updatedData.plan?.status ?? updatedData.status ?? 'active',
            created_at: updatedData.createdAt?.toDate?.()?.toISOString() || 
                       updatedData.created_at || 
                       updatedData.metadata?.createdAt ||
                       new Date().toISOString(),
            updated_at: updatedData.updatedAt?.toDate?.()?.toISOString() || 
                       updatedData.updated_at || 
                       updatedData.metadata?.updatedAt ||
                       new Date().toISOString(),
            _source: collectionName === 'businesses' ? 'businesses' : 'tenants',
            ownerEmail: updatedData.owner?.email || updatedData.contact?.email || 'N/A',
            contactEmail: updatedData.contact?.email || updatedData.owner?.email || 'N/A',
            phone: updatedData.contact?.phone || updatedData.settings?.phone || 'N/A',
            systemAccess: updatedData.systemAccess || {
              dashboard: true,
              finance: true
            },
            features: updatedData.features || {},
            suspensionReason: updatedData.suspensionReason || null
          };
          setSelectedClient(updatedClient as Tenant);
        }
      }
      
      // Show success message
      if (updates.status === 'suspended') {
        alert(`✅ Client "${client.name}" has been suspended.`);
      } else if (updates.status === 'active' && client.status === 'suspended') {
        alert(`✅ Client "${client.name}" has been activated.`);
      }
    } catch (error) {
      console.error('[ClientsPage] Error updating client:', error);
      alert('Failed to update client: ' + (error as Error).message);
    }
  };

  const handleToggleSystemAccess = async (clientId: string, system: 'dashboard' | 'finance') => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const clientAny = client as any;
    const currentAccess = clientAny.systemAccess || { dashboard: true, finance: true };
    const newAccess = {
      ...currentAccess,
      [system]: !currentAccess[system]
    };
    
    // Store original selectedClient for revert on error
    const originalSelectedClient = selectedClient;
    
    // Optimistically update the UI immediately if this is the selected client in the modal
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient({
        ...selectedClient,
        ...clientAny,
        systemAccess: newAccess
      } as Tenant);
    }
    
    // Also update the clients list optimistically
    setClients(prevClients => 
      prevClients.map(c => 
        c.id === clientId 
          ? { ...c, ...clientAny, systemAccess: newAccess } as Tenant
          : c
      )
    );
    
    // Then update in the database
    try {
      await handleUpdateClient(clientId, { systemAccess: newAccess } as any);
      
      // The handleUpdateClient already refreshes selectedClient, so we're good
    } catch (error) {
      // Revert on error
      if (originalSelectedClient && originalSelectedClient.id === clientId) {
        setSelectedClient(originalSelectedClient);
      }
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === clientId ? client : c
        )
      );
      console.error('[ClientsPage] Error updating system access:', error);
      alert('Failed to update system access. Please try again.');
    }
  };

  const handleSuspendClient = async () => {
    if (!selectedClient || !suspensionReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }
    
    await handleUpdateClient(selectedClient.id, {
      status: 'suspended',
      suspensionReason: suspensionReason.trim()
    } as any);
    
    setShowSuspendModal(false);
    setSuspensionReason('');
    setSelectedClient(null);
  };

  const handleActivateClient = async (clientId: string) => {
    await handleUpdateClient(clientId, {
      status: 'active',
      suspensionReason: null
    } as any);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;

    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');
      
      const collectionName = (client as any)._source === 'businesses' ? 'businesses' : 'tenants';
      await deleteDoc(doc(db, collectionName, clientId));
      loadClients();
    } catch (error) {
      console.error('[ClientsPage] Error deleting client:', error);
      alert('Failed to delete client: ' + (error as Error).message);
    }
  };

  const getPlanString = (plan: any): string => {
    if (typeof plan === 'string') return plan;
    if (plan && typeof plan === 'object') return plan.type || plan.plan || 'basic';
    return 'basic';
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    const clientPlan = getPlanString(client.plan);
    const matchesPlan = filterPlan === 'all' || clientPlan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    trial: clients.filter(c => c.status === 'trial').length,
    suspended: clients.filter(c => c.status === 'suspended').length
  };


  return (
    <PermissionGuard permission="super_admin.manage_all_tenants" showError>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients Management</h1>
            <p className="text-gray-400 mt-1">Manage all client businesses on your platform</p>
          </div>
          <PermissionGuard permission="super_admin.manage_all_tenants">
            <button
              onClick={() => {
                setSelectedClient(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-500/25"
            >
              <Plus className="w-5 h-5" />
              Add Client
            </button>
          </PermissionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Clients</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-gray-400">Trial</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.trial}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm text-gray-400">Suspended</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Client Name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Owner Email</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">System Access</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Created</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const clientAny = client as any;
                    const planValue = getPlanString(client.plan);
                    return (
                      <tr key={client.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="font-medium text-white">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{clientAny.ownerEmail || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            planValue === 'enterprise'
                              ? 'bg-purple-500/20 text-purple-400'
                              : planValue === 'professional'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {planValue.charAt(0).toUpperCase() + planValue.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={client.status}
                            onChange={async (e) => {
                              await handleUpdateClient(client.id, { status: e.target.value as Tenant['status'] });
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${
                              client.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : client.status === 'trial'
                                ? 'bg-amber-500/20 text-amber-400'
                                : client.status === 'suspended'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="trial">Trial</option>
                            <option value="suspended">Suspended</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleSystemAccess(client.id, 'dashboard')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                (clientAny.systemAccess?.dashboard !== false)
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                              }`}
                              title={(clientAny.systemAccess?.dashboard !== false) ? 'Dashboard Access Enabled' : 'Dashboard Access Disabled'}
                            >
                              <LayoutDashboard className="w-3.5 h-3.5" />
                              <span>Dashboard</span>
                            </button>
                            <button
                              onClick={() => handleToggleSystemAccess(client.id, 'finance')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                (clientAny.systemAccess?.finance !== false)
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                              }`}
                              title={(clientAny.systemAccess?.finance !== false) ? 'Finance Access Enabled' : 'Finance Access Disabled'}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Finance</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Join business for support
                                const businessId = client.id;
                                const businessName = client.name;
                                
                                // Store support session info
                                sessionStorage.setItem('supportMode', 'true');
                                sessionStorage.setItem('supportBusinessId', businessId);
                                sessionStorage.setItem('supportBusinessName', businessName);
                                sessionStorage.setItem('supportAdminEmail', (user as any)?.email || '');
                                sessionStorage.setItem('supportAdminName', (user as any)?.name || 'Support Staff');
                                
                                // Redirect to dashboard with business context
                                window.open(`/dashboard?business=${businessId}&support=true`, '_blank');
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                              title="Join Business for Support"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowDetailModal(true);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setShowCreateModal(true);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {client.status === 'suspended' ? (
                              <button
                                onClick={() => handleActivateClient(client.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Activate"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowSuspendModal(true);
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Suspend"
                              >
                                <PowerOff className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {selectedClient ? 'Edit Client' : 'Add New Client'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedClient(null);
                    setShowPassword(false);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Client Name</label>
                  <input
                    type="text"
                    value={selectedClient?.name || newClient.name}
                    onChange={(e) =>
                      selectedClient
                        ? setSelectedClient({ ...selectedClient, name: e.target.value })
                        : setNewClient({ ...newClient, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Owner Email</label>
                  <input
                    type="email"
                    value={selectedClient ? (selectedClient as any).ownerEmail || '' : newClient.ownerEmail}
                    onChange={(e) =>
                      selectedClient
                        ? setSelectedClient({ ...selectedClient, ownerEmail: e.target.value } as any)
                        : setNewClient({ ...newClient, ownerEmail: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="owner@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Brand Email</label>
                  <input
                    type="email"
                    value={selectedClient ? (selectedClient as any).contactEmail || '' : newClient.brandEmail}
                    onChange={(e) =>
                      selectedClient
                        ? setSelectedClient({ ...selectedClient, contactEmail: e.target.value } as any)
                        : setNewClient({ ...newClient, brandEmail: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="contact@example.com"
                  />
                </div>
                {!selectedClient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Password
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newClient.password}
                        onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                        className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                        placeholder="••••••••"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">Minimum 6 characters for client owner account</p>
                  </div>
                )}
                
                {/* System Access Controls */}
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-sm font-medium text-gray-300 mb-3">System Access</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const clientAny = selectedClient as any;
                        const currentAccess = clientAny?.systemAccess || { dashboard: true, finance: true };
                        const newAccess = { ...currentAccess, dashboard: !currentAccess.dashboard };
                        if (selectedClient) {
                          handleUpdateClient(selectedClient.id, { systemAccess: newAccess } as any);
                        } else {
                          setNewClient({ ...newClient, systemAccess: newAccess } as any);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                        (selectedClient ? (selectedClient as any).systemAccess?.dashboard !== false : newClient.systemAccess?.dashboard !== false)
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="text-sm font-medium">Dashboard</span>
                      {(selectedClient ? (selectedClient as any).systemAccess?.dashboard !== false : newClient.systemAccess?.dashboard !== false) ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const clientAny = selectedClient as any;
                        const currentAccess = clientAny?.systemAccess || { dashboard: true, finance: true };
                        const newAccess = { ...currentAccess, finance: !currentAccess.finance };
                        if (selectedClient) {
                          handleUpdateClient(selectedClient.id, { systemAccess: newAccess } as any);
                        } else {
                          setNewClient({ ...newClient, systemAccess: newAccess } as any);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                        (selectedClient ? (selectedClient as any).systemAccess?.finance !== false : newClient.systemAccess?.finance !== false)
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Finance</span>
                      {(selectedClient ? (selectedClient as any).systemAccess?.finance !== false : newClient.systemAccess?.finance !== false) ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Toggle access to Dashboard and Finance systems</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Plan</label>
                    <select
                      value={selectedClient ? getPlanString(selectedClient.plan) : newClient.plan}
                      onChange={(e) =>
                        selectedClient
                          ? setSelectedClient({ ...selectedClient, plan: e.target.value as Tenant['plan'] })
                          : setNewClient({ ...newClient, plan: e.target.value as Tenant['plan'] })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={selectedClient?.status || newClient.status}
                      onChange={(e) =>
                        selectedClient
                          ? handleUpdateClient(selectedClient.id, { status: e.target.value as Tenant['status'] })
                          : setNewClient({ ...newClient, status: e.target.value as Tenant['status'] })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedClient(null);
                      setShowPassword(false);
                    }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  {selectedClient ? (
                    <button
                      onClick={() => {
                        const clientAny = selectedClient as any;
                        handleUpdateClient(selectedClient.id, {
                          name: selectedClient.name,
                          plan: getPlanString(selectedClient.plan) as Tenant['plan'],
                          status: selectedClient.status,
                          ownerEmail: clientAny.ownerEmail,
                          contactEmail: clientAny.contactEmail
                        } as any);
                        setShowCreateModal(false);
                        setSelectedClient(null);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
                    >
                      Update Client
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateClient}
                      disabled={creating}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        'Create Client'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Detail Modal */}
        {showDetailModal && selectedClient && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                  <p className="text-gray-400 mt-1">Client Details & Control</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedClient(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Owner Email</label>
                      <p className="text-white">{(selectedClient as any).ownerEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Contact Email</label>
                      <p className="text-white">{(selectedClient as any).contactEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Plan</label>
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        getPlanString(selectedClient.plan) === 'enterprise'
                          ? 'bg-purple-500/20 text-purple-400'
                          : getPlanString(selectedClient.plan) === 'professional'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {getPlanString(selectedClient.plan).charAt(0).toUpperCase() + getPlanString(selectedClient.plan).slice(1)}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        selectedClient.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : selectedClient.status === 'trial'
                          ? 'bg-amber-500/20 text-amber-400'
                          : selectedClient.status === 'suspended'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {(selectedClient.status ?? 'active').charAt(0).toUpperCase() + (selectedClient.status ?? 'active').slice(1)}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Created</label>
                      <p className="text-white text-sm">
                        {selectedClient.created_at ? new Date(selectedClient.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Last Updated</label>
                      <p className="text-white text-sm">
                        {selectedClient.updated_at ? new Date(selectedClient.updated_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* System Access Control */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    System Access Control
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">Control which systems this client can access</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <LayoutDashboard className="w-5 h-5 text-blue-400" />
                          <span className="font-medium text-white">Dashboard</span>
                        </div>
                        <button
                          onClick={() => handleToggleSystemAccess(selectedClient.id, 'dashboard')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            (selectedClient as any).systemAccess?.dashboard !== false
                              ? 'bg-blue-500'
                              : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              (selectedClient as any).systemAccess?.dashboard !== false ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {(selectedClient as any).systemAccess?.dashboard !== false
                          ? 'Client has access to Dashboard system'
                          : 'Client cannot access Dashboard system'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                          <span className="font-medium text-white">Finance</span>
                        </div>
                        <button
                          onClick={() => handleToggleSystemAccess(selectedClient.id, 'finance')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            (selectedClient as any).systemAccess?.finance !== false
                              ? 'bg-emerald-500'
                              : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              (selectedClient as any).systemAccess?.finance !== false ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {(selectedClient as any).systemAccess?.finance !== false
                          ? 'Client has access to Finance system'
                          : 'Client cannot access Finance system'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features Management */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    Business Features
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">Enable or disable features for this business</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="font-medium text-white">Fulfillment Service</div>
                          <div className="text-xs text-gray-500">Enable order fulfillment management</div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const clientAny = selectedClient as any;
                          const currentFeatures = clientAny.features || {};
                          const isEnabled = currentFeatures.fulfillment || 
                                           currentFeatures.fulfillment_service || 
                                           currentFeatures.fulfillmentService;
                          const newFeatures = {
                            ...currentFeatures,
                            fulfillment: !isEnabled,
                            fulfillment_service: !isEnabled,
                            fulfillmentService: !isEnabled
                          };
                          
                          // Optimistically update the UI immediately
                          const optimisticClient = {
                            ...selectedClient,
                            ...clientAny,
                            features: newFeatures
                          } as Tenant;
                          setSelectedClient(optimisticClient);
                          
                          // Then update in the database
                          try {
                            await handleUpdateClient(selectedClient.id, { features: newFeatures } as any);
                            
                            // Fetch the updated client (try both collections; client may exist only in businesses)
                            const preferred = (selectedClient as any)._source === 'businesses' ? 'businesses' : 'tenants';
                            const other = preferred === 'businesses' ? 'tenants' : 'businesses';
                            let clientDoc: { exists: () => boolean; id: string; data: () => Record<string, unknown> } | null = null;
                            let source: 'businesses' | 'tenants' = preferred;
                            try {
                              const doc1 = await getDoc(doc(db, preferred, selectedClient.id));
                              if (doc1.exists()) {
                                clientDoc = doc1;
                              } else {
                                const doc2 = await getDoc(doc(db, other, selectedClient.id));
                                if (doc2.exists()) {
                                  clientDoc = doc2;
                                  source = other;
                                }
                              }
                            } catch {
                              try {
                                const doc2 = await getDoc(doc(db, other, selectedClient.id));
                                if (doc2.exists()) {
                                  clientDoc = doc2;
                                  source = other;
                                }
                              } catch {
                                clientDoc = null;
                              }
                            }
                            if (clientDoc?.exists()) {
                              const data = clientDoc.data();
                              const updatedData = {
                                id: clientDoc.id,
                                ...data,
                                name: (data as any)?.businessName || (data as any)?.name || selectedClient.name,
                                plan: (data as any)?.plan?.type ?? (data as any)?.plan ?? selectedClient.plan,
                                status: (data as any)?.plan?.status ?? (data as any)?.status ?? selectedClient.status,
                                _source: source
                              } as Tenant;
                              setSelectedClient(updatedData);
                            }
                          } catch (error) {
                            // Revert on error
                            setSelectedClient(selectedClient);
                            console.error('[ClientsPage] Error updating fulfillment feature:', error);
                            alert('Failed to update fulfillment feature. Please try again.');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          (selectedClient as any).features?.fulfillment ||
                          (selectedClient as any).features?.fulfillment_service ||
                          (selectedClient as any).features?.fulfillmentService
                            ? 'bg-purple-500'
                            : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (selectedClient as any).features?.fulfillment ||
                            (selectedClient as any).features?.fulfillment_service ||
                            (selectedClient as any).features?.fulfillmentService
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    When enabled, orders from this business will appear in the Fulfillment Management page
                  </p>
                </div>

                {/* Suspension Info */}
                {(selectedClient as any).suspensionReason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Suspension Details
                    </h3>
                    <p className="text-white text-sm">{(selectedClient as any).suspensionReason}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedClient.status === 'suspended' ? (
                      <button
                        onClick={() => {
                          handleActivateClient(selectedClient.id);
                          setShowDetailModal(false);
                        }}
                        className="px-4 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-all font-medium"
                      >
                        <Power className="w-4 h-4 inline mr-2" />
                        Activate Client
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowSuspendModal(true);
                          setShowDetailModal(false);
                        }}
                        className="px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all font-medium"
                      >
                        <PowerOff className="w-4 h-4 inline mr-2" />
                        Suspend Client
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-all font-medium"
                    >
                      <Edit2 className="w-4 h-4 inline mr-2" />
                      Edit Client
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
                          handleDeleteClient(selectedClient.id);
                          setShowDetailModal(false);
                        }
                      }}
                      className="px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all font-medium"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Delete Client
                    </button>
                    <button
                      onClick={() => {
                        // Join business for support
                        const businessId = selectedClient.id;
                        const businessName = selectedClient.name;
                        
                        // Store support session info
                        sessionStorage.setItem('supportMode', 'true');
                        sessionStorage.setItem('supportBusinessId', businessId);
                        sessionStorage.setItem('supportBusinessName', businessName);
                        sessionStorage.setItem('supportAdminEmail', (user as any)?.email || '');
                        sessionStorage.setItem('supportAdminName', (user as any)?.name || 'Support Staff');
                        
                        // Redirect to dashboard with business context
                        window.open(`/dashboard?business=${businessId}&support=true`, '_blank');
                      }}
                      className="px-4 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-all font-medium w-full"
                    >
                      <UserCog className="w-4 h-4 inline mr-2" />
                      Join Business for Support
                    </button>
                    <a
                      href={`/dashboard?business=${selectedClient.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all font-medium text-center"
                    >
                      <ExternalLink className="w-4 h-4 inline mr-2" />
                      View Dashboard
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
