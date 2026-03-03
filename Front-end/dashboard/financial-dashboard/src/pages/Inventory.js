import React from 'react';
import { Package } from 'lucide-react';

const Inventory = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Manage your product inventory and stock levels</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Inventory Management</h3>
          <p>This page will contain inventory tracking, stock management, and supply chain analytics.</p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
