import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlaceholderPage from './pages/PlaceholderPage';
import PermissionGuard from './components/PermissionGuard';
import ClientsPage from './pages/ClientsPage';
import ClientUsersPage from './pages/ClientUsersPage';
import FulfillmentPage from './pages/FulfillmentPage';
import UsersPage from './pages/UsersPage';
import { PERMISSIONS } from './contexts/PermissionContext';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error, retry } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Ensure the backend API is running and VITE_API_URL points to it (e.g. http://localhost:5001)
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => retry()}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-medium"
            >
              Retry
            </button>
            <a
              href="/admin/login"
              className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 font-medium text-center"
            >
              Go to login
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'client') {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-amber-400 font-medium mb-2">Access denied</p>
          <p className="text-gray-400 text-sm">This area is for company staff only. Use your client dashboard instead.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-medium">Go to dashboard</a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <PermissionProvider>
                  <DashboardLayout />
                </PermissionProvider>
              </ProtectedLayout>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="clients" element={<PermissionGuard permission={PERMISSIONS.clientsRead}><ClientsPage /></PermissionGuard>} />
            <Route path="client-users" element={<PermissionGuard permission={PERMISSIONS.clientsRead}><ClientUsersPage /></PermissionGuard>} />
            <Route path="users" element={<PermissionGuard adminOnly><UsersPage /></PermissionGuard>} />
            <Route path="fulfillment" element={<PermissionGuard permission={PERMISSIONS.fulfillmentRead}><FulfillmentPage /></PermissionGuard>} />
            <Route path="finance" element={<PermissionGuard permission={PERMISSIONS.financeRead}><PlaceholderPage title="Finance" /></PermissionGuard>} />
            <Route path="shipping" element={<PermissionGuard permission={PERMISSIONS.shippingRead}><PlaceholderPage title="Shipping" /></PermissionGuard>} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
