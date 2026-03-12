import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useStaffAuth } from './contexts/StaffAuthContext';
import Shell from './pages/Shell';

const Lazy = (factory: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(factory);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0b1a] text-gray-500 dark:text-gray-400">Loading...</div>
    }>
      <Component />
    </Suspense>
  );
};

const LoginPage = () => import('./pages/LoginPage');
const OperationsPage = () => import('./pages/OperationsPage');
const DashboardPage = () => import('./pages/DashboardPage');
const InventoryPage = () => import('./pages/InventoryPage');
const AllOrdersPage = () => import('./pages/AllOrdersPage');
const PendingOrdersPage = () => import('./pages/PendingOrdersPage');
const ReadyForPickupPage = () => import('./pages/ReadyForPickupPage');
const ShippingPage = () => import('./pages/ShippingPage');
const WeeklyAuditScanPage = () => import('./pages/WeeklyAuditScanPage');
const AuditComparisonPage = () => import('./pages/AuditComparisonPage');
const InventoryReportsPage = () => import('./pages/InventoryReportsPage');
const ProductActivityLogPage = () => import('./pages/ProductActivityLogPage');
const SKUTimelinePage = () => import('./pages/SKUTimelinePage');

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStaffAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0b1a] text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const hasWarehouse = (user.allowedApps || []).includes('WAREHOUSE');
  if (!hasWarehouse) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0a0b1a]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Your account does not have access to the Warehouse portal.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Contact your admin to request access.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStaffAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0b1a] text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const hasAdmin = (user.allowedApps || []).includes('ADMIN');
  if (!hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0a0b1a]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Admin access required to view the activity log.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Contact your admin if you need access.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: Lazy(LoginPage),
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Shell />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: Lazy(OperationsPage) },
        { path: 'dashboard', element: Lazy(DashboardPage) },
        { path: 'inventory', element: Lazy(InventoryPage) },
        { path: 'fulfillment', element: Lazy(AllOrdersPage) },
        { path: 'pending-orders', element: Lazy(PendingOrdersPage) },
        { path: 'ready-for-pickup', element: Lazy(ReadyForPickupPage) },
        { path: 'shipping', element: Lazy(ShippingPage) },
        { path: 'audit', element: Lazy(WeeklyAuditScanPage) },
        { path: 'stock-audit', element: Lazy(AuditComparisonPage) },
        { path: 'reports', element: Lazy(InventoryReportsPage) },
        { path: 'sku-timeline', element: Lazy(SKUTimelinePage) },
        { path: 'activity-log', element: <AdminRoute>{Lazy(ProductActivityLogPage)}</AdminRoute> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/warehouse' }
);
