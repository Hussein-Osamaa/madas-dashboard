import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../contexts/BusinessContext';
import { useRBAC } from '../contexts/RBACContext';
import FullScreenLoader from '../components/common/FullScreenLoader';
import SupportModeBanner from '../components/support/SupportModeBanner';
import { getRoutePermissions, routeRequiresPermission } from '../utils/routePermissions';
import { trackPageLoad } from '../lib/performance';
import { trackPageView } from '../lib/analytics';

const AppShell = () => {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { loading: businessLoading, noAccess, hasPermission: businessHasPermission, hasAnyPermission: businessHasAnyPermission, role } = useBusiness();
  const { user: rbacUser, loading: rbacLoading, hasPermission: rbacHasPermission, hasAnyPermission: rbacHasAnyPermission } = useRBAC();
  const [shouldRedirectToSuperAdmin, setShouldRedirectToSuperAdmin] = useState(false);
  const [hasRouteAccess, setHasRouteAccess] = useState(true);
  const [checkingRouteAccess, setCheckingRouteAccess] = useState(true);

  // Track page load performance and analytics when route changes
  useEffect(() => {
    const pageName = location.pathname.replace(/^\//, '') || 'home';
    trackPageLoad(pageName);
    trackPageView(pageName, document.title, window.location.href);
  }, [location.pathname]);

  // Check route permissions
  useEffect(() => {
    const checkRouteAccess = async () => {
      // Don't check permissions for login, no-access, or super-admin routes
      if (
        location.pathname.startsWith('/super-admin') ||
        location.pathname === '/login' ||
        location.pathname === '/no-access' ||
        location.pathname.startsWith('/site/') ||
        location.pathname.startsWith('/s/') ||
        location.pathname.startsWith('/ecommerce/preview/')
      ) {
        setHasRouteAccess(true);
        setCheckingRouteAccess(false);
        return;
      }

      // Owners always have access
      if (role === 'owner') {
        setHasRouteAccess(true);
        setCheckingRouteAccess(false);
        return;
      }

      // Check if route requires permissions
      if (!routeRequiresPermission(location.pathname)) {
        setHasRouteAccess(true);
        setCheckingRouteAccess(false);
        return;
      }

      // Get required permissions for this route
      const requiredPermissions = getRoutePermissions(location.pathname);
      
      if (requiredPermissions.length === 0) {
        setHasRouteAccess(true);
        setCheckingRouteAccess(false);
        return;
      }

      // Check permissions - try BusinessContext first (staff permissions), then RBAC
      let hasAccess = false;
      try {
        // Check business context permissions first
        hasAccess = businessHasAnyPermission(requiredPermissions);
        
        // If not granted by business context and RBAC user exists, check RBAC
        if (!hasAccess && rbacUser) {
          hasAccess = await rbacHasAnyPermission(requiredPermissions);
        }
      } catch (error) {
        console.error('[AppShell] Error checking route permissions:', error);
        hasAccess = false;
      }

      setHasRouteAccess(hasAccess);
      setCheckingRouteAccess(false);
    };

    // Proceed when auth, business, and RBAC are done loading (rbacUser may be null for regular users)
    if (!authLoading && !businessLoading && !rbacLoading && user) {
      setCheckingRouteAccess(true);
      checkRouteAccess();
    }
  }, [
    location.pathname,
    authLoading,
    businessLoading,
    rbacLoading,
    user,
    rbacUser,
    role,
    businessHasAnyPermission,
    rbacHasAnyPermission
  ]);

  // Check if user should be redirected to super admin dashboard
  useEffect(() => {
    const checkSuperAdminRedirect = async () => {
      // Don't redirect if already on super admin routes, login, or no-access
      if (
        location.pathname.startsWith('/super-admin') ||
        location.pathname === '/login' ||
        location.pathname === '/no-access'
      ) {
        return;
      }

      // Don't redirect if in support mode (check sessionStorage or URL params)
      const supportMode = sessionStorage.getItem('supportMode') === 'true';
      const urlParams = new URLSearchParams(window.location.search);
      const urlSupport = urlParams.get('support') === 'true';
      
      if (supportMode || urlSupport) {
        // In support mode, don't redirect
        setShouldRedirectToSuperAdmin(false);
        return;
      }

      // Only check for super admin redirect if RBAC user exists and is super_admin
      if (rbacUser && rbacUser.type === 'super_admin' && !rbacLoading) {
        const canView = await rbacHasPermission('super_admin.view_analytics');
        if (canView) {
          // Redirect super admins to their dashboard by default
          // But allow them to access tenant dashboard if needed
          setShouldRedirectToSuperAdmin(true);
        }
      }
    };

    // Only run super admin check if RBAC user exists
    if (!authLoading && !rbacLoading && user && rbacUser) {
      checkSuperAdminRedirect();
    }
  }, [rbacUser, rbacLoading, rbacHasPermission, location.pathname, user, authLoading]);

  if (authLoading || businessLoading || rbacLoading || checkingRouteAccess) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect super admins to their dashboard if they're on root tenant dashboard
  // But allow access to other tenant routes if needed
  if (
    shouldRedirectToSuperAdmin &&
    (location.pathname === '/' || location.pathname.startsWith('/?'))
  ) {
    return <Navigate to="/super-admin" replace />;
  }

  // Check route-level permissions
  if (!hasRouteAccess && !shouldRedirectToSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  if (noAccess && !shouldRedirectToSuperAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  return (
    <div className="min-h-screen bg-base text-madas-text">
      <SupportModeBanner />
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex h-screen pt-16">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-base">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
