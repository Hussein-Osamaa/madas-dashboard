import { useEffect, useState } from 'react';
import { Package, Search, Filter, Eye, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Shipment {
  _id: string; trackingNumber: string; merchantId: string; status: string;
  recipientName: string; recipientPhone: string; recipientAddress: string;
  weight: number; codAmount: number; totalFee: number;
  shipmentType: string; createdAt: string; deliveryAttempts: number;
}

interface ShipmentDetail extends Shipment {
  events: { eventType: string; description: string; timestamp: string; location?: string }[];
  attempts: { attemptNumber: number; result: string; notes?: string; timestamp: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:             'bg-gray-500/10 text-gray-400',
  pickup_scheduled:    'bg-blue-500/10 text-blue-400',
  picked_up:           'bg-indigo-500/10 text-indigo-400',
  in_warehouse:        'bg-purple-500/10 text-purple-400',
  sorted:              'bg-yellow-500/10 text-yellow-400',
  assigned_to_courier: 'bg-orange-500/10 text-orange-400',
  out_for_delivery:    'bg-amber-500/10 text-amber-400',
  delivered:           'bg-emerald-500/10 text-emerald-400',
  failed:              'bg-red-500/10 text-red-400',
  return_initiated:    'bg-pink-500/10 text-pink-400',
  returned:            'bg-rose-500/10 text-rose-400',
  cancelled:           'bg-gray-600/10 text-gray-500',
};

export default function ShipmentsManagementPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detail,    setDetail]    = useState<ShipmentDetail | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const load = async (pg = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: '20' });
      if (filterStatus) qs.set('status', filterStatus);
      const r = await fetch(`${API}/api/shipping/shipments?${qs}`, { headers: auth() });
      const d = await r.json();
      setShipments(d.shipments ?? []);
      setTotal(d.total ?? 0);
      setPages(d.pages ?? 1);
      setPage(pg);
    } finally { setLoading(false); }
  };

  const loadDetail = async (id: string) => {
    const r = await fetch(`${API}/api/shipping/shipments/${id}`, { headers: auth() });
    const d = await r.json();
    setDetail({ ...d.shipment, events: d.events, attempts: d.attempts });
    setNewStatus('');
  };

  const updateStatus = async () => {
    if (!detail || !newStatus) return;
    const r = await fetch(`${API}/api/shipping/shipments/${detail._id}/status`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ status: newStatus, performedByRole: 'admin' }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    await loadDetail(detail._id);
    load(page);
  };

  const cancelShipment = async () => {
    if (!detail || !confirm('Cancel this shipment?')) return;
    await fetch(`${API}/api/shipping/shipments/${detail._id}/cancel`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reason: 'Cancelled by admin', role: 'admin' }),
    });
    await loadDetail(detail._id);
    load(page);
  };

  useEffect(() => { load(1); }, [filterStatus]);

  const statuses = ['','pending','pickup_scheduled','picked_up','in_warehouse','sorted','assigned_to_courier','out_for_delivery','delivered','failed','return_initiated','returned','cancelled'];

  const formatDate = (s: string) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tracking #..."
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white w-52 outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Statuses</option>
          {statuses.slice(1).map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {['Tracking #','Recipient','Weight','COD','Fee','Status','Date','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({length:8}).map((_,i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                ))
              ) : shipments.filter(s => !search || s.trackingNumber.includes(search.toUpperCase())).map(s => (
                <tr key={s._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-amber-400 text-xs whitespace-nowrap">{s.trackingNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{s.recipientName}</p>
                    <p className="text-gray-500 text-xs">{s.recipientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.weight}kg</td>
                  <td className="px-4 py-3 text-xs">{s.codAmount > 0 ? <span className="text-emerald-400">{s.codAmount.toLocaleString()} EGP</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.totalFee} EGP</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                      {s.status.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => loadDetail(s._id)} className="p-1.5 text-gray-500 hover:text-amber-400"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-xs text-gray-500">Page {page} of {pages} · {total} shipments</span>
          <div className="flex gap-1">
            <button onClick={() => load(page-1)} disabled={page <= 1} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => load(page+1)} disabled={page >= pages} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl bg-[#1a1b3e] border-l border-white/10 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1a1b3e] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white font-mono">{detail.trackingNumber}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[detail.status] ?? ''}`}>{detail.status.replace(/_/g,' ')}</span>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipient */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Recipient</h3>
                <p className="text-white font-medium">{detail.recipientName}</p>
                <p className="text-gray-400 text-sm">{detail.recipientPhone}</p>
                <p className="text-gray-400 text-sm">{detail.recipientAddress}</p>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Weight', value: `${detail.weight}kg` },
                  { label: 'COD', value: detail.codAmount > 0 ? `${detail.codAmount} EGP` : '—' },
                  { label: 'Fee', value: `${detail.totalFee} EGP` },
                ].map(f => (
                  <div key={f.label} className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Status update */}
              {!['delivered','returned','cancelled'].includes(detail.status) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Update Status</h3>
                  <div className="flex gap-2">
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">Select new status…</option>
                      {statuses.slice(1).filter(s => s !== detail.status).map(s => (
                        <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                      ))}
                    </select>
                    <button onClick={updateStatus} disabled={!newStatus}
                      className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold disabled:opacity-40 flex items-center gap-1">
                      <ArrowRight className="w-4 h-4" />Apply
                    </button>
                  </div>
                  {!['delivered','returned'].includes(detail.status) && (
                    <button onClick={cancelShipment} className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                      Cancel Shipment
                    </button>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Timeline ({detail.events.length})</h3>
                <div className="space-y-2">
                  {detail.events.map((e, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        {i < detail.events.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-medium text-white">{e.eventType.replace(/_/g,' ')}</p>
                        <p className="text-xs text-gray-400">{e.description}</p>
                        <p className="text-xs text-gray-600">{formatDate(e.timestamp)}{e.location ? ` · ${e.location}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attempts */}
              {detail.attempts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Delivery Attempts</h3>
                  {detail.attempts.map(a => (
                    <div key={a.attemptNumber} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">Attempt #{a.attemptNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.result === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{a.result}</span>
                      </div>
                      {a.notes && <p className="text-xs text-gray-500 mt-1">{a.notes}</p>}
                      <p className="text-xs text-gray-600 mt-1">{formatDate(a.timestamp)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
