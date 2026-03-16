import { useEffect, useState } from 'react';
import { Scale, Plus, Pencil, Trash2, Save, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface WeightBracket { _id: string; minWeight: number; maxWeight: number; extraPrice: number; label?: string; isActive: boolean; }
interface PricingConfig  { basePrice: number; volumetricDivisor: number; packagingFee: number; fuelSurchargePercent: number; insuranceFeePercent: number; currency: string; }

export default function WeightBracketsPage() {
  const [brackets, setBrackets] = useState<WeightBracket[]>([]);
  const [config,   setConfig]   = useState<PricingConfig | null>(null);
  const [editing,  setEditing]  = useState<WeightBracket | null>(null);
  const [form,     setForm]     = useState<Partial<WeightBracket>>({});
  const [configForm, setConfigForm] = useState<Partial<PricingConfig>>({});
  const [showNew, setShowNew]   = useState(false);
  const [newForm, setNewForm]   = useState<Partial<WeightBracket>>({});

  const load = async () => {
    const [b, c] = await Promise.all([
      fetch(`${API}/api/shipping/pricing/weight-brackets`, { headers: auth() }).then(r => r.json()),
      fetch(`${API}/api/shipping/pricing/config`,          { headers: auth() }).then(r => r.json()),
    ]);
    setBrackets(b.brackets ?? []);
    setConfig(c.config ?? null);
    setConfigForm(c.config ?? {});
  };

  useEffect(() => { load(); }, []);

  const saveBracket = async (id: string, data: Partial<WeightBracket>) => {
    await fetch(`${API}/api/shipping/pricing/weight-brackets/${id}`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify(data),
    });
    setEditing(null);
    load();
  };

  const addBracket = async () => {
    await fetch(`${API}/api/shipping/pricing/weight-brackets`, {
      method: 'POST', headers: auth(), body: JSON.stringify(newForm),
    });
    setShowNew(false);
    setNewForm({});
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete bracket?')) return;
    await fetch(`${API}/api/shipping/pricing/weight-brackets/${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  const saveConfig = async () => {
    await fetch(`${API}/api/shipping/pricing/config`, {
      method: 'PUT', headers: auth(), body: JSON.stringify(configForm),
    });
    load();
  };

  const NumField = ({ label, k, state, setter }: { label: string; k: string; state: Record<string, unknown>; setter: (v: Record<string, unknown>) => void }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input type="number" step="0.01" value={String(state[k] ?? '')}
        onChange={e => setter({ ...state, [k]: Number(e.target.value) })}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Weight Rules & Pricing Config</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Brackets */}
        <div className="lg:col-span-2 bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white">Weight Brackets</h2>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20">
              <Plus className="w-4 h-4" />Add Bracket
            </button>
          </div>

          {showNew && (
            <div className="px-5 py-4 bg-amber-500/5 border-b border-amber-500/20 grid grid-cols-4 gap-3 items-end">
              {[['Min (kg)','minWeight'],['Max (kg)','maxWeight'],['Extra Price (EGP)','extraPrice'],['Label','label']].map(([lbl, key]) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 block mb-1">{lbl}</label>
                  <input value={String(newForm[key as keyof typeof newForm] ?? '')}
                    onChange={e => setNewForm(f => ({...f, [key]: key !== 'label' ? Number(e.target.value) : e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
                </div>
              ))}
              <div className="flex gap-2 col-span-4">
                <button onClick={addBracket} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold">Save</button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {['Label','Min (kg)','Max (kg)','Extra Price','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {brackets.map(b => (
                <tr key={b._id} className="hover:bg-white/5">
                  {editing?._id === b._id ? (
                    <>
                      {(['label','minWeight','maxWeight','extraPrice'] as (keyof WeightBracket)[]).map(k => (
                        <td key={String(k)} className="px-5 py-2">
                          <input value={String(form[k] ?? '')}
                            onChange={e => setForm(f => ({...f, [k]: ['minWeight','maxWeight','extraPrice'].includes(String(k)) ? Number(e.target.value) : e.target.value}))}
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" />
                        </td>
                      ))}
                      <td className="px-5 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveBracket(b._id, form)} className="p-1.5 bg-amber-500/20 text-amber-400 rounded"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 bg-white/5 text-gray-400 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-gray-300">{b.label ?? '—'}</td>
                      <td className="px-5 py-3 text-white font-medium">{b.minWeight}</td>
                      <td className="px-5 py-3 text-white font-medium">{b.maxWeight === 999 ? '∞' : b.maxWeight}</td>
                      <td className="px-5 py-3"><span className="text-emerald-400 font-medium">+{b.extraPrice} EGP</span></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditing(b); setForm({...b}); }} className="p-1.5 text-gray-500 hover:text-amber-400"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => del(b._id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Config */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white">Pricing Configuration</h2>
          </div>
          <div className="p-5 space-y-4">
            <NumField label="Base Price (EGP)" k="basePrice" state={configForm as Record<string, unknown>} setter={v => setConfigForm(v as Partial<PricingConfig>)} />
            <NumField label="Volumetric Divisor" k="volumetricDivisor" state={configForm as Record<string, unknown>} setter={v => setConfigForm(v as Partial<PricingConfig>)} />
            <NumField label="Packaging Fee (EGP)" k="packagingFee" state={configForm as Record<string, unknown>} setter={v => setConfigForm(v as Partial<PricingConfig>)} />
            <NumField label="Fuel Surcharge (%)" k="fuelSurchargePercent" state={configForm as Record<string, unknown>} setter={v => setConfigForm(v as Partial<PricingConfig>)} />
            <NumField label="Insurance Fee (%)" k="insuranceFeePercent" state={configForm as Record<string, unknown>} setter={v => setConfigForm(v as Partial<PricingConfig>)} />
            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-3">
                Volumetric formula: L×W×H ÷ {configForm.volumetricDivisor ?? 5000}
              </p>
              <button onClick={saveConfig} className="w-full py-2.5 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />Save Config
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
