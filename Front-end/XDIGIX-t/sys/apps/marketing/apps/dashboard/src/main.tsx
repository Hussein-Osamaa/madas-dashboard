import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/global.css';
import AuthProvider from './contexts/AuthContext';
import BusinessProvider from './contexts/BusinessContext';
import RBACProvider from './contexts/RBACContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { router } from './router';

const queryClient = new QueryClient();

// Initialize Firebase Performance and Analytics only when using Firebase (not backend API)
const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;
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
  </React.StrictMode>
);

// Build: 1769916358
