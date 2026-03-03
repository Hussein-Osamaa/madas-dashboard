import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const { login, role, clientId } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => {
    api.get('/api/clients').then((res) => setClients(res.data)).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (role === 'admin') navigate('/admin', { replace: true });
    if (role === 'client' && clientId) navigate('/client', { replace: true });
  }, [role, clientId, navigate]);

  const handleAdmin = () => {
    login('admin', {});
    navigate('/admin');
  };

  const handleClient = () => {
    const c = clients.find((x) => x._id === selectedClient);
    if (!c) return;
    login('client', { clientId: c._id, clientName: c.name });
    navigate('/client');
  };

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '2rem', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <h1 style={{ marginTop: 0 }}>Fulfilment</h1>
      <p style={{ color: 'var(--muted)' }}>Warehouse, audit & reporting</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        <button type="button" className="primary" onClick={handleAdmin} style={{ padding: '0.75rem' }}>
          Enter as Warehouse (Admin)
        </button>
        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Or sign in as client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <button type="button" className="primary" onClick={handleClient} disabled={!selectedClient} style={{ width: '100%', padding: '0.75rem' }}>
            Enter as Client
          </button>
        </div>
      </div>
    </div>
  );
}
