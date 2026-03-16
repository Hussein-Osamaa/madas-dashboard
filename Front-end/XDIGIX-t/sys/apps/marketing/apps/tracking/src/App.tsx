import { useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? '';

type TrackingState = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

interface ShipmentEvent {
  eventType: string;
  description: string;
  timestamp: string;
  location?: string;
}

interface ShipmentInfo {
  trackingNumber: string;
  status: string;
  recipientName: string;
  recipientAddress: string;
  weight: number;
  shipmentType: string;
  createdAt: string;
  deliveredAt?: string;
  pickedUpAt?: string;
  deliveryAttempts: number;
  maxAttempts: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending:             'Order Received',
  pickup_scheduled:    'Pickup Scheduled',
  picked_up:           'Picked Up',
  in_warehouse:        'In Warehouse',
  sorted:              'Package Sorted',
  assigned_to_courier: 'Assigned to Courier',
  out_for_delivery:    'Out for Delivery',
  delivered:           'Delivered',
  failed:              'Delivery Failed',
  return_initiated:    'Return Initiated',
  returned:            'Returned',
  cancelled:           'Cancelled',
};

const STATUS_ICONS: Record<string, string> = {
  pending: '📦', pickup_scheduled: '📅', picked_up: '🚚', in_warehouse: '🏭',
  sorted: '📑', assigned_to_courier: '🔑', out_for_delivery: '🛵',
  delivered: '✅', failed: '❌', return_initiated: '↩️', returned: '🔄', cancelled: '🚫',
};

const PROGRESS_STEPS = [
  'pending','pickup_scheduled','picked_up','in_warehouse','sorted',
  'assigned_to_courier','out_for_delivery','delivered'
];

function getProgressPercent(status: string): number {
  const idx = PROGRESS_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round((idx / (PROGRESS_STEPS.length - 1)) * 100);
}

function formatDateTime(s?: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function App() {
  const [input,     setInput]    = useState('');
  const [state,     setState]    = useState<TrackingState>('idle');
  const [shipment,  setShipment] = useState<ShipmentInfo | null>(null);
  const [events,    setEvents]   = useState<ShipmentEvent[]>([]);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    const tn = input.trim().toUpperCase();
    if (!tn) return;
    setState('loading');
    setShipment(null);
    setEvents([]);
    try {
      const r = await fetch(`${API}/api/shipping/shipments/track/${tn}`);
      if (r.status === 404) { setState('notfound'); return; }
      if (!r.ok) { setState('error'); return; }
      const d = await r.json();
      setShipment(d.shipment);
      setEvents(d.events ?? []);
      setState('found');
    } catch {
      setState('error');
    }
  };

  const isFailed   = ['failed','returned','cancelled'].includes(shipment?.status ?? '');
  const isDelivered = shipment?.status === 'delivered';
  const progress   = shipment ? getProgressPercent(shipment.status) : 0;

  return (
    <div className="min-h-screen bg-[#0d0e26] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#1a1b3e]/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-bold text-sm shrink-0">X</div>
          <div>
            <h1 className="text-sm font-bold text-white">XDIGIX Shipping</h1>
            <p className="text-xs text-gray-500">Track your shipment</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-8">
        {/* Search box */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Track Your Shipment</h2>
          <p className="text-gray-400 text-sm">Enter your tracking number to see the latest status</p>
        </div>

        <form onSubmit={track} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. XDG260316001234"
            className="flex-1 bg-[#1a1b3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 font-mono placeholder:font-sans placeholder:text-gray-600 transition-colors"
          />
          <button type="submit" disabled={state === 'loading'}
            className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl text-sm hover:bg-amber-400 disabled:opacity-60 transition-colors whitespace-nowrap">
            {state === 'loading' ? '…' : 'Track'}
          </button>
        </form>

        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Looking up your shipment…</p>
          </div>
        )}

        {/* Not found */}
        {state === 'notfound' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <h3 className="text-base font-bold text-white mb-1">Tracking number not found</h3>
            <p className="text-sm text-gray-400">Please check the number and try again. Make sure you're entering it exactly as provided.</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-400">An error occurred. Please try again later.</p>
          </div>
        )}

        {/* Found */}
        {state === 'found' && shipment && (
          <div className="space-y-5">
            {/* Status card */}
            <div className={`rounded-2xl p-6 border ${isDelivered ? 'bg-emerald-500/10 border-emerald-500/30' : isFailed ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-center gap-4">
                <div className="text-4xl">{STATUS_ICONS[shipment.status] ?? '📦'}</div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Current Status</p>
                  <h3 className={`text-xl font-bold ${isDelivered ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-amber-400'}`}>
                    {STATUS_LABELS[shipment.status] ?? shipment.status}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{shipment.trackingNumber}</p>
                </div>
              </div>

              {/* Progress bar (only for active deliveries) */}
              {!isFailed && (
                <div className="mt-5">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isDelivered ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Order Placed</span>
                    <span className="text-xs text-gray-500">{isDelivered ? 'Delivered ✓' : 'Delivered'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Recipient',    value: shipment.recipientName },
                { label: 'Weight',       value: `${shipment.weight}kg` },
                { label: 'Type',         value: shipment.shipmentType.replace(/_/g,' '), capitalize: true },
                { label: 'Created',      value: formatDateTime(shipment.createdAt) },
                { label: 'Delivered',    value: formatDateTime(shipment.deliveredAt) },
                { label: 'Attempts',     value: `${shipment.deliveryAttempts} / ${shipment.maxAttempts}` },
              ].map(f => (
                <div key={f.label} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                  <p className={`text-sm font-medium text-white leading-snug ${f.capitalize ? 'capitalize' : ''}`}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Address */}
            <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1.5">Delivery Address</p>
              <p className="text-sm text-white">{shipment.recipientAddress}</p>
            </div>

            {/* Timeline */}
            <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Tracking History</h3>
              </div>
              <div className="p-5">
                {events.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No tracking events yet</p>
                ) : (
                  <div className="space-y-0">
                    {[...events].reverse().map((e, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${i === 0 ? 'bg-amber-400 shadow-lg shadow-amber-400/30' : 'bg-white/20'}`} />
                          {i < events.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" style={{ minHeight: 20 }} />}
                        </div>
                        <div className="pb-5">
                          <p className={`text-sm font-semibold ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                            {STATUS_LABELS[e.eventType.toLowerCase().replace(/[^a-z_]/g,'')] ?? e.eventType.replace(/_/g,' ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-600">{formatDateTime(e.timestamp)}</p>
                            {e.location && <span className="text-xs text-gray-600">· {e.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Help section */}
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-400 mb-2">Need help with your shipment?</p>
              <p className="text-xs text-gray-500">Contact us with your tracking number: <span className="text-amber-400 font-mono">{shipment.trackingNumber}</span></p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-gray-600">© 2026 XDIGIX Shipping Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
