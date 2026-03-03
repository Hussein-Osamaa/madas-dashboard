'use client'

import { Button } from '@shared/shared'
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  LogOut,
  Settings,
  HelpCircle
} from 'lucide-react'

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  return (
    <header className="admin-header">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-2"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
            <Bell className="w-5 h-5" />
          </button>
          
          {/* Help */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
            <HelpCircle className="w-5 h-5" />
          </button>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-gray-900">Admin User</div>
              <div className="text-xs text-gray-500">admin@madas.com</div>
            </div>
            
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            
            <Button variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
