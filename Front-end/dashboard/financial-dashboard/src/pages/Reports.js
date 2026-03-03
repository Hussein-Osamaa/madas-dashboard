import React from 'react';
import { FileText } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <FileText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and view detailed financial reports</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Financial Reports</h3>
          <p>This page will contain comprehensive financial reports, custom report builder, and scheduled report generation.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
