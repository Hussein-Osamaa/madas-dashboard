import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Loading from '../components/Loading';

export default function AdminDashboard() {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportClient, setReportClient] = useState('');
  const [reportPeriod, setReportPeriod] = useState('WEEKLY');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/clients'),
      api.get('/api/products'),
      api.get('/api/orders?limit=100'),
      api.get('/api/transactions?limit=20'),
    ])
      .then(([c, p, o, t]) => {
        setClients(c.data);
        setProducts(p.data);
        setOrders(o.data);
        setTransactions(t.data);
        if (!reportClient && c.data[0]) setReportClient(c.data[0]._id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const triggerReport = async () => {
    if (!reportClient) return;
    setReportBusy(true);
    setReportMsg('');
    try {
      await api.post(`/api/reports/trigger/${reportClient}`, { periodType: reportPeriod });
      setReportMsg(`${reportPeriod} report generated and client notified.`);
    } catch (e) {
      setReportMsg(e.response?.data?.error || e.message);
    } finally {
      setReportBusy(false);
    }
  };

  if (loading) return <Loading />;

  const reserved = orders.filter((x) => x.status === 'RESERVED').length;
  const shipping = orders.filter((x) => x.status === 'SHIPPING').length;

  return (
    <div>
      <h1>Warehouse Admin</h1>
      <p style={{ color: 'var(--muted)' }}>Inventory is ledger-based. Stock is never edited manually.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/admin/clients" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{clients.length}</div>
            <div style={{ color: 'var(--muted)' }}>Clients</div>
          </div>
        </Link>
        <Link to="/admin/products" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{products.length}</div>
            <div style={{ color: 'var(--muted)' }}>Products</div>
          </div>
        </Link>
        <Link to="/admin/orders" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{orders.length}</div>
            <div style={{ color: 'var(--muted)' }}>Orders</div>
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>{reserved} reserved, {shipping} shipping</div>
          </div>
        </Link>
        <Link to="/admin/transactions" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Ledger</div>
            <div style={{ color: 'var(--muted)' }}>Transactions</div>
          </div>
        </Link>
        <Link to="/admin/audit" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Weekly Audit →</div>
            <div style={{ color: 'var(--muted)' }}>Barcode scan</div>
          </div>
        </Link>
      </div>
      <h2>Recent transactions</h2>
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
            {transactions.map((t) => (
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
      {transactions.length === 0 && <p style={{ color: 'var(--muted)' }}>No transactions yet. Add INBOUND or create orders.</p>}

      <h2 style={{ marginTop: '2rem' }}>Generate report</h2>
      <p style={{ color: 'var(--muted)' }}>Manually trigger a report for a client (PDF + notification).</p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <select value={reportClient} onChange={(e) => setReportClient(e.target.value)}>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
        <button type="button" className="primary" onClick={triggerReport} disabled={reportBusy || !reportClient}>
          {reportBusy ? 'Generating…' : 'Generate report'}
        </button>
        {reportMsg && <span style={{ color: reportMsg.includes('error') ? 'var(--danger)' : 'var(--success)' }}>{reportMsg}</span>}
      </div>
    </div>
  );
}
