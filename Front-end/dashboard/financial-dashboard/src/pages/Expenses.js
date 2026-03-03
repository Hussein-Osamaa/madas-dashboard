import React from 'react';
import { TrendingUp } from 'lucide-react';

const Expenses = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <TrendingUp className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track and manage your business expenses</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Expense Management</h3>
          <p>This page will contain expense tracking, categorization, and budget management tools.</p>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
