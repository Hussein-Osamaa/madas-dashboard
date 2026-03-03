import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-50 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your dashboard and business settings</p>
        </div>
      </div>
      
      <div className="card p-8 text-center">
        <div className="text-gray-500">
          <SettingsIcon className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">System Settings</h3>
          <p>This page will contain user management, business configuration, and system preferences.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
