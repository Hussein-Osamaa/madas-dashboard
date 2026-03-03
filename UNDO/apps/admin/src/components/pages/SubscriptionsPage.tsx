'use client'

import { useState } from 'react'
import { Button, Input } from '@shared/shared'
import { 
  Search, 
  Filter, 
  Download, 
  CreditCard,
  Calendar,
  DollarSign,
  User,
  MoreHorizontal,
  Eye
} from 'lucide-react'

interface Subscription {
  id: string
  user: string
  email: string
  plan: 'free' | 'pro' | 'business'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  amount: number
  interval: 'month' | 'year'
  nextBilling: string
  createdAt: string
  websites: number
}

const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    user: 'John Doe',
    email: 'john.doe@example.com',
    plan: 'pro',
    status: 'active',
    amount: 29,
    interval: 'month',
    nextBilling: '2024-02-20',
    createdAt: '2024-01-20',
    websites: 3
  },
  {
    id: '2',
    user: 'Jane Smith',
    email: 'jane.smith@example.com',
    plan: 'business',
    status: 'active',
    amount: 99,
    interval: 'month',
    nextBilling: '2024-02-19',
    createdAt: '2024-01-19',
    websites: 8
  },
  {
    id: '3',
    user: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    plan: 'free',
    status: 'active',
    amount: 0,
    interval: 'month',
    nextBilling: 'N/A',
    createdAt: '2024-01-15',
    websites: 1
  }
]

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = selectedPlan === 'all' || subscription.plan === selectedPlan
    const matchesStatus = selectedStatus === 'all' || subscription.status === selectedStatus
    
    return matchesSearch && matchesPlan && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="admin-badge admin-badge-success">Active</span>
      case 'canceled':
        return <span className="admin-badge admin-badge-error">Canceled</span>
      case 'past_due':
        return <span className="admin-badge admin-badge-warning">Past Due</span>
      case 'unpaid':
        return <span className="admin-badge admin-badge-error">Unpaid</span>
      default:
        return <span className="admin-badge admin-badge-info">{status}</span>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'free':
        return <span className="admin-badge admin-badge-info">Free</span>
      case 'pro':
        return <span className="admin-badge admin-badge-success">Pro</span>
      case 'business':
        return <span className="admin-badge admin-badge-warning">Business</span>
      default:
        return <span className="admin-badge admin-badge-info">{plan}</span>
    }
  }

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600">Manage subscriptions and billing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="admin-stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="admin-stats-label">Monthly Revenue</p>
              <p className="admin-stats-value">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="admin-stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="admin-stats-label">Active Subscriptions</p>
              <p className="admin-stats-value">{subscriptions.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="admin-stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="admin-stats-label">Pro Users</p>
              <p className="admin-stats-value">{subscriptions.filter(s => s.plan === 'pro' && s.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="admin-stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="admin-stats-label">Business Users</p>
              <p className="admin-stats-value">{subscriptions.filter(s => s.plan === 'business' && s.status === 'active').length}</p>
            </div>
          </div>
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
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
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
              <option value="canceled">Canceled</option>
              <option value="past_due">Past Due</option>
              <option value="unpaid">Unpaid</option>
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

      {/* Subscriptions Table */}
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th className="admin-table-header-cell">User</th>
                <th className="admin-table-header-cell">Plan</th>
                <th className="admin-table-header-cell">Status</th>
                <th className="admin-table-header-cell">Amount</th>
                <th className="admin-table-header-cell">Websites</th>
                <th className="admin-table-header-cell">Next Billing</th>
                <th className="admin-table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="admin-table-row">
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {subscription.user.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{subscription.user}</div>
                        <div className="text-sm text-gray-500">{subscription.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    {getPlanBadge(subscription.plan)}
                  </td>
                  <td className="admin-table-cell">
                    {getStatusBadge(subscription.status)}
                  </td>
                  <td className="admin-table-cell">
                    <div className="text-sm text-gray-900">
                      ${subscription.amount}/{subscription.interval}
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <span className="text-sm text-gray-900">{subscription.websites}</span>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{subscription.nextBilling}</span>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
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
              Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
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
