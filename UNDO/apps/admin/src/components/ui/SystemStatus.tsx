import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

interface SystemComponent {
  name: string
  status: 'operational' | 'degraded' | 'outage' | 'maintenance'
  uptime: string
  responseTime: string
}

const systemComponents: SystemComponent[] = [
  {
    name: 'API Server',
    status: 'operational',
    uptime: '99.9%',
    responseTime: '45ms'
  },
  {
    name: 'Database',
    status: 'operational',
    uptime: '99.8%',
    responseTime: '12ms'
  },
  {
    name: 'CDN',
    status: 'operational',
    uptime: '99.9%',
    responseTime: '23ms'
  },
  {
    name: 'Email Service',
    status: 'degraded',
    uptime: '98.5%',
    responseTime: '156ms'
  },
  {
    name: 'File Storage',
    status: 'operational',
    uptime: '99.7%',
    responseTime: '67ms'
  }
]

const statusConfig = {
  operational: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Operational'
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Degraded'
  },
  outage: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Outage'
  },
  maintenance: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Maintenance'
  }
}

export function SystemStatus() {
  return (
    <div className="admin-card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        <p className="text-sm text-gray-500">Current status of all system components</p>
      </div>
      <div className="divide-y divide-gray-200">
        {systemComponents.map((component) => {
          const config = statusConfig[component.status]
          const Icon = config.icon
          
          return (
            <div key={component.name} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">{component.name}</h4>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">{component.uptime} uptime</div>
                  <div className="text-xs text-gray-500">{component.responseTime} avg response</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleString()}
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Status Page →
          </button>
        </div>
      </div>
    </div>
  )
}
