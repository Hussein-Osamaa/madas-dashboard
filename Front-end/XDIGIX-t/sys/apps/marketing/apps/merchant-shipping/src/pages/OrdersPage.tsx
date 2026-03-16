import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { api, getMerchantId } from '../lib/api';

interface Shipment {
  _id: string; trackingNumber: string; status: string;
  recipientName: string; recipientPhone: string; recipientAddress: string;
  weight: number; codAmount: number; totalFee: number; createdAt: string;
  shipmentType: string; deliveryAttempts: number;
}

const STATUS_COLORS: Record<string,string> = {
  pending: 'bg-gray-500/10 text-gray-400', pickup_scheduled: 'bg-blue-500/10 text-blue-400',
  picked_up: 'bg-indigo-500/10 text-indigo-400', in_warehouse: 'bg-purple-500/10 text-purple-400',
  sorted: 'bg-yellow-500/10 text-yellow-400', assigned_to_courier: 'bg-orange-500/10 text-orange-400',
  out_for_delivery: 'bg-amber-500/10 text-amber-400', delivered: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400', return_initiated: 'bg-pink-500/10 text-pink-400',
  returned: 'bg-rose-500/10 text-rose-400', cancelled: 'bg-gray-600/10 text-gray-500',
};

export default function OrdersPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total,    setTotal]      = useState(0);
  const [page,     setPage]       = useState(1);
  const [pages,    setPages]      = useState(1);
  const [status,   setStatus]     = useState('');
  const [search,   setSearch]     = useState('');
  const merchantId = getMerchantId();

  const load = async (pg = 1) => {
    const qs = new URLSearchParams({ page: String(pg), limit: '20' });
    if (merchantId) qs.set('merchantId', merchantId);
    if (status)     qs.set('status', status);
    const d = await api.get(`/shipping/shipments?${qs}`);
    setShipments(d.shipments ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setPage(pg);
  };

  useEffect(() => { load(1); }, [status]);

  const fmt = (s: string) => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });

  const filtered = search
    ? shipments.filter(s => s.trackingNumber.includes(search.toUpperCase()) || s.recipientName.toLowerCase().includes(search.toLowerCase()))
    : shipments;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">My Shipments</h1>
          <span className="text-sm text-gray-500">{total}</span>
        </div>
        <Link to="/create" className="px-4 py-2 bg-amber-500 text-black rounded-xl font-semibold text-sm hover:bg-amber-400">+ New</Link>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tracking # or name…"
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white w-64 outline-none" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {['Tracking #','Recipient','Type','Weight','COD','Fee','Status','Date',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr key={s._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-amber-400 text-xs">{s.trackingNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{s.recipientName}</p>
                    <p className="text-gray-500 text-xs">{s.recipientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 capitalize">{s.shipmentType.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.weight}kg</td>
                  <td className="px-4 py-3 text-xs">{s.codAmount > 0 ? <span className="text-emerald-400">{s.codAmount.toLocaleString()}</span> : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.totalFee}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? ''}`}>{s.status.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/orders/${s._id}`} className="p-1.5 text-gray-500 hover:text-amber-400 block"><Eye className="w-4 h-4" /></Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">No shipments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-xs text-gray-500">Page {page} of {pages} · {total} total</span>
          <div className="flex gap-1">
            <button onClick={() => load(page-1)} disabled={page <= 1} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => load(page+1)} disabled={page >= pages} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
