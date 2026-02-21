import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StaffAuthProvider, useStaffAuth } from './contexts/StaffAuthContext';
import Shell from './pages/Shell';
import LoginPage from './pages/LoginPage';
import OperationsPage from './pages/OperationsPage';
import InventoryPage from './pages/InventoryPage';
import AllOrdersPage from './pages/AllOrdersPage';
import PendingOrdersPage from './pages/PendingOrdersPage';
import ReadyForPickupPage from './pages/ReadyForPickupPage';
import ShippingPage from './pages/ShippingPage';
import WeeklyAuditScanPage from './pages/WeeklyAuditScanPage';
import InventoryReportsPage from './pages/InventoryReportsPage';

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

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Shell />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <OperationsPage /> },
        { path: 'inventory', element: <InventoryPage /> },
        { path: 'fulfillment', element: <AllOrdersPage /> },
        { path: 'pending-orders', element: <PendingOrdersPage /> },
        { path: 'ready-for-pickup', element: <ReadyForPickupPage /> },
        { path: 'shipping', element: <ShippingPage /> },
        { path: 'audit', element: <WeeklyAuditScanPage /> },
        { path: 'reports', element: <InventoryReportsPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/warehouse' }
);
