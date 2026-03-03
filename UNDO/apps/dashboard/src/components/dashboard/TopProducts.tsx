'use client'

import { useState, useEffect } from 'react'

interface Product {
  name: string
  sales: number
}

export function TopProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setProducts([
        { name: 'Premium Sneakers', sales: 45 },
        { name: 'Classic T-Shirt', sales: 38 },
        { name: 'Designer Jeans', sales: 32 },
        { name: 'Sports Cap', sales: 28 },
        { name: 'Running Shoes', sales: 25 }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-madas-primary mb-4">Top Selling Products</h3>
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        ) : (
          products.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{index + 1}. {product.name}</span>
              <span className="text-sm text-gray-600">{product.sales} sales</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
