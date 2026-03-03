import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray'
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color 
}: StatsCardProps) {
  return (
    <div className="admin-stats-card">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="admin-stats-label">{title}</p>
          <p className="admin-stats-value">{value}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className={`admin-stats-change ${
          changeType === 'positive' ? 'admin-stats-change-positive' : 
          changeType === 'negative' ? 'admin-stats-change-negative' : 
          'text-gray-500'
        }`}>
          {change} from last month
        </div>
      </div>
    </div>
  )
}
