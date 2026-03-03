import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function Notifications() {
  const { clientId } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    api
      .get(`/api/notifications?clientId=${clientId}`)
      .then((res) => setList(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  const markRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <Loading message="Loading notifications…" />;

  return (
    <div>
      <h1>Notifications</h1>
      <p style={{ color: 'var(--muted)' }}>Reports and alerts.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {list.map((n) => (
          <div
            key={n._id}
            style={{
              background: n.read ? 'var(--surface)' : 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '1rem',
              opacity: n.read ? 0.85 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{n.title}</strong>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{n.type}</span>
              </div>
              {!n.read && (
                <button type="button" onClick={() => markRead(n._id)}>Mark read</button>
              )}
            </div>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text)' }}>{n.message}</p>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <EmptyState message="No notifications yet." />}
    </div>
  );
}
