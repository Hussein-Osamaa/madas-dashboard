import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ClientProvider } from './contexts/ClientContext';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlaceholderPage from './pages/PlaceholderPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import LowStockPage from './pages/LowStockPage';
import PaymentsPage from './pages/PaymentsPage';
import ScanLogPage from './pages/ScanLogPage';
import ReturnsPage from './pages/ReturnsPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import LastPiecesPage from './pages/LastPiecesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NoAccessPage from './pages/NoAccessPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error, retry } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-sky-500/20 text-sky-600 hover:bg-sky-500/30'}`}
            >
              Retry
            </button>
            <a
              href="/login"
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
    const clientId = typeof user.clientId === 'string' ? user.clientId : user.clientId?._id;
    if (!clientId) return <Navigate to="/no-access" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <ClientProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <DashboardLayout />
              </ProtectedLayout>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/tracking" element={<OrderTrackingPage />} />
            <Route path="orders/abandoned" element={<PlaceholderPage title="Abandoned Carts" />} />
            <Route path="orders/scan-log" element={<ScanLogPage />} />
            <Route path="orders/returns" element={<ReturnsPage />} />
            <Route path="pos" element={<PlaceholderPage title="POS" />} />
            <Route path="inventory/products" element={<ProductsPage />} />
            <Route path="inventory/products/:productId" element={<ProductDetailsPage />} />
            <Route path="inventory/collections" element={<PlaceholderPage title="Collections" />} />
            <Route path="inventory/reviews" element={<PlaceholderPage title="Reviews" />} />
            <Route path="inventory/low-stock" element={<LowStockPage />} />
            <Route path="inventory/last-pieces" element={<LastPiecesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="marketing/discounts" element={<PlaceholderPage title="Discounts" />} />
            <Route path="ecommerce" element={<PlaceholderPage title="E-commerce" />} />
            <Route path="finance" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
