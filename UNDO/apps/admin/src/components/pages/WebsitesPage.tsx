'use client'

import { useState } from 'react'
import { Button, Input } from '@shared/shared'
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Globe,
  Calendar,
  User,
  MoreHorizontal
} from 'lucide-react'

interface Website {
  id: string
  name: string
  url: string
  owner: string
  status: 'published' | 'draft' | 'archived'
  createdAt: string
  updatedAt: string
  views: number
  template: string
}

const mockWebsites: Website[] = [
  {
    id: '1',
    name: 'My Portfolio',
    url: 'https://myportfolio.madas.com',
    owner: 'John Doe',
    status: 'published',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    views: 1250,
    template: 'Portfolio'
  },
  {
    id: '2',
    name: 'Business Website',
    url: 'https://business.madas.com',
    owner: 'Jane Smith',
    status: 'published',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-19',
    views: 3420,
    template: 'Business'
  },
  {
    id: '3',
    name: 'Blog Site',
    url: 'https://blog.madas.com',
    owner: 'Bob Johnson',
    status: 'draft',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-12',
    views: 0,
    template: 'Blog'
  }
]

export function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>(mockWebsites)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.owner.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || website.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="admin-badge admin-badge-success">Published</span>
      case 'draft':
        return <span className="admin-badge admin-badge-warning">Draft</span>
      case 'archived':
        return <span className="admin-badge admin-badge-error">Archived</span>
      default:
        return <span className="admin-badge admin-badge-info">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
          <p className="text-gray-600">Manage websites and their content</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search websites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
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

      {/* Websites Table */}
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th className="admin-table-header-cell">Website</th>
                <th className="admin-table-header-cell">Owner</th>
                <th className="admin-table-header-cell">Status</th>
                <th className="admin-table-header-cell">Template</th>
                <th className="admin-table-header-cell">Views</th>
                <th className="admin-table-header-cell">Updated</th>
                <th className="admin-table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {filteredWebsites.map((website) => (
                <tr key={website.id} className="admin-table-row">
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{website.name}</div>
                        <div className="text-sm text-gray-500">{website.url}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{website.owner}</span>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    {getStatusBadge(website.status)}
                  </td>
                  <td className="admin-table-cell">
                    <span className="text-sm text-gray-900">{website.template}</span>
                  </td>
                  <td className="admin-table-cell">
                    <span className="text-sm text-gray-900">{website.views.toLocaleString()}</span>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{website.updatedAt}</span>
                    </div>
                  </td>
                  <td className="admin-table-cell">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
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
              Showing {filteredWebsites.length} of {websites.length} websites
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
