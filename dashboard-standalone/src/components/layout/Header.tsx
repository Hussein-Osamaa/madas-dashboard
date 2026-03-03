'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Menu, Bell, LogOut, User } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, userData, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const username = userData?.name || 
    (userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
    user?.displayName || 
    user?.email?.split('@')[0] || 
    'User'

  const userInitial = username.charAt(0).toUpperCase()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden text-madas-primary p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-madas-primary rounded-lg flex items-center justify-center">
              <img 
                src="/assets/img/madas.svg" 
                alt="Madas Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-madas-primary">MADAS Admin</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
            <Bell className="w-5 h-5 text-madas-primary" />
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">3</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Dark mode toggle */}
            <button 
              onClick={toggleTheme}
              className="dark-toggle"
              title="Toggle dark mode"
            >
              {isDark ? (
                <svg className="w-5 h-5 fill-madas-primary" viewBox="0 0 24 24">
                  <path d="M21.64 13.64A9 9 0 1 1 10.36 2.36a7 7 0 1 0 11.28 11.28z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-madas-primary" viewBox="0 0 24 24">
                  <path d="M12 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm5.657 3.343a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414zM21 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1zm-2.929 7.071a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM12 20a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1zm-7.071-2.929a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM4 13a1 1 0 1 1 0-2H3a1 1 0 1 1 0 2h1zm2.343-7.657a1 1 0 0 1 0 1.414l-.707.707A1 1 0 1 1 4.222 6.05l.707-.707a1 1 0 0 1 1.414 0zM12 6a6 6 0 1 1 0 12A6 6 0 0 1 12 6z" />
                </svg>
              )}
            </button>
            
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">{username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            
            <button 
              onClick={() => window.location.href = '/profile'}
              className="w-8 h-8 bg-madas-accent rounded-full flex items-center justify-center hover:bg-yellow-400 transition-colors cursor-pointer"
            >
              <span className="text-madas-primary font-bold text-sm">{userInitial}</span>
            </button>
            
            <button 
              onClick={logout}
              className="text-gray-500 hover:text-madas-primary p-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
