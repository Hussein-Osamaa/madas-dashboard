import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

import Shell        from './components/Shell';
import DashboardPage   from './pages/DashboardPage';
import CreateOrderPage from './pages/CreateOrderPage';
import OrdersPage      from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PricingCalculatorPage from './pages/PricingCalculatorPage';
import AnalyticsPage   from './pages/AnalyticsPage';
import WalletPage      from './pages/WalletPage';
import LoginPage       from './pages/LoginPage';

const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      path: '/',
      element: <Shell />,
      children: [
        { index: true,             element: <DashboardPage /> },
        { path: 'create',          element: <CreateOrderPage /> },
        { path: 'orders',          element: <OrdersPage /> },
        { path: 'orders/:id',      element: <OrderDetailPage /> },
        { path: 'wallet',          element: <WalletPage /> },
        { path: 'calculator',      element: <PricingCalculatorPage /> },
        { path: 'analytics',       element: <AnalyticsPage /> },
      ],
    },
  ],
  { basename: '/ship' }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
