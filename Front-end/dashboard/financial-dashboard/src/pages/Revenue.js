import React from 'react';
import { DollarSign } from 'lucide-react';

const Revenue = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-50 rounded-lg">
          <DollarSign className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-gray-600">Manage and analyze your revenue streams</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <DollarSign className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Revenue Management</h3>
          <p>This page will contain detailed revenue analytics, sales tracking, and revenue optimization tools.</p>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
