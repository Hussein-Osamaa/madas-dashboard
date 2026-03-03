import { Package, Truck, ClipboardList, QrCode } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <aside className="w-56 border-r border-white/10 p-4">
        <div className="text-lg font-semibold text-amber-400 mb-8">XDIGIX Fulfillment</div>
        <nav className="space-y-1 text-sm text-gray-400">
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white">
            <Package className="w-5 h-5" /> Orders
          </a>
          <a href="/pending" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <ClipboardList className="w-5 h-5" /> Pending
          </a>
          <a href="/ready" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <Package className="w-5 h-5" /> Ready for pickup
          </a>
          <a href="/shipping" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <Truck className="w-5 h-5" /> Shipping
          </a>
          <a href="/scan" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <QrCode className="w-5 h-5" /> Scan
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Fulfillment</h1>
        <p className="text-gray-400 mb-8">
          Fulfillment app placeholder. Connect to API (/api/orders, /api/scan-logs) and add order list, scan modal, status workflow.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Pending', value: '—', color: 'bg-amber-500/20 text-amber-400' },
            { label: 'Ready', value: '—', color: 'bg-blue-500/20 text-blue-400' },
            { label: 'Shipped', value: '—', color: 'bg-emerald-500/20 text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`p-4 rounded-xl ${color}`}>
              <div className="text-sm opacity-90">{label}</div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
