import { useState, useEffect } from 'react';
import { api } from '../../api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

export default function Orders() {
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [actioning, setActioning] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    Promise.all([
      api.get('/api/clients'),
      api.get('/api/products'),
      api.get(`/api/orders?${params}`),
    ])
      .then(([cRes, pRes, oRes]) => {
        setClients(cRes.data);
        setProducts(pRes.data);
        setList(oRes.data);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterStatus]);

  const openCreate = () => setModal({
    clientId: clients[0]?._id || '',
    reference: '',
    items: [{ productId: '', quantity: 1 }],
  });

  const addLine = () => setModal((m) => ({ ...m, items: [...m.items, { productId: '', quantity: 1 }] }));
  const removeLine = (i) => setModal((m) => ({ ...m, items: m.items.filter((_, idx) => idx !== i) }));
  const setLine = (i, field, value) => setModal((m) => ({
    ...m,
    items: m.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
  }));

  const createOrder = async () => {
    const items = modal.items.filter((i) => i.productId && i.quantity > 0).map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }));
    if (!modal.clientId || items.length === 0) return;
    setError('');
    try {
      await api.post('/api/orders', { clientId: modal.clientId, items, reference: modal.reference?.trim() || '' });
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const doAction = async (orderId, action) => {
    setActioning(orderId);
    setError('');
    try {
      await api.post(`/api/orders/${orderId}/${action}`);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setActioning(null);
    }
  };

  const productsForClient = (clientId) =>
    products.filter((p) => String(p.clientId?._id || p.clientId) === String(clientId));

  if (loading && list.length === 0) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Orders</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="RESERVED">Reserved</option>
            <option value="SHIPPING">Shipping</option>
            <option value="DELIVERED">Delivered</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button type="button" className="primary" onClick={openCreate}>Create order</button>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Create order → Confirm (RESERVED) → Ship → Deliver. Or Return / Cancel.</p>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
      {list.length === 0 && !modal && (
        <EmptyState message="No orders yet." action={<button type="button" className="primary" onClick={openCreate}>Create order</button>} />
      )}
      {list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Status</th>
                <th>Items</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o._id}>
                  <td>{o.reference || o._id.slice(-6)}</td>
                  <td>{o.clientId?.name ?? o.clientId}</td>
                  <td><span style={{ textTransform: 'uppercase' }}>{o.status}</span></td>
                  <td>
                    {o.items?.map((item, i) => (
                      <span key={i}>
                        {item.productId?.name ?? item.productId} × {item.quantity}
                        {i < o.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>
                    {o.status === 'DRAFT' && (
                      <button type="button" className="primary" disabled={actioning === o._id} onClick={() => doAction(o._id, 'confirm')}>Confirm</button>
                    )}
                    {o.status === 'RESERVED' && (
                      <>
                        <button type="button" className="primary" disabled={actioning === o._id} onClick={() => doAction(o._id, 'ship')}>Ship</button>
                        <button type="button" style={{ marginLeft: 4 }} disabled={actioning === o._id} onClick={() => doAction(o._id, 'cancel')}>Cancel</button>
                      </>
                    )}
                    {o.status === 'SHIPPING' && (
                      <>
                        <button type="button" className="primary" disabled={actioning === o._id} onClick={() => doAction(o._id, 'deliver')}>Deliver</button>
                        <button type="button" style={{ marginLeft: 4 }} disabled={actioning === o._id} onClick={() => doAction(o._id, 'return')}>Return</button>
                        <button type="button" style={{ marginLeft: 4 }} disabled={actioning === o._id} onClick={() => doAction(o._id, 'lost')}>Lost</button>
                        <button type="button" style={{ marginLeft: 4 }} disabled={actioning === o._id} onClick={() => doAction(o._id, 'damaged')}>Damaged</button>
                        <button type="button" style={{ marginLeft: 4 }} disabled={actioning === o._id} onClick={() => doAction(o._id, 'cancel')}>Cancel</button>
                      </>
                    )}
                    {o.status === 'DELIVERED' && (
                      <button type="button" disabled={actioning === o._id} onClick={() => doAction(o._id, 'return')}>Return</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', minWidth: 400, maxWidth: '90vw' }}>
            <h2 style={{ marginTop: 0 }}>Create order</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label>Client</label>
              <select value={modal.clientId} onChange={(e) => setModal({ ...modal, clientId: e.target.value })}>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <label>Reference (optional)</label>
              <input value={modal.reference} onChange={(e) => setModal({ ...modal, reference: e.target.value })} placeholder="Order #" />
              <label>Items</label>
              {modal.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={item.productId}
                    onChange={(e) => setLine(i, 'productId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select product</option>
                    {productsForClient(modal.clientId).map((p) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} style={{ width: 70 }} />
                  <button type="button" onClick={() => removeLine(i)}>×</button>
                </div>
              ))}
              <button type="button" onClick={addLine}>+ Add line</button>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="primary" onClick={createOrder}>Create order</button>
              <button type="button" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
