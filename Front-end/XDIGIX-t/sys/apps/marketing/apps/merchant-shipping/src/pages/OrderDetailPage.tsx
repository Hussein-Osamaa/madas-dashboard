import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Clock, MapPin, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';

interface ShipmentEvent { eventType: string; description: string; timestamp: string; location?: string; }
interface Shipment {
  _id: string; trackingNumber: string; status: string;
  recipientName: string; recipientPhone: string; recipientAddress: string;
  weight: number; codAmount: number; totalFee: number; shippingFee: number; codFee: number; merchantReceives: number;
  shipmentType: string; deliveryAttempts: number; maxAttempts: number;
  createdAt: string; deliveredAt?: string; slaId?: string;
  events: ShipmentEvent[];
}

const STATUS_COLORS: Record<string,string> = {
  delivered: 'text-emerald-400', failed: 'text-red-400', cancelled: 'text-gray-500',
  out_for_delivery: 'text-amber-400', pending: 'text-gray-400',
};

export default function OrderDetailPage() {
  const { id }  = useParams();
  const [s,  setS]    = useState<Shipment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) api.get(`/shipping/shipments/${id}`).then(d => setS({ ...d.shipment, events: d.events ?? [] }));
  }, [id]);

  const copy = () => {
    if (s) { navigator.clipboard.writeText(s.trackingNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const fmt = (s?: string) => s ? new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  if (!s) return (
    <div className="p-6">
      <div className="h-8 bg-white/5 rounded animate-pulse w-48 mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({length:6}).map((_,i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/orders" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white font-mono">{s.trackingNumber}</h1>
            <button onClick={copy} className="p-1 text-gray-500 hover:text-amber-400">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <span className={`text-xs font-medium ${STATUS_COLORS[s.status] ?? 'text-gray-400'}`}>{s.status.replace(/_/g,' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recipient */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase">Recipient</h2>
          <div className="space-y-1">
            <p className="text-white font-semibold">{s.recipientName}</p>
            <p className="text-gray-400 text-sm">{s.recipientPhone}</p>
            <p className="text-gray-400 text-sm flex items-start gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />{s.recipientAddress}</p>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase">Financial Summary</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'COD Amount', value: s.codAmount > 0 ? `${s.codAmount.toLocaleString()} EGP` : '—', highlight: false },
              { label: 'Shipping Fee', value: `${s.shippingFee} EGP`, highlight: false },
              { label: 'COD Fee', value: `${s.codFee} EGP`, highlight: false },
              { label: 'You Receive', value: `${s.merchantReceives.toFixed(2)} EGP`, highlight: true },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-gray-400">{r.label}</span>
                <span className={r.highlight ? 'text-emerald-400 font-bold' : 'text-white'}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Package */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase">Package</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Weight', value: `${s.weight}kg` },
              { label: 'Type', value: s.shipmentType.replace(/_/g,' ') },
              { label: 'Attempts', value: `${s.deliveryAttempts}/${s.maxAttempts}` },
            ].map(f => (
              <div key={f.label} className="bg-white/5 rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-500">{f.label}</p>
                <p className="text-sm font-semibold text-white mt-0.5 capitalize">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase">Dates</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Created</span><span className="text-white">{fmt(s.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Delivered</span><span className="text-white">{fmt(s.deliveredAt)}</span></div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />Shipment Timeline
        </h2>
        {s.events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet</p>
        ) : (
          <div className="space-y-0">
            {[...s.events].reverse().map((e, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${i === 0 ? 'bg-amber-400' : 'bg-white/20'}`} />
                  {i < s.events.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-white">{e.eventType.replace(/_/g,' ')}</p>
                  <p className="text-xs text-gray-400">{e.description}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{fmt(e.timestamp)}{e.location ? ` · ${e.location}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
