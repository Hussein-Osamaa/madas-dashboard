import { useState, useEffect, useCallback, useMemo } from 'react';
import PermissionGuard from '../components/rbac/PermissionGuard';
import type { Role, Permission } from '@shared/types/rbac';
import { roleService, permissionService, rolePermissionService } from '@shared/lib/rbacService';
import { Users, Plus, Edit2, Trash2, X, Save, Search, KeyRound, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export default function ClientStaffPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissionIds, setRolePermissionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    tenant_id: 'template' as string | null,
    is_system: false
  });

  const loadRoles = useCallback(async () => {
    try {
      const allRoles = await roleService.getAll();
      // Filter to template roles for clients (tenant_id is 'template')
      const templateRoles = allRoles.filter(role => role.tenant_id === 'template');
      setRoles(templateRoles);
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error loading roles:', error);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const allPermissions = await permissionService.getAll();
      // Filter to client/tenant permissions
      const clientPermissions = allPermissions.filter(p => 
        p.category === 'tenant' || p.category === 'client' || p.category === 'staff'
      );
      setPermissions(clientPermissions);
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error loading permissions:', error);
    }
  }, []);

  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      const rolePerms = await rolePermissionService.getByRole(roleId);
      setRolePermissionIds(rolePerms.map(rp => rp.permission_id));
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error loading role permissions:', error);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [loadRoles, loadPermissions]);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    } else {
      setRolePermissionIds([]);
    }
  }, [selectedRole, loadRolePermissions]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    permissions.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [permissions]);

  const filteredPerms = useMemo(() => {
    return permissions.filter(p => {
      const matchesSearch = !searchTerm || 
        p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [permissions, searchTerm, filterCategory]);

  const handlePermissionToggle = async (permissionId: string) => {
    if (!selectedRole) return;

    const isEnabled = rolePermissionIds.includes(permissionId);

    try {
      if (isEnabled) {
        await rolePermissionService.removePermission(selectedRole.id, permissionId);
        setRolePermissionIds(prev => prev.filter(id => id !== permissionId));
      } else {
        await rolePermissionService.addPermission(selectedRole.id, permissionId);
        setRolePermissionIds(prev => [...prev, permissionId]);
      }
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error toggling permission:', error);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return;
    setSaving(true);
    try {
      await roleService.create({
        name: newRole.name,
        description: newRole.description,
        tenant_id: 'template', // Template roles for clients
        is_system: false
      });
      await loadRoles();
      setShowCreateModal(false);
      setNewRole({ name: '', description: '', tenant_id: 'template', is_system: false });
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error creating role:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !newRole.name.trim()) return;
    setSaving(true);
    try {
      await roleService.update(selectedRole.id, {
        name: newRole.name,
        description: newRole.description
      });
      await loadRoles();
      setShowEditModal(false);
      setSelectedRole(prev => prev ? { ...prev, name: newRole.name, description: newRole.description } : null);
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error updating role:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role template?')) return;
    try {
      await roleService.delete(roleId);
      await loadRoles();
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
      }
    } catch (error) {
      console.error('[ClientStaffPermissionsPage] Error deleting role:', error);
    }
  };

  const openEditModal = (role: Role) => {
    setNewRole({
      name: role.name,
      description: role.description || '',
      tenant_id: 'template',
      is_system: role.is_system
    });
    setShowEditModal(true);
  };

  return (
    <PermissionGuard permission="super_admin.manage_roles" showError>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-amber-400" />
              Client Staff Role Templates
            </h1>
            <p className="text-gray-400 mt-1">Create role templates that clients can assign to their staff members</p>
          </div>
          <button
            onClick={() => {
              setNewRole({ name: '', description: '', tenant_id: 'template', is_system: false });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Role Template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Role Templates
            </h2>
            <div className="space-y-2">
              {roles.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No role templates found</p>
              ) : (
                roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedRole?.id === role.id
                        ? 'bg-amber-500/20 border-amber-500/30'
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{role.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{role.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!role.is_system && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRole(role);
                                openEditModal(role);
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2 bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            {selectedRole ? (
              <>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      Permissions for "{selectedRole.name}"
                    </h2>
                    <span className="text-xs text-gray-500">
                      {rolePermissionIds.length} permissions enabled
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search permissions..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredPerms.map(perm => {
                    const isChecked = rolePermissionIds.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(perm.id)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{perm.key}</span>
                            {isChecked && (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <AlertCircle className="w-12 h-12 mb-4 text-gray-600" />
                <p>Select a role template to manage its permissions</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Role Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Create Role Template</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sales Manager"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this role can do..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={saving || !newRole.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Role Modal */}
        {showEditModal && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Edit Role Template</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sales Manager"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this role can do..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={saving || !newRole.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
