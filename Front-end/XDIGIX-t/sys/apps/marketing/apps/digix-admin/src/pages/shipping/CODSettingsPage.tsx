import { useEffect, useState } from 'react';
import { DollarSign, Save } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface CODRule { percentageFee: number; minimumFee: number; maximumFee: number; threshold: number; thresholdExtraPercent: number; enabled: boolean; currency: string; }

export default function CODSettingsPage() {
  const [rule, setRule]   = useState<CODRule | null>(null);
  const [form, setForm]   = useState<Partial<CODRule>>({});
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const r = await fetch(`${API}/api/shipping/pricing/cod-rules`, { headers: auth() });
    const d = await r.json();
    setRule(d.rule ?? null);
    setForm(d.rule ?? {});
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    await fetch(`${API}/api/shipping/pricing/cod-rules`, {
      method: 'PUT', headers: auth(), body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const Field = ({ label, k, desc }: { label: string; k: keyof CODRule; desc?: string }) => (
    <div className="bg-white/5 rounded-xl p-4 space-y-2">
      <label className="text-sm font-medium text-white block">{label}</label>
      {desc && <p className="text-xs text-gray-500">{desc}</p>}
      <input type="number" step="0.01" min="0"
        value={String(form[k] ?? '')}
        onChange={e => setForm(f => ({...f, [k]: Number(e.target.value)}))}
        className="w-full bg-[#0d0e26] border border-white/10 rounded-lg px-3 py-2.5 text-white text-lg font-bold outline-none focus:border-amber-500/50" />
    </div>
  );

  // Example calculation
  const exampleCOD = 1500;
  const exFee = rule ? Math.min(Math.max((exampleCOD * rule.percentageFee) / 100, rule.minimumFee), rule.maximumFee) : 0;
  const exMerchant = exampleCOD - exFee;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">COD Settings</h1>
      </div>

      <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Cash on Delivery Rules</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-400">Enabled</span>
            <div onClick={() => setForm(f => ({...f, enabled: !f.enabled}))}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.enabled ? 'bg-amber-500' : 'bg-gray-600'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.enabled ? 'left-7' : 'left-1'}`} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Percentage Fee (%)" k="percentageFee" desc="e.g. 1.5 = 1.5% of COD amount" />
          <Field label="Minimum Fee (EGP)"  k="minimumFee"    desc="Floor for the COD fee" />
          <Field label="Maximum Fee (EGP)"  k="maximumFee"    desc="Ceiling for the COD fee" />
          <Field label="Threshold (EGP)"    k="threshold"     desc="COD amounts above this incur extra %" />
          <Field label="Extra % Above Threshold" k="thresholdExtraPercent" desc="1% on amount exceeding threshold" />
        </div>

        <button onClick={save}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${saved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black hover:bg-amber-400'}`}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save COD Settings'}
        </button>
      </div>

      {/* Live preview */}
      {rule && (
        <div className="bg-[#1a1b3e]/80 border border-amber-500/20 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-amber-400">Example Calculation</h3>
          <p className="text-xs text-gray-500">For a COD order of {exampleCOD} EGP:</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'COD Amount', value: `${exampleCOD} EGP`, color: 'text-white' },
              { label: 'COD Fee',    value: `${exFee.toFixed(2)} EGP`, color: 'text-red-400' },
              { label: 'Merchant Gets', value: `${exMerchant.toFixed(2)} EGP`, color: 'text-emerald-400' },
            ].map(c => (
              <div key={c.label} className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
