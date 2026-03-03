'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  UserCheck, 
  Globe, 
  ShoppingBag,
  Wallet,
  BarChart3,
  FileText,
  Lightbulb,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { userData } = useAuth()
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)

  const hasPermission = (section: string, permission: string) => {
    return userData?.permissions?.[section]?.includes(permission) || userData?.role === 'admin'
  }

  const sidebarItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      permission: 'home'
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: Receipt,
      permission: 'orders'
    },
    {
      name: 'Inventory',
      icon: Package,
      permission: 'inventory',
      children: [
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Collections', href: '/collections', icon: Package },
        { name: 'Reviews', href: '/product-reviews', icon: Package },
        { name: 'Low Stock', href: '/low-stock', icon: Package }
      ]
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      permission: 'customers'
    },
    {
      name: 'Staff',
      href: '/admin',
      icon: UserCheck,
      permission: 'employees'
    },
    {
      name: 'Web Builder',
      href: '/webbuilder',
      icon: Globe,
      permission: 'webbuilder'
    },
    {
      name: 'Shoes Store',
      href: '/shoes-store',
      icon: ShoppingBag,
      permission: 'shoes'
    },
    {
      name: 'Finance',
      icon: Wallet,
      permission: 'finance',
      children: [
        { name: 'Overview', href: '/finance', icon: Wallet },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Insights', href: '/insights', icon: Lightbulb }
      ]
    }
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static left-0 top-16 h-full w-64 bg-white shadow-lg lg:shadow-none z-30 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              if (!hasPermission(item.permission, 'view')) return null

              if (item.children) {
                return (
                  <div key={item.name} className="inventory-dropdown">
                    <button
                      onClick={() => {
                        if (item.name === 'Inventory') setInventoryOpen(!inventoryOpen)
                        if (item.name === 'Finance') setFinanceOpen(!financeOpen)
                      }}
                      className="sidebar-link flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-madas-light hover:text-madas-primary transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      {item.name === 'Inventory' ? (
                        <ChevronDown className={`w-4 h-4 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 transition-transform ${financeOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    
                    <div className={`
                      ml-6 mt-2 space-y-1 transition-all duration-300
                      ${(item.name === 'Inventory' ? inventoryOpen : financeOpen) ? 'block' : 'hidden'}
                    `}>
                      {item.children.map((child) => (
                        <a
                          key={child.name}
                          href={child.href}
                          className="sidebar-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-madas-light hover:text-madas-primary transition-all"
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-madas-light hover:text-madas-primary transition-all"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </a>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="bg-madas-light rounded-xl p-4">
              <h3 className="text-sm font-medium text-madas-primary mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left text-xs text-gray-600 hover:text-madas-primary flex items-center space-x-2">
                  <Plus className="w-3 h-3" />
                  <span>New Order</span>
                </button>
                <button className="w-full text-left text-xs text-gray-600 hover:text-madas-primary flex items-center space-x-2">
                  <Plus className="w-3 h-3" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
