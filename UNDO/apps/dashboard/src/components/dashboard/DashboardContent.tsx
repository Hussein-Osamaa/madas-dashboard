'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { StatsCards } from './StatsCards'
import { TodoList } from './TodoList'
import { RecentActivity } from './RecentActivity'
import { TopProducts } from './TopProducts'
import { SalesByCategory } from './SalesByCategory'

export function DashboardContent() {
  const { user, userData } = useAuth()
  const [stats, setStats] = useState({
    totalSales: 0,
    orders: 0,
    customers: 0,
    products: 0
  })

  const username = userData?.name || 
    (userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
    user?.displayName || 
    user?.email?.split('@')[0] || 
    'User'

  useEffect(() => {
    // Fetch dashboard stats
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // This would typically fetch from your API or Firestore
      // For now, using mock data
      setStats({
        totalSales: 125000,
        orders: 342,
        customers: 1289,
        products: 156
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-madas-primary mb-2">
          Welcome back, {username}!
        </h2>
        <p className="text-gray-600">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* To-Do List */}
        <div className="lg:col-span-2">
          <TodoList />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>

      {/* Data Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopProducts />
        <SalesByCategory />
      </div>
    </div>
  )
}
