import { useEffect, useState } from 'react';
import { Warehouse, Plus, Save, Trash2, X, ScanLine } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Bin { _id: string; warehouseId: string; binCode: string; zoneId?: string; description?: string; capacity: number; currentCount: number; isActive: boolean; }

export default function WarehouseBinsPage() {
  const [bins,    setBins]    = useState<Bin[]>([]);
  const [warehouseId, setWarehouseId] = useState('main-warehouse');
  const [modal,   setModal]   = useState<{ data?: Bin } | null>(null);
  const [form,    setForm]    = useState<Partial<Bin>>({});
  const [scanForm, setScanForm] = useState({ trackingNumber: '', binId: '', result: '' });
  const [showScan, setShowScan] = useState(false);

  const load = async () => {
    const r = await fetch(`${API}/api/shipping/warehouse-bins?warehouseId=${warehouseId}`, { headers: auth() });
    const d = await r.json();
    setBins(d.bins ?? []);
  };

  useEffect(() => { load(); }, [warehouseId]);

  const save = async () => {
    const payload = { ...form, warehouseId };
    const url = `${API}/api/shipping/warehouse-bins${form._id ? `/${form._id}` : ''}`;
    const r = await fetch(url, { method: form._id ? 'PATCH' : 'POST', headers: auth(), body: JSON.stringify(payload) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setModal(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete bin?')) return;
    await fetch(`${API}/api/shipping/warehouse-bins/${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  const scan = async () => {
    const r = await fetch(`${API}/api/shipping/warehouse-bins/scan`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ ...scanForm, warehouseId }),
    });
    const d = await r.json();
    setScanForm(f => ({...f, result: d.success ? `✓ Scanned into bin ${d.bin?.code}` : `✗ ${d.error}`}));
    if (d.success) load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Warehouse Bins</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowScan(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/20">
            <ScanLine className="w-4 h-4" />Scan Package
          </button>
          <button onClick={() => { setModal({}); setForm({}); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" />Add Bin
          </button>
        </div>
      </div>

      {/* Warehouse selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Warehouse ID:</label>
        <input value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-48 outline-none" />
      </div>

      {/* Scan panel */}
      {showScan && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-indigo-400">Scan Package into Bin</h3>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tracking Number</label>
              <input value={scanForm.trackingNumber} onChange={e => setScanForm(f => ({...f, trackingNumber: e.target.value.toUpperCase()}))}
                placeholder="XDG260316..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Bin</label>
              <select value={scanForm.binId} onChange={e => setScanForm(f => ({...f, binId: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Select bin…</option>
                {bins.map(b => <option key={b._id} value={b._id}>{b.binCode}</option>)}
              </select>
            </div>
            <button onClick={scan} disabled={!scanForm.trackingNumber || !scanForm.binId}
              className="py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-400 disabled:opacity-40">
              Scan
            </button>
          </div>
          {scanForm.result && (
            <p className={`text-sm font-medium ${scanForm.result.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{scanForm.result}</p>
          )}
        </div>
      )}

      {/* Bins grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {bins.map(b => {
          const usage = Math.round((b.currentCount / b.capacity) * 100);
          return (
            <div key={b._id} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-amber-400">{b.binCode}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setModal({ data: b }); setForm({...b}); }} className="p-1 text-gray-500 hover:text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => del(b._id)} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-center py-1">
                <p className="text-2xl font-bold text-white">{b.currentCount}</p>
                <p className="text-xs text-gray-500">of {b.capacity}</p>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usage > 80 ? 'bg-red-400' : usage > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(usage, 100)}%` }} />
              </div>
              <p className="text-xs text-center text-gray-500">{usage}% full</p>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{form._id ? 'Edit' : 'Add'} Bin</h2>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[['Bin Code','binCode','text'],['Description','description','text'],['Capacity','capacity','number']].map(([l,k,t]) => (
                <div key={String(k)}>
                  <label className="text-xs text-gray-400 block mb-1">{l}</label>
                  <input type={String(t)} value={String(form[k as keyof Bin] ?? '')}
                    onChange={e => setForm(f => ({...f, [k]: t === 'number' ? Number(e.target.value) : e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={save} className="flex-1 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
