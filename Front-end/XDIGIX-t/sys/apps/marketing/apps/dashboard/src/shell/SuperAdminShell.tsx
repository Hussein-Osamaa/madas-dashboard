/**
 * Super Admin Shell
 * Separate layout for super admin dashboard - company's control panel
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRBAC } from '../contexts/RBACContext';
import FullScreenLoader from '../components/common/FullScreenLoader';
import SuperAdminHeader from '../components/layout/SuperAdminHeader';
import SuperAdminSidebar from '../components/layout/SuperAdminSidebar';

const SuperAdminShell = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { user: rbacUser, loading: rbacLoading, hasPermission } = useRBAC();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (rbacUser && rbacUser.type === 'super_admin') {
        const canView = await hasPermission('super_admin.view_analytics');
        setIsAuthorized(canView);
      } else {
        setIsAuthorized(false);
      }
    };

    if (!rbacLoading && rbacUser) {
      checkAuthorization();
    }
  }, [rbacUser, rbacLoading, hasPermission]);

  if (authLoading || rbacLoading || isAuthorized === null) {
    return <FullScreenLoader />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!rbacUser || rbacUser.type !== 'super_admin' || !isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SuperAdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex h-screen pt-16">
        <SuperAdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminShell;

