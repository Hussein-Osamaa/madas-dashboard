import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, MapPin, Bike } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const COLORS = ['#f59e0b','#10b981','#ef4444','#6366f1','#ec4899','#14b8a6'];

export default function ShippingAnalyticsPage() {
  const [overview, setOverview] = useState<Record<string,number> | null>(null);
  const [reasons,  setReasons]  = useState<{reason:string;count:number;percentage:number}[]>([]);
  const [trend,    setTrend]    = useState<{_id:string;total:number;delivered:number;failed:number;revenue:number}[]>([]);
  const [couriers, setCouriers] = useState<{name:string;successRate:number;totalDeliveries:number;rating:number}[]>([]);
  const [days,     setDays]     = useState(30);

  const load = async () => {
    const from = new Date(); from.setDate(from.getDate() - days);
    const qs = `?from=${from.toISOString()}`;
    const [o, r, t, c] = await Promise.all([
      fetch(`${API}/api/shipping/analytics/overview${qs}`,             { headers: auth() }).then(x => x.json()),
      fetch(`${API}/api/shipping/analytics/delivery-reasons${qs}`,     { headers: auth() }).then(x => x.json()),
      fetch(`${API}/api/shipping/analytics/daily-trend?days=${days}`,  { headers: auth() }).then(x => x.json()),
      fetch(`${API}/api/shipping/analytics/courier-performance`,       { headers: auth() }).then(x => x.json()),
    ]);
    setOverview(o);
    setReasons(r.reasons ?? []);
    setTrend(t.trend ?? []);
    setCouriers(c.couriers ?? []);
  };

  useEffect(() => { load(); }, [days]);

  const kpis = overview ? [
    { label: 'Total Orders',  value: overview.totalOrders,    color: 'text-white' },
    { label: 'Delivered',     value: overview.deliveredOrders,color: 'text-emerald-400' },
    { label: 'Failed',        value: overview.failedOrders,   color: 'text-red-400' },
    { label: 'Success Rate',  value: `${overview.successRate}%`, color: 'text-amber-400' },
    { label: 'Cash Collected',value: `${(overview.cashCollected ?? 0).toLocaleString()} EGP`, color: 'text-emerald-400' },
    { label: 'Revenue',       value: `${(overview.totalRevenue ?? 0).toLocaleString()} EGP`, color: 'text-indigo-400' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Shipping Analytics</h1>
        </div>
        <div className="flex gap-2">
          {[7,14,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${days === d ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" />Daily Trend</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1a1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="total"     stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
            <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} dot={false} name="Delivered" />
            <Line type="monotone" dataKey="failed"    stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Reasons */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Unsuccessful Delivery Reasons</h2>
          {reasons.length > 0 ? (
            <div className="space-y-2">
              {reasons.map((r, i) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right">{i+1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300">{r.reason.replace(/_/g,' ')}</span>
                      <span className="text-xs text-gray-500">{r.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Courier Performance */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Bike className="w-4 h-4 text-amber-400" />Courier Performance</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {couriers.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0">
                  {i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.totalDeliveries} deliveries</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${c.successRate >= 80 ? 'text-emerald-400' : c.successRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {c.successRate}%
                  </p>
                  <p className="text-xs text-gray-500">★{c.rating.toFixed(1)}</p>
                </div>
              </div>
            ))}
            {couriers.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No courier data</p>}
          </div>
        </div>
      </div>

      {/* Revenue bar */}
      {trend.length > 0 && (
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Daily Revenue (EGP)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[3,3,0,0]} name="Revenue EGP" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
