import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function WeeklyAuditScan() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [session, setSession] = useState(null);
  const [scanned, setScanned] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [status, setStatus] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api.get('/api/clients').then((res) => setClients(res.data)).catch(console.error);
  }, []);

  const startSession = async () => {
    if (!selectedClient) return;
    setStatus('Starting…');
    try {
      const { data } = await api.post('/api/audit/sessions', { clientId: selectedClient });
      setSession(data);
      setScanned([]);
      setStatus('Scanning. Use barcode scanner or type barcode and press Enter.');
      setBarcodeInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setStatus('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const addScan = async (barcode) => {
    if (!session || session.finishedAt) return;
    const trimmed = String(barcode).trim();
    if (!trimmed) return;
    try {
      await api.post(`/api/audit/sessions/${session._id}/scan`, { barcode: trimmed });
      setScanned((prev) => [...prev, { barcode: trimmed, at: new Date().toISOString() }]);
      setBarcodeInput('');
      inputRef.current?.focus();
    } catch (e) {
      setStatus('Scan error: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    addScan(barcodeInput);
  };

  useEffect(() => {
    if (!session || session.finishedAt) return;
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.getAttribute('data-audit-input') === 'true') return;
      if (e.key === 'Enter' && barcodeInput.trim()) {
        e.preventDefault();
        addScan(barcodeInput);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session, barcodeInput]);

  const finishSession = async () => {
    if (!session) return;
    setStatus('Finishing audit and generating weekly report…');
    try {
      await api.post(`/api/audit/sessions/${session._id}/finish`);
      setStatus('Audit complete. MISSING/ADJUSTMENT/AUDIT transactions created. Weekly report generated.');
      setSession(null);
      setScanned([]);
    } catch (e) {
      setStatus('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div>
      <h1>Weekly Audit Scan</h1>
      <p style={{ color: 'var(--muted)' }}>
        Bluetooth barcode scanner acts as keyboard. Each scan adds to the session. On finish, expected vs physical creates MISSING or ADJUSTMENT and a weekly report is generated.
      </p>

      {!session ? (
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', maxWidth: 400 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <button type="button" className="primary" onClick={startSession} disabled={!selectedClient}>
            Start audit session
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--success)' }}>{status || 'Scanning…'}</p>
          <form onSubmit={handleBarcodeSubmit} style={{ marginBottom: '1rem' }}>
            <input
              ref={inputRef}
              data-audit-input="true"
              type="text"
              placeholder="Scan or type barcode then Enter"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              autoFocus
              style={{ width: 320, marginRight: 8 }}
            />
            <button type="submit">Add</button>
          </form>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Scanned: {scanned.length}</strong>
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto', background: 'var(--surface)', padding: '0.5rem', borderRadius: 6, marginBottom: '1rem' }}>
            {scanned.map((s, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                {s.barcode} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(s.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <button type="button" className="primary" onClick={finishSession}>
            Finish audit & generate weekly report
          </button>
        </>
      )}
    </div>
  );
}
