import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Loading from '../components/Loading';

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/reports/${id}`).then((res) => setReport(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!report) return <p>Report not found.</p>;

  const pdfUrl = report.pdfUrl?.startsWith('http') ? report.pdfUrl : `${window.location.origin}${report.pdfUrl}`;

  return (
    <div>
      <Link to="/client/reports">← Back to reports</Link>
      <h1>Report: {report.periodType} – {report.periodLabel}</h1>
      <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', maxWidth: 400 }}>
        <p><strong>Opening balance:</strong> {report.openingBalance}</p>
        <p><strong>Total inbound:</strong> {report.totalInbound}</p>
        <p><strong>Total sold:</strong> {report.totalSold}</p>
        <p><strong>Total damaged:</strong> {report.totalDamaged}</p>
        <p><strong>Total missing:</strong> {report.totalMissing}</p>
        <p><strong>Closing balance:</strong> {report.closingBalance}</p>
        <p style={{ color: 'var(--muted)' }}>Generated {new Date(report.createdAt).toLocaleString()}</p>
        {report.pdfUrl && (
          <a href={`/api/reports/${report._id}/download`} download className="primary" style={{ display: 'inline-block', marginTop: 8, padding: '0.5rem 1rem' }}>
            Download PDF
          </a>
        )}
      </div>
    </div>
  );
}
