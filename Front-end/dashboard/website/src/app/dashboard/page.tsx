'use client';

import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    // Redirect to the simple HTML redirect page
    window.location.replace('/dashboard-redirect.html');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}