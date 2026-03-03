'use client';

import { useState, useEffect } from 'react';
import { Search, User, Building2, Calendar, Crown } from 'lucide-react';
import { AdminService, User as AdminUser } from '@/lib/adminService';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      try {
        setIsLoading(true);
        const searchResults = await AdminService.searchUsersByEmail(searchTerm);
        setFilteredUsers(searchResults);
      } catch (error) {
        setError('Failed to search users');
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setFilteredUsers(users);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'owner':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPlanBadge = (plan: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (plan) {
      case 'Enterprise':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Pro':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Starter':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
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
            Users Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
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
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Users ({filteredUsers.length})
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All registered users in the system
          </p>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'No users have been registered yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.uid}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {user.email}
                          </p>
                          {user.role === 'admin' && (
                            <Crown className="ml-2 h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <span className={getRoleBadge(user.role)}>
                            {user.role}
                          </span>
                          {user.plan && (
                            <span className={`ml-2 ${getPlanBadge(user.plan)}`}>
                              {user.plan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(user.createdAt)}
                    </div>
                  </div>
                  
                  {user.businessId && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Building2 className="h-4 w-4 mr-1" />
                      Business ID: {user.businessId}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
