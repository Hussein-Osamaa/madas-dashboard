import React from 'react';
import { Users } from 'lucide-react';

const Customers = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Users className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage customer relationships and analytics</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Customer Management</h3>
          <p>This page will contain customer analytics, relationship management, and customer lifetime value tracking.</p>
        </div>
      </div>
    </div>
  );
};

export default Customers;
