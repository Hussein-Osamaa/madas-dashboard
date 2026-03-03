import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function Reports() {
  const { clientId } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    api
      .get(`/api/reports?clientId=${clientId}`)
      .then((res) => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Loading message="Loading reports…" />;

  return (
    <div>
      <h1>Report history</h1>
      <p style={{ color: 'var(--muted)' }}>Download weekly, monthly, and yearly inventory reports.</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Type</th>
              <th>Opening</th>
              <th>Closing</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r._id}>
                <td>{r.periodLabel}</td>
                <td>{r.periodType}</td>
                <td>{r.openingBalance}</td>
                <td>{r.closingBalance}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link to={`/client/reports/${r._id}`}>View</Link>
                  {r.pdfUrl && (
                    <>
                      <a href={`/api/reports/${r._id}/download`} download style={{ marginLeft: 8 }}>Download PDF</a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reports.length === 0 && <EmptyState message="No reports yet. Reports are generated after weekly audits or monthly/yearly by schedule." />}
    </div>
  );
}
