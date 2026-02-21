/**
 * Roles Management Page
 * Allows super admins and tenant admins to manage roles and permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import { roleService, rolePermissionService, permissionService } from '@shared/lib/rbacService';
import type { Role, Permission } from '@shared/types/rbac';

export default function RolesPage() {
  const { user, getRoles, getPermissions, getUserPermissions } = useRBAC();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', tenant_id: null as string | null });

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        getRoles(),
        getPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('[RolesPage] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getRoles, getPermissions]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role);
    const rolePerms = await getUserPermissions(role.id);
    setRolePermissions(rolePerms);
  };

  const handlePermissionToggle = async (permissionKey: string) => {
    if (!selectedRole) return;

    const isChecked = rolePermissions.includes(permissionKey);
    const oldPermissionKeys = [...rolePermissions];
    const newPermissionKeys = isChecked
      ? rolePermissions.filter((p) => p !== permissionKey)
      : [...rolePermissions, permissionKey];

    setRolePermissions(newPermissionKeys);

    try {
      // Convert permission keys to permission IDs
      const permissionIds: string[] = [];
      for (const key of newPermissionKeys) {
        const perm = await permissionService.getByKey(key);
        if (perm) {
          permissionIds.push(perm.id);
        }
      }

      // Update role permissions in Firestore
      await rolePermissionService.updateRolePermissions(selectedRole.id, permissionIds);
    } catch (error) {
      console.error('[RolesPage] Error updating role permissions:', error);
      // Revert on error
      setRolePermissions(oldPermissionKeys);
      alert('Failed to update permissions. Please try again.');
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.description) return;
    if (!user) return;

    try {
      // Determine tenant_id based on current user
      const tenantId = user.type === 'super_admin' ? null : user.tenant_id;
      
      await roleService.create({
        name: newRole.name,
        description: newRole.description,
        tenant_id: tenantId,
        is_system: false
      });
      
      setShowCreateModal(false);
      setNewRole({ name: '', description: '', tenant_id: null });
      await loadData();
    } catch (error) {
      console.error('[RolesPage] Error creating role:', error);
      alert('Failed to create role. Please try again.');
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading roles...</div>
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="roles.view"
      showError
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <PermissionGuard permission="roles.create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Create Role
            </button>
          </PermissionGuard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Roles</h2>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRole?.id === role.id
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm opacity-75 mt-1">{role.description}</div>
                    {role.is_system && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mt-1 inline-block">
                        System
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions */}
          {selectedRole && (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">{selectedRole.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{selectedRole.description}</p>
                </div>

                <PermissionGuard permission="roles.edit">
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                      <div key={category}>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                          {category.replace('_', ' ')}
                        </h3>
                        <div className="space-y-2">
                          {perms.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={rolePermissions.includes(perm.key)}
                                onChange={() => handlePermissionToggle(perm.key)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{perm.key}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {perm.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PermissionGuard>
              </div>
            </div>
          )}
        </div>

        {/* Create Role Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Create New Role</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Manager, Sales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Describe this role's responsibilities"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRole}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

