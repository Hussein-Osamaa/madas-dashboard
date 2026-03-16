import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api, getMerchantId } from '../lib/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Record<string,number>|null>(null);
  const [trend,    setTrend]    = useState<{_id:string;total:number;delivered:number;failed:number}[]>([]);
  const [days,     setDays]     = useState(30);
  const merchantId = getMerchantId();

  useEffect(() => {
    const from = new Date(); from.setDate(from.getDate() - days);
    const qs = `?from=${from.toISOString()}${merchantId ? `&merchantId=${merchantId}` : ''}`;
    api.get(`/shipping/analytics/overview${qs}`).then(setOverview);
    api.get(`/shipping/analytics/daily-trend?days=${days}${merchantId ? `&merchantId=${merchantId}` : ''}`).then(d => setTrend(d.trend ?? []));
  }, [days]);

  const kpis = overview ? [
    { label:'Total Orders',  value: overview.totalOrders,     color:'text-white' },
    { label:'Delivered',     value: overview.deliveredOrders, color:'text-emerald-400' },
    { label:'In Transit',    value: overview.inTransit,       color:'text-amber-400' },
    { label:'Failed',        value: overview.failedOrders,    color:'text-red-400' },
    { label:'Returned',      value: overview.returnedOrders,  color:'text-pink-400' },
    { label:'Success Rate',  value: `${overview.successRate}%`, color:'text-teal-400' },
    { label:'COD Collected', value: `${(overview.cashCollected??0).toLocaleString()} EGP`, color:'text-emerald-400' },
    { label:'Revenue',       value: `${(overview.totalRevenue??0).toLocaleString()} EGP`,  color:'text-indigo-400' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">My Analytics</h1>
        </div>
        <div className="flex gap-2">
          {[7,14,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm ${days===d ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {trend.length > 0 && (
        <>
          <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" />Order Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <XAxis dataKey="_id" tick={{fill:'#6b7280',fontSize:11}} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{fill:'#6b7280',fontSize:11}} />
                <Tooltip contentStyle={{background:'#1a1b3e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8}} />
                <Line type="monotone" dataKey="total"     stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} dot={false} name="Delivered" />
                <Line type="monotone" dataKey="failed"    stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Daily Orders (Bar)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <XAxis dataKey="_id" tick={{fill:'#6b7280',fontSize:11}} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{fill:'#6b7280',fontSize:11}} />
                <Tooltip contentStyle={{background:'#1a1b3e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8}} />
                <Bar dataKey="delivered" fill="#10b981" radius={[3,3,0,0]} name="Delivered" stackId="a" />
                <Bar dataKey="failed"    fill="#ef4444" radius={[3,3,0,0]} name="Failed" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
