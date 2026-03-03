'use client'

import { TrendingUp, ShoppingCart, Users, Package } from 'lucide-react'

interface StatsCardsProps {
  stats: {
    totalSales: number
    orders: number
    customers: number
    products: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Sales',
      value: `$${stats.totalSales.toLocaleString()}`,
      icon: TrendingUp,
      color: 'green',
      change: '+12%',
      changeText: 'from last month'
    },
    {
      title: 'Orders',
      value: stats.orders.toLocaleString(),
      icon: ShoppingCart,
      color: 'blue',
      change: '+8%',
      changeText: 'from last month'
    },
    {
      title: 'Customers',
      value: stats.customers.toLocaleString(),
      icon: Users,
      color: 'purple',
      change: '+15%',
      changeText: 'from last month'
    },
    {
      title: 'Products',
      value: stats.products.toLocaleString(),
      icon: Package,
      color: 'orange',
      change: '+5%',
      changeText: 'from last month'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getChangeColor = (color: string) => {
    const colors = {
      green: 'text-green-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title} className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-madas-primary">{card.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(card.color)}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={getChangeColor(card.color)}>{card.change}</span>
            <span className="text-gray-500 ml-1">{card.changeText}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
