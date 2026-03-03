'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { User, Mail, Phone, Shield, Calendar, Save } from 'lucide-react'

export default function ProfilePage() {
  const { user, userData } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: user?.email || '',
    contact: userData?.contact || '',
    role: userData?.role || '',
    status: userData?.status || ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Here you would typically update the user data in Firestore
    console.log('Saving profile data:', formData)
    setIsEditing(false)
    // Show success message
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      staff: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800'
    }
    return colors[role as keyof typeof colors] || colors.staff
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-madas-primary">Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-madas-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-madas-primary font-bold text-2xl">
                    {(userData?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {userData?.name || user?.displayName || 'User'}
                </h2>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                
                <div className="space-y-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(userData?.role || 'staff')}`}>
                    {userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1) || 'Staff'}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(userData?.status || 'pending')}`}>
                    {userData?.status?.charAt(0).toUpperCase() + userData?.status?.slice(1) || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-madas-primary hover:text-green-800 font-medium"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-madas-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Contact
                    </label>
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Phone or Instagram"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-madas-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Role is managed by administrators</p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="bg-madas-primary hover:bg-green-800 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Last Login
                  </label>
                  <p className="text-gray-900">
                    {userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            {userData?.permissions && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Permissions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(userData.permissions).map(([section, permissions]) => (
                    <div key={section} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 capitalize">{section}</h4>
                      <div className="flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <span
                            key={permission}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
