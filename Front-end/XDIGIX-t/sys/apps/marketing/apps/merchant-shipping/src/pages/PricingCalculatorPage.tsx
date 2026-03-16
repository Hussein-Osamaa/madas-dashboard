import { useState, useEffect } from 'react';
import { Calculator, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface PriceBreakdown { basePrice:number; weightFee:number; volumetricWeight:number; chargeableWeight:number; zoneFee:number; remoteAreaFee:number; slaFee:number; codFee:number; packagingFee:number; insuranceFee:number; fuelSurcharge:number; total:number; currency:string; merchantReceives:number; }
interface SLA  { _id:string; name:string; price:number; }
interface Zone { _id:string; zoneName:string; extraFee:number; isRemote:boolean; }
interface City { _id:string; name:string; }

export default function PricingCalculatorPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [zones,  setZones]  = useState<Zone[]>([]);
  const [slas,   setSLAs]   = useState<SLA[]>([]);
  const [result, setResult] = useState<PriceBreakdown | null>(null);
  const [calc,   setCalc]   = useState(false);
  const [form,   setForm]   = useState({ weight:'', length:'', width:'', height:'', codAmount:'0', zoneId:'', slaId:'', cityId:'' });

  useEffect(() => {
    api.get('/shipping/geo/cities?countryCode=EG').then(d => setCities(d.cities ?? []));
    api.get('/shipping/pricing/sla-rules').then(d => setSLAs(d.rules ?? []));
  }, []);

  useEffect(() => {
    if (form.cityId) api.get(`/shipping/geo/zones?cityId=${form.cityId}`).then(d => setZones(d.zones ?? []));
  }, [form.cityId]);

  const calculate = async () => {
    if (!form.weight) return;
    setCalc(true);
    const d = await api.post('/shipping/pricing/calculate', {
      actualWeight: Number(form.weight),
      length: form.length ? Number(form.length) : undefined,
      width:  form.width  ? Number(form.width)  : undefined,
      height: form.height ? Number(form.height) : undefined,
      zoneId:    form.zoneId  || undefined,
      slaId:     form.slaId   || undefined,
      codAmount: Number(form.codAmount) || 0,
    });
    setResult(d.breakdown ?? null);
    setCalc(false);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Calculator className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Shipping Calculator</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
          {[
            { label:'Weight (kg)', k:'weight', placeholder:'1.5', type:'number' },
            { label:'Length (cm)', k:'length', placeholder:'30',  type:'number' },
            { label:'Width (cm)',  k:'width',  placeholder:'20',  type:'number' },
            { label:'Height (cm)', k:'height', placeholder:'15',  type:'number' },
            { label:'COD Amount (EGP)', k:'codAmount', placeholder:'0', type:'number' },
          ].map(f => (
            <div key={f.k}>
              <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.k as keyof typeof form]} onChange={set(f.k as keyof typeof form)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-400 block mb-1">City</label>
            <select value={form.cityId} onChange={set('cityId')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Any city</option>
              {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {zones.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Zone</label>
              <select value={form.zoneId} onChange={set('zoneId')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Any zone</option>
                {zones.map(z => <option key={z._id} value={z._id}>{z.zoneName}{z.isRemote ? ' (Remote +'+z.extraFee+')' : ''}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">SLA / Delivery Speed</label>
            <select value={form.slaId} onChange={set('slaId')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Standard (Next Day)</option>
              {slas.map(s => <option key={s._id} value={s._id}>{s.name} {s.price > 0 ? `(+${s.price} EGP)` : ''}</option>)}
            </select>
          </div>

          <button onClick={calculate} disabled={!form.weight || calc}
            className="w-full py-3 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
            {calc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {calc ? 'Calculating…' : 'Calculate Price'}
          </button>
        </div>

        {/* Result */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
          {!result ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Calculator className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Enter details to calculate</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white">Price Breakdown</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Base Price',      value: result.basePrice },
                  { label: 'Weight Fee',      value: result.weightFee },
                  { label: 'Zone Fee',        value: result.zoneFee },
                  { label: 'Remote Area Fee', value: result.remoteAreaFee },
                  { label: 'SLA Fee',         value: result.slaFee },
                  { label: 'COD Fee',         value: result.codFee },
                  { label: 'Packaging',       value: result.packagingFee },
                  { label: 'Insurance',       value: result.insuranceFee },
                  { label: 'Fuel Surcharge',  value: result.fuelSurcharge },
                ].map(r => (
                  <div key={r.label} className={`flex justify-between ${r.value === 0 ? 'opacity-40' : ''}`}>
                    <span className="text-gray-400">{r.label}</span>
                    <span className="text-white">{r.value > 0 ? `${r.value} EGP` : '—'}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between font-bold text-base">
                  <span className="text-white">Total Shipping Fee</span>
                  <span className="text-amber-400">{result.total} EGP</span>
                </div>
              </div>

              {result.chargeableWeight > 0 && (
                <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-400 space-y-1">
                  <p>Volumetric weight: <span className="text-white">{result.volumetricWeight}kg</span></p>
                  <p>Chargeable weight: <span className="text-white font-semibold">{result.chargeableWeight}kg</span></p>
                </div>
              )}

              {Number(form.codAmount) > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-gray-400">After collecting {Number(form.codAmount).toLocaleString()} EGP COD:</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{result.merchantReceives} EGP</p>
                  <p className="text-xs text-gray-500">Net amount you receive</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
