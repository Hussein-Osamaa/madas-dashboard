import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function ClientDashboard() {
  const { clientId } = useAuth();
  const [virtualWarehouse, setVirtualWarehouse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) return;
    api
      .get(`/api/stock/virtual/${clientId}`)
      .then((res) => { setVirtualWarehouse(res.data); setError(''); })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Loading message="Loading virtual warehouse…" />;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;

  return (
    <div>
      <h1>Virtual Warehouse</h1>
      <p style={{ color: 'var(--muted)' }}>Your calculated stock. You cannot edit stock; all changes are via transactions.</p>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/client/reports">Download reports</Link>
        {' · '}
        <Link to="/client/notifications">Notifications</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Shipping</th>
              <th>Damaged</th>
              <th>Missing</th>
            </tr>
          </thead>
          <tbody>
            {virtualWarehouse.map((row) => (
              <tr key={row.productId._id}>
                <td>{row.product?.name ?? row.productId?.name ?? '-'}</td>
                <td>{row.product?.sku ?? '-'}</td>
                <td>{row.product?.barcode ?? '-'}</td>
                <td><strong>{row.available}</strong></td>
                <td>{row.reserved ?? 0}</td>
                <td>{row.shipping ?? 0}</td>
                <td style={{ color: 'var(--warning)' }}>{row.damaged ?? 0}</td>
                <td style={{ color: 'var(--danger)' }}>{row.missing ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {virtualWarehouse.length === 0 && (
        <EmptyState message="No products in your warehouse yet." />
      )}
    </div>
  );
}
