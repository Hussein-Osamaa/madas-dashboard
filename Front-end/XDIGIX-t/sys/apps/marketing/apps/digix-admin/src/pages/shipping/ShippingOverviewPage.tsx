import { useEffect, useState } from 'react';
import { Package, Truck, CheckCircle, XCircle, RotateCcw, TrendingUp, DollarSign, Clock } from 'lucide-react';

interface Overview {
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  inTransit: number;
  successRate: number;
  cashCollected: number;
  totalRevenue: number;
}

const API = import.meta.env.VITE_API_URL ?? '';

export default function ShippingOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');

  const fetchData = async () => {
    setLoading(true);
    try {
      const from = new Date();
      if (range === 'today')  from.setHours(0,0,0,0);
      if (range === 'week')   from.setDate(from.getDate() - 7);
      if (range === 'month')  from.setDate(from.getDate() - 30);
      const r = await fetch(`${API}/api/shipping/analytics/overview?from=${from.toISOString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [range]);

  const cards = data ? [
    { label: 'Total Orders',    value: data.totalOrders,    icon: Package,    color: 'bg-blue-500/10 text-blue-400',   border: 'border-blue-500/20' },
    { label: 'Delivered',       value: data.deliveredOrders,icon: CheckCircle,color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
    { label: 'In Transit',      value: data.inTransit,      icon: Truck,      color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
    { label: 'Failed',          value: data.failedOrders,   icon: XCircle,    color: 'bg-red-500/10 text-red-400',     border: 'border-red-500/20' },
    { label: 'Returned',        value: data.returnedOrders, icon: RotateCcw,  color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
    { label: 'Success Rate',    value: `${data.successRate}%`, icon: TrendingUp, color: 'bg-teal-500/10 text-teal-400', border: 'border-teal-500/20' },
    { label: 'Cash Collected',  value: `${data.cashCollected.toLocaleString()} EGP`, icon: DollarSign, color: 'bg-green-500/10 text-green-400', border: 'border-green-500/20' },
    { label: 'Total Revenue',   value: `${data.totalRevenue.toLocaleString()} EGP`,  icon: DollarSign, color: 'bg-indigo-500/10 text-indigo-400', border: 'border-indigo-500/20' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipping Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Live logistics performance dashboard</p>
        </div>
        <div className="flex gap-2">
          {['today','week','month'].map(r => (
            <button key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${range === r ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >{r.charAt(0).toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({length: 8}).map((_,i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className={`bg-[#1a1b3e]/80 border ${c.border} rounded-xl p-4 space-y-2`}>
              <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Seed button */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-amber-400">Initial Setup</p>
          <p className="text-xs text-gray-400">Seed Egypt cities, zones, weight brackets, SLA rules, and default pricing.</p>
        </div>
        <button
          onClick={async () => {
            const r = await fetch(`${API}/api/shipping/seed/egypt`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const d = await r.json();
            alert(d.message ?? d.error ?? 'Done');
          }}
          className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors"
        >Seed Egypt Data</button>
      </div>
    </div>
  );
}
