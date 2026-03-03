import { LucideIcon } from 'lucide-react'

interface Activity {
  id: number
  type: string
  message: string
  timestamp: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray'
}

interface RecentActivityProps {
  activities: Activity[]
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="admin-card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-500">Latest platform activity and events</p>
      </div>
      <div className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <div key={activity.id} className="px-6 py-4">
            <div className="flex items-start">
              <div className={`w-8 h-8 ${colorClasses[activity.color]} rounded-full flex items-center justify-center flex-shrink-0`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  )
}
