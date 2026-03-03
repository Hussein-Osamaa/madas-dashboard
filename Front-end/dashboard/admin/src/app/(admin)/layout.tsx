'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import ClientOnly from '@/components/ClientOnly';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ClientOnly fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthGuard>
        <div className="h-screen flex overflow-hidden bg-gray-100">
          <Sidebar />
          
          <div className="flex flex-col w-0 flex-1 overflow-hidden lg:ml-64">
            {/* Mobile header */}
            <div className="lg:hidden">
              <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
                <button
                  className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="flex-1 px-4 flex justify-between">
                  <div className="flex-1 flex">
                    <div className="w-full flex md:ml-0">
                      <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                          <span className="text-lg font-semibold text-gray-900">Admin Dashboard</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <main className="flex-1 relative overflow-y-auto focus:outline-none">
              <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    </ClientOnly>
  );
}
