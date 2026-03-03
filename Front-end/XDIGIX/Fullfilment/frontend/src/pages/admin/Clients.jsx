import { useState, useEffect } from 'react';
import { api } from '../../api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function Clients() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/api/clients')
      .then((res) => { setList(res.data); setError(''); })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => setModal({ mode: 'add', name: '', email: '', phone: '' });
  const openEdit = (c) => setModal({ mode: 'edit', _id: c._id, name: c.name, email: c.email, phone: c.phone || '' });

  const save = async () => {
    if (!modal.name?.trim() || !modal.email?.trim()) return;
    setError('');
    try {
      if (modal.mode === 'add') {
        await api.post('/api/clients', { name: modal.name.trim(), email: modal.email.trim(), phone: modal.phone?.trim() || '' });
      } else {
        await api.patch(`/api/clients/${modal._id}`, { name: modal.name.trim(), email: modal.email.trim(), phone: modal.phone?.trim() || '' });
      }
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Clients</h1>
        <button type="button" className="primary" onClick={openAdd}>Add client</button>
      </div>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
      {list.length === 0 && !modal && (
        <EmptyState
          message="No clients yet."
          action={<button type="button" className="primary" onClick={openAdd}>Add first client</button>}
        />
      )}
      {list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td><button type="button" onClick={() => openEdit(c)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', minWidth: 320 }}>
            <h2 style={{ marginTop: 0 }}>{modal.mode === 'add' ? 'Add client' : 'Edit client'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label>Name</label>
              <input
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="Client name"
              />
              <label>Email</label>
              <input
                type="email"
                value={modal.email}
                onChange={(e) => setModal({ ...modal, email: e.target.value })}
                placeholder="email@example.com"
              />
              <label>Phone</label>
              <input
                value={modal.phone}
                onChange={(e) => setModal({ ...modal, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="primary" onClick={save}>Save</button>
              <button type="button" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
