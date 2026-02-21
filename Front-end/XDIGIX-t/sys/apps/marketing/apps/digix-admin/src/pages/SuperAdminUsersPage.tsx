/**
 * Super Admin Users Management Page
 * Manage super admin staff (Root, Finance, Ops, Support roles)
 */

import { useState, useEffect } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { collection, db, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where } from '../lib/firebase';
import type { User, Role } from '@shared/types/rbac';

export default function SuperAdminUsersPage() {
  const { user: currentUser, canManageUser, getRoles } = useRBAC();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
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
      
      // Get super admin users only
      const q = query(collection(db, 'users'), where('type', '==', 'super_admin'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);

      // Get super admin roles (tenant_id is null)
      const rolesData = await getRoles();
      const superAdminRoles = rolesData.filter(role => role.tenant_id === null);
      setRoles(superAdminRoles);
    } catch (error) {
      console.error('[SuperAdminUsersPage] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role_id) return;

    // TODO: Create Firebase Auth user and link to RBAC user
    // For now, just create the RBAC user record
    try {
      await addDoc(collection(db, 'users'), {
        name: newUser.name,
        email: newUser.email,
        tenant_id: null, // Super admin users have no tenant
        role_id: newUser.role_id,
        type: 'super_admin',
        status: newUser.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', role_id: '', status: 'active' });
      loadData();
    } catch (error) {
      console.error('[SuperAdminUsersPage] Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('[SuperAdminUsersPage] Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      loadData();
    } catch (error) {
      console.error('[SuperAdminUsersPage] Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name || 'Unknown';
  };


  return (
    <PermissionGuard
      permission="super_admin.manage_staff"
      showError
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Super Admin Users</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage super admin staff (Root, Finance, Ops, Support)
            </p>
          </div>
          <PermissionGuard permission="super_admin.manage_staff">
            <button
              onClick={() => {
                setSelectedUser(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Add User
            </button>
          </PermissionGuard>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const canManage = canManageUser(user);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {getRoleName(user.role_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.status}
                          onChange={(e) =>
                            handleUpdateUser(user.id, {
                              status: e.target.value as User['status']
                            })
                          }
                          className={`text-xs rounded-full px-2 py-1 border-0 ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : user.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowCreateModal(true);
                              }}
                              className="text-primary hover:text-primary-dark mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">
                {selectedUser ? 'Edit User' : 'Create New User'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedUser?.name || newUser.name}
                    onChange={(e) =>
                      selectedUser
                        ? setSelectedUser({ ...selectedUser, name: e.target.value })
                        : setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={selectedUser?.email || newUser.email}
                    onChange={(e) =>
                      selectedUser
                        ? setSelectedUser({ ...selectedUser, email: e.target.value })
                        : setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="john@example.com"
                    disabled={!!selectedUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={selectedUser?.role_id || newUser.role_id}
                    onChange={(e) =>
                      selectedUser
                        ? setSelectedUser({ ...selectedUser, role_id: e.target.value })
                        : setNewUser({ ...newUser, role_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={selectedUser?.status || newUser.status}
                    onChange={(e) =>
                      selectedUser
                        ? setSelectedUser({
                            ...selectedUser,
                            status: e.target.value as User['status']
                          })
                        : setNewUser({
                            ...newUser,
                            status: e.target.value as User['status']
                          })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {selectedUser ? (
                    <button
                      onClick={() => {
                        handleUpdateUser(selectedUser.id, {
                          name: selectedUser.name,
                          role_id: selectedUser.role_id,
                          status: selectedUser.status
                        });
                        setShowCreateModal(false);
                        setSelectedUser(null);
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Update
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateUser}
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

