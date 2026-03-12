import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/global.css';
import AuthProvider from './contexts/AuthContext';
import BusinessProvider from './contexts/BusinessContext';
import RBACProvider from './contexts/RBACContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { router } from './router';
import { initRbacApi } from '@shared/lib/rbacService';
import { initPermissionsApi } from '@shared/lib/permissions';
import { db, collection, query, where, getDocs, getDoc, doc } from './lib/firebase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;

// When running against the backend API, inject the adapter into the shared
// RBAC / permissions libraries so they query through the backend instead of
// hitting Firebase Firestore directly.
if (useBackend) {
  const api = { collection, query, where, getDocs, getDoc, doc } as Parameters<typeof initRbacApi>[0];
  initRbacApi(api, db);
  initPermissionsApi(api, db);
}
if (typeof window !== 'undefined' && !useBackend) {
  import('./lib/firebase').then(({ app }) => {
    import('firebase/performance').then(({ initializePerformance, getPerformance }) => {
      try {
        initializePerformance(app);
        getPerformance(app);
        console.log('[Firebase] Performance Monitoring initialized at app startup');
      } catch (error) {
        console.warn('[Firebase] Performance Monitoring initialization:', error);
      }
    }).catch(() => {});
    import('firebase/analytics').then(({ getAnalytics, isSupported, initializeAnalytics, logEvent }) => {
      isSupported().then((supported) => {
        if (supported) {
          try {
            let analyticsInstance;
            try {
              analyticsInstance = getAnalytics(app);
            } catch {
              initializeAnalytics(app);
              analyticsInstance = getAnalytics(app);
            }
            logEvent(analyticsInstance, 'app_start', { app_name: 'MADAS Dashboard', app_version: '1.0.0' });
          } catch (error) {
            console.debug('[Firebase] Analytics initialization:', error);
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  }).catch(() => {});
}

ReactDOM.createRoot /* v2 */(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DarkModeProvider>
          <AuthProvider>
            <BusinessProvider>
              <RBACProvider>
                <RouterProvider router={router} />
              </RBACProvider>
            </BusinessProvider>
          </AuthProvider>
        </DarkModeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Build: 1769916358
