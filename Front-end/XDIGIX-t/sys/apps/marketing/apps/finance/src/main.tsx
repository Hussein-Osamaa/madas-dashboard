import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { router } from './router';
import TenantProvider from './context/TenantProvider';
import PermissionsProvider from './context/PermissionsProvider';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <PermissionsProvider>
          <RouterProvider router={router} />
        </PermissionsProvider>
      </TenantProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

