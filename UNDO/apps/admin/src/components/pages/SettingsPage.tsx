'use client'

import { useState } from 'react'
import { Button, Input } from '@shared/shared'
import { 
  Save,
  Globe,
  Mail,
  Shield,
  Database,
  Bell,
  Palette,
  Key,
  Server,
  Zap
} from 'lucide-react'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    siteName: 'Madas',
    siteDescription: 'Build beautiful websites with ease',
    siteUrl: 'https://madas.com',
    adminEmail: 'admin@madas.com',
    supportEmail: 'support@madas.com',
    maxFileSize: '10',
    allowedFileTypes: 'jpg,jpeg,png,gif,svg,pdf,doc,docx',
    enableRegistration: true,
    requireEmailVerification: true,
    enableAnalytics: true,
    enableNotifications: true,
    maintenanceMode: false,
    theme: 'light',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6'
  })

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'storage', name: 'Storage', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'api', name: 'API', icon: Key },
    { id: 'system', name: 'System', icon: Server }
  ]

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving settings:', settings)
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
        <Input
          value={settings.siteName}
          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
          placeholder="Enter site name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
        <textarea
          value={settings.siteDescription}
          onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Enter site description"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site URL</label>
        <Input
          value={settings.siteUrl}
          onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
          placeholder="https://example.com"
        />
      </div>
    </div>
  )

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
        <Input
          type="email"
          value={settings.adminEmail}
          onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
          placeholder="admin@example.com"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
        <Input
          type="email"
          value={settings.supportEmail}
          onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
          placeholder="support@example.com"
        />
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Enable User Registration</h4>
          <p className="text-sm text-gray-500">Allow new users to register accounts</p>
        </div>
        <input
          type="checkbox"
          checked={settings.enableRegistration}
          onChange={(e) => setSettings({ ...settings, enableRegistration: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Require Email Verification</h4>
          <p className="text-sm text-gray-500">Users must verify their email before accessing the platform</p>
        </div>
        <input
          type="checkbox"
          checked={settings.requireEmailVerification}
          onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
    </div>
  )

  const renderStorageSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
        <Input
          type="number"
          value={settings.maxFileSize}
          onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
          placeholder="10"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
        <Input
          value={settings.allowedFileTypes}
          onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
          placeholder="jpg,jpeg,png,gif,svg"
        />
        <p className="text-sm text-gray-500 mt-1">Comma-separated list of allowed file extensions</p>
      </div>
    </div>
  )

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Enable Analytics</h4>
          <p className="text-sm text-gray-500">Track user behavior and website performance</p>
        </div>
        <input
          type="checkbox"
          checked={settings.enableAnalytics}
          onChange={(e) => setSettings({ ...settings, enableAnalytics: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Enable Notifications</h4>
          <p className="text-sm text-gray-500">Send email notifications for important events</p>
        </div>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
        <select
          value={settings.theme}
          onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded"
            />
            <Input
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              placeholder="#3b82f6"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.secondaryColor}
              onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded"
            />
            <Input
              value={settings.secondaryColor}
              onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              placeholder="#8b5cf6"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Maintenance Mode</h4>
          <p className="text-sm text-gray-500">Put the site in maintenance mode</p>
        </div>
        <input
          type="checkbox"
          checked={settings.maintenanceMode}
          onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">System Information</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Version: 1.0.0</p>
              <p>Last Updated: {new Date().toLocaleDateString()}</p>
              <p>Environment: Production</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings()
      case 'email':
        return renderEmailSettings()
      case 'security':
        return renderSecuritySettings()
      case 'storage':
        return renderStorageSettings()
      case 'notifications':
        return renderNotificationsSettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'system':
        return renderSystemSettings()
      default:
        return renderGeneralSettings()
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure platform settings and preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="admin-card p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="admin-card p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
