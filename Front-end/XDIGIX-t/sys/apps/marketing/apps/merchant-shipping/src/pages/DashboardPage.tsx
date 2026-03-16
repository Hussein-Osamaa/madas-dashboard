import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, Plus, ArrowRight, Clock } from 'lucide-react';
import { api, getMerchantId } from '../lib/api';

interface Shipment {
  _id: string; trackingNumber: string; status: string;
  recipientName: string; codAmount: number; createdAt: string; totalFee: number;
}

const STATUS_COLORS: Record<string,string> = {
  pending: 'text-gray-400', pickup_scheduled: 'text-blue-400', picked_up: 'text-indigo-400',
  in_warehouse: 'text-purple-400', sorted: 'text-yellow-400', assigned_to_courier: 'text-orange-400',
  out_for_delivery: 'text-amber-400', delivered: 'text-emerald-400', failed: 'text-red-400',
  return_initiated: 'text-pink-400', returned: 'text-rose-400', cancelled: 'text-gray-500',
};

export default function DashboardPage() {
  const [orders,    setOrders]    = useState<Shipment[]>([]);
  const [overview,  setOverview]  = useState<Record<string,number> | null>(null);
  const merchantId = getMerchantId();

  useEffect(() => {
    const qs = merchantId ? `?merchantId=${merchantId}&limit=10` : '?limit=10';
    api.get(`/shipping/shipments${qs}`).then(d => setOrders(d.shipments ?? []));
    const from = new Date(); from.setDate(from.getDate() - 30);
    api.get(`/shipping/analytics/overview?from=${from.toISOString()}${merchantId ? `&merchantId=${merchantId}` : ''}`).then(setOverview);
  }, []);

  const kpis = overview ? [
    { icon: Package,      label: 'Total Orders',   value: overview.totalOrders,    color: 'text-white' },
    { icon: CheckCircle,  label: 'Delivered',       value: overview.deliveredOrders,color: 'text-emerald-400' },
    { icon: Truck,        label: 'In Transit',      value: overview.inTransit,      color: 'text-amber-400' },
    { icon: XCircle,      label: 'Failed',          value: overview.failedOrders,   color: 'text-red-400' },
  ] : [];

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Last 30 days performance</p>
        </div>
        <Link to="/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-black rounded-xl font-semibold text-sm hover:bg-amber-400 transition-colors">
          <Plus className="w-4 h-4" />New Shipment
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                <k.icon className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Success rate + Cash */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">Delivery Success Rate</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-amber-400">{overview.successRate ?? 0}%</p>
            </div>
            <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${overview.successRate ?? 0}%` }} />
            </div>
          </div>
          <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">Cash Collected (COD)</p>
            <p className="text-3xl font-bold text-emerald-400">{(overview.cashCollected ?? 0).toLocaleString()} <span className="text-lg">EGP</span></p>
            <p className="text-xs text-gray-500 mt-2">Net after fees: {((overview.cashCollected ?? 0) - (overview.totalRevenue ?? 0) * 0.5).toFixed(0)} EGP (est.)</p>
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Recent Shipments</h2>
          <Link to="/orders" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No shipments yet</p>
              <Link to="/create" className="text-xs text-amber-400 mt-1 inline-block">Create your first shipment →</Link>
            </div>
          ) : orders.map(o => (
            <Link key={o._id} to={`/orders/${o._id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-amber-400">{o.trackingNumber}</p>
                <p className="text-sm text-white truncate">{o.recipientName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-medium ${STATUS_COLORS[o.status] ?? 'text-gray-400'}`}>{o.status.replace(/_/g,' ')}</p>
                <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
