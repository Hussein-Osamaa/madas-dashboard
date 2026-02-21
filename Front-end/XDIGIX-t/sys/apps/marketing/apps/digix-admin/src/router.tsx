import React from 'react';
import { createBrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './shell/AppShell';

/** Redirect in useEffect to avoid render-loop (Navigate triggers navigation during render) */
function RedirectToHome() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate('/', { replace: true });
  }, [navigate]);
  return null;
}
import SuperAdminOverviewPage from './pages/SuperAdminOverviewPage';
import ClientsPage from './pages/ClientsPage';
import CompanyStaffPage from './pages/CompanyStaffPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RolesPage from './pages/RolesPage';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import PlanPermissionsPage from './pages/PlanPermissionsPage';
import ClientStaffPermissionsPage from './pages/ClientStaffPermissionsPage';
import FulfillmentPage from './pages/FulfillmentPage';
import StaffManagementPage from './pages/StaffManagementPage';
import PendingOrdersPage from './pages/PendingOrdersPage';
import ReadyForPickupPage from './pages/ReadyForPickupPage';
import ShippingPage from './pages/ShippingPage';
import NoAccessPage from './pages/NoAccessPage';
import SetupPasswordPage from './pages/SetupPasswordPage';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        {
          index: true,
          element: <SuperAdminOverviewPage />
        },
        {
          path: 'clients',
          element: <ClientsPage />
        },
        {
          path: 'staff',
          element: <CompanyStaffPage />
        },
        {
          path: 'subscriptions',
          element: <SubscriptionsPage />
        },
        {
          path: 'analytics',
          element: <AnalyticsPage />
        },
        {
          path: 'roles',
          element: <RolesPage />
        },
        {
          path: 'roles-permissions',
          element: <RolesPermissionsPage />
        },
        {
          path: 'plan-permissions',
          element: <PlanPermissionsPage />
        },
        {
          path: 'client-staff-permissions',
          element: <ClientStaffPermissionsPage />
        },
        {
          path: 'fulfillment',
          element: <FulfillmentPage />
        },
        {
          path: 'staff-management',
          element: <StaffManagementPage />
        },
        {
          path: 'pending-orders',
          element: <PendingOrdersPage />
        },
        {
          path: 'ready-for-pickup',
          element: <ReadyForPickupPage />
        },
        {
          path: 'shipping',
          element: <ShippingPage />
        },
        {
          path: '*',
          element: <RedirectToHome />
        }
      ],
      errorElement: <NoAccessPage />
    },
    {
      path: '/login',
      element: <RedirectToHome />
    },
    {
      path: '/setup-password',
      element: <SetupPasswordPage />
    },
    {
      path: '/no-access',
      element: <NoAccessPage />
    },
    {
      path: '*',
      element: <RedirectToHome />
    }
  ],
  {
    basename: '/admin',
    future: { v7_startTransition: true }
  }
);
