'use client'

import { Check, UserPlus, Package, AlertTriangle } from 'lucide-react'

export function RecentActivity() {
  const activities = [
    {
      icon: Check,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'New order received',
      time: '2 minutes ago'
    },
    {
      icon: UserPlus,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      title: 'New customer registered',
      time: '15 minutes ago'
    },
    {
      icon: Package,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      title: 'Low stock alert',
      time: '1 hour ago'
    },
    {
      icon: Check,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Payment processed',
      time: '2 hours ago'
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      title: 'Inventory update needed',
      time: '3 hours ago'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-madas-primary mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.bgColor}`}>
              <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
