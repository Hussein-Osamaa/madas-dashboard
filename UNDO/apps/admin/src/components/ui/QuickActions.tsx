import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface Action {
  title: string
  description: string
  icon: LucideIcon
  href: string
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray'
}

interface QuickActionsProps {
  actions: Action[]
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="admin-card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Common administrative tasks</p>
      </div>
      <div className="p-6 space-y-4">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start">
              <div className={`w-10 h-10 ${colorClasses[action.color]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">{action.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
