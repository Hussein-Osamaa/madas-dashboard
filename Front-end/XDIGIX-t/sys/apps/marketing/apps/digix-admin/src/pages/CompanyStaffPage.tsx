/**
 * XDIGIX Company Staff Management Page
 * Manage company's internal staff (super admin users) and their access
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where } from '../lib/firebase';
import type { User, Role } from '@shared/types/rbac';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  Loader2,
  Settings,
  Check
} from 'lucide-react';

// Define permission groups for super admin staff
const PERMISSION_GROUPS = {
  dashboard: {
    label: 'Dashboard',
    permissions: {
      'dashboard.view': 'View Dashboard',
      'dashboard.analytics': 'View Analytics',
      'dashboard.reports': 'View Reports'
    }
  },
  clients: {
    label: 'Clients/Tenants',
    permissions: {
      'clients.view': 'View Clients',
      'clients.create': 'Create Clients',
      'clients.update': 'Update Clients',
      'clients.delete': 'Delete Clients',
      'clients.manage_subscription': 'Manage Subscriptions'
    }
  },
  orders: {
    label: 'Orders',
    permissions: {
      'orders.view': 'View Orders',
      'orders.create': 'Create Orders',
      'orders.update': 'Update Orders',
      'orders.delete': 'Delete Orders',
      'orders.view_scan_log': 'View Scan Log'
    }
  },
  fulfillment: {
    label: 'Fulfillment',
    permissions: {
      'fulfillment.view': 'View Fulfillment',
      'fulfillment.pending_orders': 'Manage Pending Orders',
      'fulfillment.ready_for_pickup': 'Manage Ready for Pickup',
      'fulfillment.shipping': 'Manage Shipping',
      'fulfillment.scan_items': 'Scan Items'
    }
  },
  staff: {
    label: 'Staff Management',
    permissions: {
      'staff.view': 'View Staff',
      'staff.invite': 'Invite Staff',
      'staff.update': 'Update Staff',
      'staff.delete': 'Delete Staff',
      'staff.manage_permissions': 'Manage Permissions'
    }
  },
  roles: {
    label: 'Roles & Access Control',
    permissions: {
      'roles.view': 'View Roles',
      'roles.create': 'Create Roles',
      'roles.update': 'Update Roles',
      'roles.delete': 'Delete Roles',
      'roles.assign': 'Assign Roles'
    }
  },
  settings: {
    label: 'System Settings',
    permissions: {
      'settings.view': 'View Settings',
      'settings.update': 'Update Settings',
      'settings.billing': 'Manage Billing',
      'settings.integrations': 'Manage Integrations'
    }
  }
};

type StaffPermissions = Record<string, boolean>;

// API base URL for Cloud Functions (2nd Gen Cloud Run)
const API_BASE_URL = 'https://api-erl4dkfzua-uc.a.run.app';

interface StaffInvite {
  id: string;
  email: string;
  name: string;
  role_id: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedAt: string;
  expiresAt?: string;
}

export default function CompanyStaffPage() {
  const { canManageUser, getRoles } = useRBAC();
  const [staff, setStaff] = useState<User[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  // Permissions editor state
  const [showPermissionsEditor, setShowPermissionsEditor] = useState(false);
  const [editingStaffPermissions, setEditingStaffPermissions] = useState<User | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role_id: '',
    status: 'active' as User['status']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load existing staff (super_admin users)
      const q = query(collection(db, 'users'), where('type', '==', 'super_admin'));
      const snapshot = await getDocs(q);
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setStaff(staffData);

      // Load pending invitations
      const invitesQuery = query(
        collection(db, 'superAdminInvites'),
        where('status', '==', 'pending')
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      const invitesData = invitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffInvite[];
      setInvites(invitesData);

      const rolesData = await getRoles();
      const superAdminRoles = rolesData.filter(role => role.tenant_id === null);
      setRoles(superAdminRoles);
    } catch (error) {
      console.error('[CompanyStaffPage] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitationEmail = async (
    toEmail: string,
    staffName: string,
    role: string,
    inviteId: string
  ) => {
    const roleName = roles.find(r => r.id === role)?.name || 'Staff';
    // Use xdigix.com or fallback to madas-store.web.app
    const baseUrl = window.location.origin.includes('xdigix.com') 
      ? 'https://xdigix.com' 
      : 'https://madas-store.web.app';
    const setupUrl = `${baseUrl}/admin/setup-password?email=${encodeURIComponent(toEmail)}&invite=${encodeURIComponent(inviteId)}&type=super_admin`;
    
    const response = await fetch(`${API_BASE_URL}/api/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail,
        staffName,
        businessName: 'XDIGIX Admin',
        role: roleName,
        inviterName: 'XDIGIX Team',
        businessId: 'xdigix-admin',
        setupUrl
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send invitation email');
    }

    return response.json();
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.role_id) {
      setInviteError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaff.email)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      // Check if user already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', newStaff.email.toLowerCase())
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        setInviteError('A user with this email already exists');
        setSendingInvite(false);
        return;
      }

      // Check if invitation already exists
      const existingInviteQuery = query(
        collection(db, 'superAdminInvites'),
        where('email', '==', newStaff.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const existingInviteSnapshot = await getDocs(existingInviteQuery);
      
      if (!existingInviteSnapshot.empty) {
        setInviteError('An invitation has already been sent to this email');
        setSendingInvite(false);
        return;
      }

      // Create invitation record
      const inviteRef = await addDoc(collection(db, 'superAdminInvites'), {
        email: newStaff.email.toLowerCase(),
        name: newStaff.name,
        role_id: newStaff.role_id,
        status: 'pending',
        invitedBy: 'admin', // TODO: Get current user ID
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      console.log('[CompanyStaffPage] Created invitation:', inviteRef.id);

      // Send invitation email
      await sendInvitationEmail(
        newStaff.email,
        newStaff.name,
        newStaff.role_id,
        inviteRef.id
      );

      setInviteSuccess(`Invitation sent successfully to ${newStaff.email}`);
      setShowCreateModal(false);
      setNewStaff({ name: '', email: '', role_id: '', status: 'active' });
      loadData();
    } catch (error: any) {
      console.error('[CompanyStaffPage] Error creating staff invitation:', error);
      setInviteError(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (invite: StaffInvite) => {
    setSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await sendInvitationEmail(
        invite.email,
        invite.name,
        invite.role_id,
        invite.id
      );

      // Update invitation timestamp
      await updateDoc(doc(db, 'superAdminInvites', invite.id), {
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      setInviteSuccess(`Invitation resent to ${invite.email}`);
      loadData();
    } catch (error: any) {
      console.error('[CompanyStaffPage] Error resending invitation:', error);
      setInviteError(error.message || 'Failed to resend invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await deleteDoc(doc(db, 'superAdminInvites', inviteId));
      setInviteSuccess('Invitation cancelled');
      loadData();
    } catch (error) {
      console.error('[CompanyStaffPage] Error cancelling invitation:', error);
      setInviteError('Failed to cancel invitation');
    }
  };

  const handleUpdateStaff = async (staffId: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', staffId), {
        ...updates,
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('[CompanyStaffPage] Error updating staff:', error);
      alert('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', staffId));
      loadData();
    } catch (error) {
      console.error('[CompanyStaffPage] Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || 'Unknown';
  };

  // Open permissions editor for a staff member
  const openPermissionsEditor = (member: User) => {
    setEditingStaffPermissions(member);
    // Load existing permissions or initialize empty
    const existingPermissions: StaffPermissions = (member as any).permissions || {};
    setStaffPermissions(existingPermissions);
    setShowPermissionsEditor(true);
  };

  // Toggle a single permission
  const togglePermission = (permissionKey: string) => {
    setStaffPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  // Toggle all permissions in a group
  const toggleGroupPermissions = (groupKey: string, selectAll: boolean) => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return;
    
    const updates: StaffPermissions = {};
    Object.keys(group.permissions).forEach(permKey => {
      updates[permKey] = selectAll;
    });
    
    setStaffPermissions(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Check if all permissions in a group are selected
  const isGroupFullySelected = (groupKey: string): boolean => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return false;
    return Object.keys(group.permissions).every(permKey => staffPermissions[permKey]);
  };

  // Check if some permissions in a group are selected
  const isGroupPartiallySelected = (groupKey: string): boolean => {
    const group = PERMISSION_GROUPS[groupKey as keyof typeof PERMISSION_GROUPS];
    if (!group) return false;
    const selected = Object.keys(group.permissions).filter(permKey => staffPermissions[permKey]);
    return selected.length > 0 && selected.length < Object.keys(group.permissions).length;
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!editingStaffPermissions) return;
    
    setSavingPermissions(true);
    try {
      await updateDoc(doc(db, 'users', editingStaffPermissions.id), {
        permissions: staffPermissions,
        updated_at: new Date().toISOString()
      });
      
      setInviteSuccess(`Permissions updated for ${editingStaffPermissions.name}`);
      setShowPermissionsEditor(false);
      setEditingStaffPermissions(null);
      loadData();
    } catch (error) {
      console.error('[CompanyStaffPage] Error saving permissions:', error);
      setInviteError('Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'active').length,
    pending: invites.length,
    inactive: staff.filter(s => s.status !== 'active').length
  };


  return (
    <PermissionGuard permission="super_admin.manage_staff" showError>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Company Staff</h1>
            <p className="text-gray-400 mt-1">Manage your company's internal staff and their access</p>
          </div>
          <div className="flex gap-3">
            <PermissionGuard permission="super_admin.manage_roles">
              <button
                onClick={() => setShowPermissionsModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all"
              >
                <KeyRound className="w-5 h-5" />
                <span className="hidden sm:inline">Manage Roles</span>
              </button>
            </PermissionGuard>
            <PermissionGuard permission="super_admin.manage_staff">
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setInviteError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-500/25"
              >
                <UserPlus className="w-5 h-5" />
                Invite Staff
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Staff</span>
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
                <Mail className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-gray-400">Pending Invites</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Inactive</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">{stats.inactive}</p>
          </div>
        </div>

        {/* Success/Error Notifications */}
        {inviteSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-emerald-400">{inviteSuccess}</span>
            <button
              onClick={() => setInviteSuccess(null)}
              className="ml-auto p-1 text-emerald-400 hover:text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {inviteError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-400">{inviteError}</span>
            <button
              onClick={() => setInviteError(null)}
              className="ml-auto p-1 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending Invitations */}
        {invites.length > 0 && (
          <div className="bg-[#1a1b3e] border border-amber-500/20 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 bg-amber-500/5 border-b border-amber-500/20">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Pending Invitations</h2>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                  {invites.length}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Invited</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                            <span className="text-amber-400 font-semibold">{invite.name?.charAt(0) || '?'}</span>
                          </div>
                          <span className="font-medium text-white">{invite.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{invite.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
                          {getRoleName(invite.role_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(invite.invitedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendInvite(invite)}
                            disabled={sendingInvite}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                          >
                            {sendingInvite ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Role</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Last Login</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => {
                    const canManage = canManageUser(member);

                    return (
                      <tr key={member.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                              <span className="text-purple-400 font-semibold">{member.name?.charAt(0) || '?'}</span>
                            </div>
                            <span className="font-medium text-white">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
                            {getRoleName(member.role_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={member.status}
                            onChange={(e) =>
                              handleUpdateStaff(member.id, { status: e.target.value as User['status'] })
                            }
                            className={`px-3 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${
                              member.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : member.status === 'inactive'
                                ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          {canManage && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPermissionsEditor(member)}
                                className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                title="Edit Permissions"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStaff(member);
                                  setShowCreateModal(true);
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                title="Edit Staff"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(member.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Delete Staff"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Staff Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {selectedStaff ? (
                    <Edit2 className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Send className="w-6 h-6 text-amber-400" />
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {selectedStaff ? 'Edit Staff Member' : 'Invite New Staff'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedStaff(null);
                    setInviteError(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!selectedStaff && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-200">
                    <strong>📧 Invitation Email:</strong> An email will be sent to the staff member with a link to set up their account and password.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={selectedStaff?.name || newStaff.name}
                    onChange={(e) =>
                      selectedStaff
                        ? setSelectedStaff({ ...selectedStaff, name: e.target.value })
                        : setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                    placeholder="John Doe"
                    disabled={sendingInvite}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={selectedStaff?.email || newStaff.email}
                    onChange={(e) =>
                      selectedStaff
                        ? setSelectedStaff({ ...selectedStaff, email: e.target.value })
                        : setNewStaff({ ...newStaff, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                    placeholder="john@company.com"
                    disabled={!!selectedStaff || sendingInvite}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role *</label>
                  <select
                    value={selectedStaff?.role_id || newStaff.role_id}
                    onChange={(e) =>
                      selectedStaff
                        ? setSelectedStaff({ ...selectedStaff, role_id: e.target.value })
                        : setNewStaff({ ...newStaff, role_id: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
                    disabled={sendingInvite}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Only show status for existing staff */}
                {selectedStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={selectedStaff.status}
                      onChange={(e) =>
                        setSelectedStaff({ ...selectedStaff, status: e.target.value as User['status'] })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}

                {/* Error message in modal */}
                {inviteError && !selectedStaff && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {inviteError}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedStaff(null);
                      setInviteError(null);
                    }}
                    disabled={sendingInvite}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {selectedStaff ? (
                    <button
                      onClick={() => {
                        handleUpdateStaff(selectedStaff.id, {
                          name: selectedStaff.name,
                          role_id: selectedStaff.role_id,
                          status: selectedStaff.status
                        });
                        setShowCreateModal(false);
                        setSelectedStaff(null);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
                    >
                      Update Staff
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateStaff}
                      disabled={sendingInvite}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-70 inline-flex items-center justify-center gap-2"
                    >
                      {sendingInvite ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Invitation
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roles & Permissions Modal */}
        {showPermissionsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Roles & Permissions</h2>
                <button
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setSelectedRole(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 mb-6">
                Manage roles and permissions for your company staff.
              </p>
              <div className="space-y-3 mb-6">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/30 cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedRole(role);
                      window.location.href = '/roles';
                    }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <Shield className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-white">{role.name}</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-8">{role.description}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => (window.location.href = '/roles')}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
              >
                Go to Roles & Permissions
              </button>
            </div>
          </div>
        )}

        {/* Staff Permissions Editor Modal */}
        {showPermissionsEditor && editingStaffPermissions && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Edit Permissions</h2>
                      <p className="text-gray-400 text-sm">
                        {editingStaffPermissions.name} • {editingStaffPermissions.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPermissionsEditor(false);
                      setEditingStaffPermissions(null);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Permissions Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const isFullySelected = isGroupFullySelected(groupKey);
                    const isPartiallySelected = isGroupPartiallySelected(groupKey);
                    
                    return (
                      <div 
                        key={groupKey} 
                        className="bg-white/5 border border-white/10 rounded-xl p-4"
                      >
                        {/* Group Header with Select All */}
                        <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-white/10">
                          <div 
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                              isFullySelected 
                                ? 'bg-purple-500 border-purple-500' 
                                : isPartiallySelected
                                ? 'bg-purple-500/50 border-purple-500'
                                : 'border-gray-500 hover:border-purple-400'
                            }`}
                            onClick={() => toggleGroupPermissions(groupKey, !isFullySelected)}
                          >
                            {(isFullySelected || isPartiallySelected) && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <span className="font-semibold text-white">{group.label}</span>
                          <span className="text-xs text-gray-500 ml-auto">(Select all)</span>
                        </label>

                        {/* Individual Permissions */}
                        <div className="space-y-2 ml-2">
                          {Object.entries(group.permissions).map(([permKey, permLabel]) => (
                            <label 
                              key={permKey}
                              className="flex items-center gap-3 cursor-pointer py-1.5 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div 
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  staffPermissions[permKey]
                                    ? 'bg-purple-500 border-purple-500'
                                    : 'border-gray-500 hover:border-purple-400'
                                }`}
                                onClick={() => togglePermission(permKey)}
                              >
                                {staffPermissions[permKey] && (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                              <span className="text-gray-300 text-sm">{permLabel}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {Object.values(staffPermissions).filter(Boolean).length} permissions selected
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPermissionsEditor(false);
                        setEditingStaffPermissions(null);
                      }}
                      className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-400 hover:to-purple-500 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {savingPermissions ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Save Permissions
                        </>
                      )}
                    </button>
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
