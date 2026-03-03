'use client'

import { useState, useEffect } from 'react'

interface Category {
  category: string
  sales: number
}

export function SalesByCategory() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setCategories([
        { category: 'Clothing', sales: 125 },
        { category: 'Shoes', sales: 98 },
        { category: 'Accessories', sales: 67 },
        { category: 'Electronics', sales: 45 },
        { category: 'Home & Garden', sales: 32 }
      ])
      setLoading(false)
    }, 1200)
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-madas-primary mb-4">Sales by Category</h3>
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        ) : (
          categories.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{category.category}</span>
              <span className="text-sm text-gray-600">{category.sales} sales</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
