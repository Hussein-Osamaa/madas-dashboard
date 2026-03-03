import { useState, useEffect } from 'react';
import { api } from '../../api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const TYPES = ['INBOUND', 'SOLD', 'DAMAGED', 'MISSING', 'ADJUSTMENT', 'AUDIT', 'RESERVED', 'SHIPPING', 'RETURNED'];

export default function Transactions() {
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterClient) params.set('clientId', filterClient);
    if (filterType) params.set('type', filterType);
    params.set('limit', '100');
    Promise.all([
      api.get('/api/clients'),
      api.get('/api/products'),
      api.get(`/api/transactions?${params}`),
    ])
      .then(([cRes, pRes, tRes]) => {
        setClients(cRes.data);
        setProducts(pRes.data);
        setList(tRes.data);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterClient, filterType]);

  const openAdd = () => setModal({
    clientId: filterClient || clients[0]?._id || '',
    productId: '',
    type: 'INBOUND',
    quantity: 1,
    reference: '',
  });

  const save = async () => {
    if (!modal.productId || !modal.clientId || modal.quantity == null) return;
    setError('');
    try {
      await api.post('/api/transactions', {
        productId: modal.productId,
        clientId: modal.clientId,
        type: modal.type,
        quantity: Number(modal.quantity),
        reference: modal.reference?.trim() || '',
      });
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const productsForClient = modal?.clientId
    ? products.filter((p) => String(p.clientId?._id || p.clientId) === String(modal.clientId))
    : products;

  if (loading && list.length === 0) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Transactions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" className="primary" onClick={openAdd}>Create transaction</button>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Stock is ledger-based. All changes go through transactions.</p>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
      {list.length === 0 && !modal && (
        <EmptyState message="No transactions yet. Create an INBOUND transaction to add stock." action={<button type="button" className="primary" onClick={openAdd}>Create transaction</button>} />
      )}
      {list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t._id}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.productId?.name ?? t.productId ?? '—'}</td>
                  <td><span style={{ textTransform: 'uppercase' }}>{t.type}</span></td>
                  <td>{t.quantity}</td>
                  <td>{t.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', minWidth: 340 }}>
            <h2 style={{ marginTop: 0 }}>Create transaction</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label>Client</label>
              <select value={modal.clientId} onChange={(e) => setModal({ ...modal, clientId: e.target.value, productId: '' })}>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <label>Product</label>
              <select value={modal.productId} onChange={(e) => setModal({ ...modal, productId: e.target.value })}>
                <option value="">Select product</option>
                {productsForClient.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
              </select>
              <label>Type</label>
              <select value={modal.type} onChange={(e) => setModal({ ...modal, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label>Quantity</label>
              <input type="number" min="1" value={modal.quantity} onChange={(e) => setModal({ ...modal, quantity: e.target.value })} />
              <label>Reference (order ID, etc.)</label>
              <input value={modal.reference} onChange={(e) => setModal({ ...modal, reference: e.target.value })} placeholder="Optional" />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="primary" onClick={save}>Create</button>
              <button type="button" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
