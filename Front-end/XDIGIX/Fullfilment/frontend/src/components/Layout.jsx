import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ role, children }) {
  const navigate = useNavigate();
  const { logout, clientName } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to={role === 'admin' ? '/admin' : '/client'} style={{ fontWeight: 600, color: 'var(--text)' }}>Fulfilment</Link>
          {role === 'admin' && (
            <>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/clients">Clients</Link>
              <Link to="/admin/products">Products</Link>
              <Link to="/admin/transactions">Transactions</Link>
              <Link to="/admin/orders">Orders</Link>
              <Link to="/admin/audit">Weekly Audit</Link>
            </>
          )}
          {role === 'client' && (
            <>
              <Link to="/client">Virtual Warehouse</Link>
              <Link to="/client/reports">Reports</Link>
              <Link to="/client/notifications">Notifications</Link>
            </>
          )}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {role === 'client' && clientName && <span style={{ color: 'var(--muted)' }}>{clientName}</span>}
          <button type="button" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        {children}
      </main>
    </div>
  );
}
