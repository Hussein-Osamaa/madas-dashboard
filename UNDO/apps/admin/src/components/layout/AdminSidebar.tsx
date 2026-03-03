'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  CreditCard, 
  Settings, 
  BarChart3,
  FileText,
  Shield,
  X,
  Zap
} from 'lucide-react'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    name: 'Websites',
    href: '/websites',
    icon: Globe,
  },
  {
    name: 'Subscriptions',
    href: '/subscriptions',
    icon: CreditCard,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Security',
    href: '/security',
    icon: Shield,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 admin-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Madas Admin</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    admin-sidebar-item
                    ${isActive ? 'admin-sidebar-item-active' : 'admin-sidebar-item-inactive'}
                  `}
                  onClick={() => {
                    // Close mobile sidebar when navigating
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Admin Panel v1.0.0</div>
            <div>Last updated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </>
  )
}
