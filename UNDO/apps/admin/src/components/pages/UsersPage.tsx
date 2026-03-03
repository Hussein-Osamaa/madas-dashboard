'use client'

import { useState } from 'react'
import { Button, Input } from '@shared/shared'
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive' | 'suspended'
  subscription: 'free' | 'pro' | 'business'
  createdAt: string
  lastLogin: string
  websites: number
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'user',
    status: 'active',
    subscription: 'pro',
    createdAt: '2024-01-15',
    lastLogin: '2024-01-20',
    websites: 3
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'user',
    status: 'active',
    subscription: 'business',
    createdAt: '2024-01-10',
    lastLogin: '2024-01-19',
    websites: 8
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'user',
    status: 'inactive',
    subscription: 'free',
    createdAt: '2024-01-05',
    lastLogin: '2024-01-12',
    websites: 1
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    role: 'admin',
    status: 'active',
    subscription: 'business',
    createdAt: '2024-01-01',
    lastLogin: '2024-01-20',
    websites: 12
  }
]

export function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="admin-badge admin-badge-success">Active</span>
      case 'inactive':
        return <span className="admin-badge admin-badge-warning">Inactive</span>
      case 'suspended':
        return <span className="admin-badge admin-badge-error">Suspended</span>
      default:
        return <span className="admin-badge admin-badge-info">{status}</span>
    }
  }

  const getSubscriptionBadge = (subscription: string) => {
    switch (subscription) {
      case 'free':
        return <span className="admin-badge admin-badge-info">Free</span>
      case 'pro':
        return <span className="admin-badge admin-badge-success">Pro</span>
      case 'business':
        return <span className="admin-badge admin-badge-warning">Business</span>
      default:
        return <span className="admin-badge admin-badge-info">{subscription}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th className="admin-table-header-cell">User</th>
                <th className="admin-table-header-cell">Role</th>
                <th className="admin-table-header-cell">Status</th>
                <th className="admin-table-header-cell">Subscription</th>
                <th className="admin-table-header-cell">Websites</th>
                <th className="admin-table-header-cell">Last Login</th>
                <th className="admin-table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="admin-table-row">
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="admin-table-cell">
                    {getSubscriptionBadge(user.subscription)}
                  </td>
                  <td className="admin-table-cell">
                    <span className="text-sm text-gray-900">{user.websites}</span>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.lastLogin}</span>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {filteredUsers.length} of {users.length} users
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
