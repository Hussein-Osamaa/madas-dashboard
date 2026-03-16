import { useEffect, useState } from 'react';
import { Clock, Plus, Pencil, Trash2, Save, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface SLARule { _id: string; name: string; type: string; maxDeliveryHours: number; price: number; fallbackSLAId?: string; isActive: boolean; priority: number; }

const SLA_TYPES = ['same_day_super_fast','same_day','next_day','two_to_three_days','custom'];

export default function SLARulesPage() {
  const [rules, setRules] = useState<SLARule[]>([]);
  const [modal, setModal] = useState<{ data?: SLARule } | null>(null);
  const [form, setForm]   = useState<Partial<SLARule>>({});

  const load = async () => {
    const r = await fetch(`${API}/api/shipping/pricing/sla-rules`, { headers: auth() });
    const d = await r.json();
    setRules(d.rules ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const url = `${API}/api/shipping/pricing/sla-rules${form._id ? `/${form._id}` : ''}`;
    const method = form._id ? 'PATCH' : 'POST';
    const r = await fetch(url, { method, headers: auth(), body: JSON.stringify(form) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setModal(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete SLA rule?')) return;
    await fetch(`${API}/api/shipping/pricing/sla-rules/${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  const slaLabel: Record<string, { label: string; color: string }> = {
    same_day_super_fast: { label: 'Same Day Super Fast', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    same_day:            { label: 'Same Day',            color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    next_day:            { label: 'Next Day',            color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    two_to_three_days:   { label: '2–3 Days',            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    custom:              { label: 'Custom',              color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">SLA Rules</h1>
        </div>
        <button onClick={() => { setModal({}); setForm({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400">
          <Plus className="w-4 h-4" />Add SLA Rule
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map(r => {
          const meta = slaLabel[r.type] ?? slaLabel.custom;
          return (
            <div key={r._id} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${meta.color}`}>{meta.label}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setModal({ data: r }); setForm({ ...r }); }} className="p-1.5 text-gray-500 hover:text-amber-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(r._id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="text-base font-bold text-white">{r.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-gray-500">Max Hours</p>
                  <p className="text-white font-semibold text-base">{r.maxDeliveryHours}h</p>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-gray-500">Price</p>
                  <p className={`font-semibold text-base ${r.price === 0 ? 'text-gray-400' : 'text-emerald-400'}`}>
                    {r.price === 0 ? 'Included' : `+${r.price} EGP`}
                  </p>
                </div>
              </div>
              {r.fallbackSLAId && (
                <p className="text-xs text-gray-500">Fallback → {rules.find(x => x._id === r.fallbackSLAId)?.name ?? r.fallbackSLAId}</p>
              )}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                <span className="text-xs text-gray-400">{r.isActive ? 'Active' : 'Inactive'}</span>
                <span className="ml-auto text-xs text-gray-500">Priority {r.priority}</span>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{form._id ? 'Edit' : 'Add'} SLA Rule</h2>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[['Name','name','text'],['Max Delivery Hours','maxDeliveryHours','number'],['Price (EGP)','price','number'],['Priority','priority','number']].map(([l,k,t]) => (
                <div key={String(k)}>
                  <label className="text-xs text-gray-400 block mb-1">{l}</label>
                  <input type={String(t)} value={String(form[k as keyof SLARule] ?? '')}
                    onChange={e => setForm(f => ({...f, [k]: t === 'number' ? Number(e.target.value) : e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <select value={String(form.type ?? '')} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select type…</option>
                  {SLA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Fallback SLA</label>
                <select value={String(form.fallbackSLAId ?? '')} onChange={e => setForm(f => ({...f, fallbackSLAId: e.target.value || undefined}))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">None</option>
                  {rules.filter(r => r._id !== form._id).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.isActive ?? true)} onChange={e => setForm(f => ({...f, isActive: e.target.checked}))} className="accent-amber-500" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
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
