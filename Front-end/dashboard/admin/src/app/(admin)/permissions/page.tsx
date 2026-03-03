'use client';

import { useState, useEffect } from 'react';
import { Search, User, Shield, Save, Check, X } from 'lucide-react';
import { AdminService, User as AdminUser } from '@/lib/adminService';

interface Permission {
  name: string;
  label: string;
  actions: string[];
}

const PERMISSIONS: Permission[] = [
  {
    name: 'home',
    label: 'Dashboard',
    actions: ['view']
  },
  {
    name: 'orders',
    label: 'Orders',
    actions: ['view', 'search', 'create', 'edit']
  },
  {
    name: 'inventory',
    label: 'Inventory',
    actions: ['view', 'edit']
  },
  {
    name: 'customers',
    label: 'Customers',
    actions: ['view', 'edit']
  },
  {
    name: 'employees',
    label: 'Staff',
    actions: ['view', 'edit']
  },
  {
    name: 'finance',
    label: 'Finance',
    actions: ['view', 'reports']
  },
  {
    name: 'analytics',
    label: 'Analytics',
    actions: ['view', 'export']
  },
  {
    name: 'settings',
    label: 'Settings',
    actions: ['view', 'edit']
  }
];

export default function PermissionsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  useEffect(() => {
    if (selectedUser) {
      setUserPermissions(selectedUser.permissions || {});
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await AdminService.getUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      setError('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    try {
      const user = await AdminService.getUser(userId);
      setSelectedUser(user);
    } catch (error) {
      setError('Failed to load user details');
      console.error('Error loading user:', error);
    }
  };

  const handlePermissionChange = (permission: string, action: string, checked: boolean) => {
    setUserPermissions((prev: any) => {
      const newPermissions = { ...prev };
      if (!newPermissions[permission]) {
        newPermissions[permission] = [];
      }
      
      if (checked) {
        if (!newPermissions[permission].includes(action)) {
          newPermissions[permission] = [...newPermissions[permission], action];
        }
      } else {
        newPermissions[permission] = newPermissions[permission].filter((a: string) => a !== action);
      }
      
      return newPermissions;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      
      await AdminService.updateUserPermissions(selectedUser.uid, userPermissions);
      setSuccess('Permissions updated successfully');
      
      // Update the user in the list
      setUsers(users.map(user => 
        user.uid === selectedUser.uid 
          ? { ...user, permissions: userPermissions }
          : user
      ));
      
    } catch (error) {
      setError('Failed to update permissions');
      console.error('Error updating permissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPermission = (permission: string, action: string) => {
    return userPermissions[permission]?.includes(action) || false;
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Permissions Control
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage user permissions and access levels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Select User
            </h3>
          </div>
          
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search users by email..."
              />
            </div>
          </div>

          {/* Users List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No users found</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <li key={user.uid}>
                    <button
                      onClick={() => handleUserSelect(user.uid)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                        selectedUser?.uid === user.uid ? 'bg-primary-50 border-r-2 border-primary-600' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {user.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            {user.role}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Permissions
            </h3>
            {selectedUser && (
              <p className="mt-1 text-sm text-gray-500">
                Managing permissions for: {selectedUser.email}
              </p>
            )}
          </div>

          {!selectedUser ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No user selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a user from the list to manage their permissions.
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-6">
                {PERMISSIONS.map((permission) => (
                  <div key={permission.name} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      {permission.label}
                    </h4>
                    <div className="space-y-2">
                      {permission.actions.map((action) => (
                        <label key={action} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(permission.name, action)}
                            onChange={(e) => handlePermissionChange(permission.name, action, e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {action}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="btn-primary flex items-center"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
