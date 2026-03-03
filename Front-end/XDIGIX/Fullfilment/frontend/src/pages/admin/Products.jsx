import { useState, useEffect } from 'react';
import { api } from '../../api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function Products() {
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    const params = filterClient ? `?clientId=${filterClient}` : '';
    Promise.all([
      api.get('/api/clients'),
      api.get(`/api/products${params}`),
    ])
      .then(([cRes, pRes]) => {
        setClients(cRes.data);
        setList(pRes.data);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterClient]);

  const openAdd = () => setModal({
    mode: 'add',
    clientId: filterClient || (clients[0]?._id) || '',
    name: '',
    sku: '',
    barcode: '',
  });
  const openEdit = (p) => setModal({
    mode: 'edit',
    _id: p._id,
    clientId: p.clientId?._id || p.clientId,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
  });

  const save = async () => {
    if (!modal.name?.trim() || !modal.sku?.trim() || !modal.barcode?.trim() || !modal.clientId) return;
    setError('');
    try {
      if (modal.mode === 'add') {
        await api.post('/api/products', {
          clientId: modal.clientId,
          name: modal.name.trim(),
          sku: modal.sku.trim(),
          barcode: modal.barcode.trim(),
        });
      } else {
        await api.patch(`/api/products/${modal._id}`, {
          name: modal.name.trim(),
          sku: modal.sku.trim(),
          barcode: modal.barcode.trim(),
        });
      }
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const clientName = (id) => clients.find((c) => c._id === id)?.name || id;

  if (loading && list.length === 0) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <button type="button" className="primary" onClick={openAdd}>Add product</button>
        </div>
      </div>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
      {list.length === 0 && !modal && (
        <EmptyState
          message="No products yet. Add a product or select another client."
          action={<button type="button" className="primary" onClick={openAdd}>Add product</button>}
        />
      )}
      {list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Client</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.barcode}</td>
                  <td>{p.clientId?.name ?? clientName(p.clientId)}</td>
                  <td><button type="button" onClick={() => openEdit(p)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', minWidth: 320 }}>
            <h2 style={{ marginTop: 0 }}>{modal.mode === 'add' ? 'Add product' : 'Edit product'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modal.mode === 'add' && (
                <>
                  <label>Client</label>
                  <select
                    value={modal.clientId}
                    onChange={(e) => setModal({ ...modal, clientId: e.target.value })}
                  >
                    {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </>
              )}
              <label>Name</label>
              <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Product name" />
              <label>SKU</label>
              <input value={modal.sku} onChange={(e) => setModal({ ...modal, sku: e.target.value })} placeholder="SKU" />
              <label>Barcode</label>
              <input value={modal.barcode} onChange={(e) => setModal({ ...modal, barcode: e.target.value })} placeholder="Barcode" />
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
