import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import WeeklyAuditScan from './pages/WeeklyAuditScan';
import Clients from './pages/admin/Clients';
import Products from './pages/admin/Products';
import Transactions from './pages/admin/Transactions';
import Orders from './pages/admin/Orders';
import ClientDashboard from './pages/ClientDashboard';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Notifications from './pages/Notifications';
import Login from './pages/Login';

function AdminRoute({ children }) {
  const { role } = useAuth();
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function ClientRoute({ children }) {
  const { role, clientId } = useAuth();
  if (role !== 'client' || !clientId) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout role="admin">
              <AdminDashboard />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <AdminRoute>
            <Layout role="admin">
              <Clients />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <Layout role="admin">
              <Products />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <AdminRoute>
            <Layout role="admin">
              <Transactions />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <Layout role="admin">
              <Orders />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <AdminRoute>
            <Layout role="admin">
              <WeeklyAuditScan />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/client"
        element={
          <ClientRoute>
            <Layout role="client">
              <ClientDashboard />
            </Layout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/reports"
        element={
          <ClientRoute>
            <Layout role="client">
              <Reports />
            </Layout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/reports/:id"
        element={
          <ClientRoute>
            <Layout role="client">
              <ReportDetail />
            </Layout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/notifications"
        element={
          <ClientRoute>
            <Layout role="client">
              <Notifications />
            </Layout>
          </ClientRoute>
        }
      />
    </Routes>
  );
}
