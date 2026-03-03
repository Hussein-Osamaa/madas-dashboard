'use client'

import { 
  Users, 
  Globe, 
  CreditCard, 
  TrendingUp,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { StatsCard } from '@/components/ui/StatsCard'
import { RecentActivity } from '@/components/ui/RecentActivity'
import { QuickActions } from '@/components/ui/QuickActions'
import { SystemStatus } from '@/components/ui/SystemStatus'

export function Dashboard() {
  const stats = [
    {
      title: 'Total Users',
      value: '12,543',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Websites Created',
      value: '8,921',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: Globe,
      color: 'green'
    },
    {
      title: 'Active Subscriptions',
      value: '3,247',
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: CreditCard,
      color: 'purple'
    },
    {
      title: 'Monthly Revenue',
      value: '$45,678',
      change: '+22.1%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'yellow'
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'user_registration',
      message: 'New user registered: john.doe@example.com',
      timestamp: '2 minutes ago',
      icon: Users,
      color: 'green'
    },
    {
      id: 2,
      type: 'website_created',
      message: 'Website "My Portfolio" was created by user ID 1234',
      timestamp: '15 minutes ago',
      icon: Globe,
      color: 'blue'
    },
    {
      id: 3,
      type: 'subscription_upgrade',
      message: 'User upgraded to Pro plan',
      timestamp: '1 hour ago',
      icon: CreditCard,
      color: 'purple'
    },
    {
      id: 4,
      type: 'system_alert',
      message: 'High server load detected',
      timestamp: '2 hours ago',
      icon: AlertTriangle,
      color: 'red'
    },
    {
      id: 5,
      type: 'backup_completed',
      message: 'Daily backup completed successfully',
      timestamp: '3 hours ago',
      icon: CheckCircle,
      color: 'green'
    }
  ]

  const quickActions = [
    {
      title: 'View All Users',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/users',
      color: 'blue'
    },
    {
      title: 'Website Analytics',
      description: 'View website performance metrics',
      icon: Eye,
      href: '/analytics',
      color: 'green'
    },
    {
      title: 'Export Data',
      description: 'Download user and website data',
      icon: Download,
      href: '/reports',
      color: 'purple'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      href: '/settings',
      color: 'gray'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the Madas admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity activities={recentActivity} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions actions={quickActions} />
        </div>
      </div>

      {/* System Status */}
      <div>
        <SystemStatus />
      </div>
    </div>
  )
}
