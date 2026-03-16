import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, RefreshCw } from 'lucide-react';
import { api, getMerchantId } from '../lib/api';

interface Zone   { _id: string; zoneName: string; extraFee: number; isRemote: boolean; }
interface City   { _id: string; name: string; }
interface SLA    { _id: string; name: string; type: string; price: number; maxDeliveryHours: number; }
interface PriceBreakdown { basePrice: number; weightFee: number; zoneFee: number; slaFee: number; codFee: number; total: number; merchantReceives: number; currency: string; chargeableWeight: number; volumetricWeight: number; }

const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="text-xs text-gray-400 block mb-1">{label}</label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 transition-colors" />
);

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [zones,  setZones]  = useState<Zone[]>([]);
  const [slas,   setSLAs]   = useState<SLA[]>([]);
  const [pricing, setPricing] = useState<PriceBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalc] = useState(false);

  const [form, setForm] = useState({
    recipientName: '', recipientPhone: '', recipientPhone2: '', recipientEmail: '',
    recipientAddress: '', cityId: '', zoneId: '',
    weight: '', length: '', width: '', height: '',
    codAmount: '0', slaId: '', shipmentType: 'deliver',
    description: '', notes: '',
  });

  useEffect(() => {
    api.get('/shipping/geo/cities?countryCode=EG').then(d => setCities(d.cities ?? []));
    api.get('/shipping/pricing/sla-rules').then(d => setSLAs(d.rules ?? []));
  }, []);

  useEffect(() => {
    if (form.cityId) {
      api.get(`/shipping/geo/zones?cityId=${form.cityId}`).then(d => setZones(d.zones ?? []));
    }
  }, [form.cityId]);

  const calculatePrice = async () => {
    if (!form.weight) return;
    setCalc(true);
    try {
      const d = await api.post('/shipping/pricing/calculate', {
        actualWeight: Number(form.weight),
        length: form.length ? Number(form.length) : undefined,
        width:  form.width  ? Number(form.width)  : undefined,
        height: form.height ? Number(form.height) : undefined,
        zoneId:    form.zoneId   || undefined,
        slaId:     form.slaId    || undefined,
        codAmount: Number(form.codAmount) || 0,
      });
      setPricing(d.breakdown);
    } finally { setCalc(false); }
  };

  useEffect(() => {
    if (form.weight) { const t = setTimeout(calculatePrice, 600); return () => clearTimeout(t); }
  }, [form.weight, form.length, form.width, form.height, form.zoneId, form.slaId, form.codAmount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        merchantId: getMerchantId() || 'merchant-demo',
        weight:    Number(form.weight),
        length:    form.length ? Number(form.length) : undefined,
        width:     form.width  ? Number(form.width)  : undefined,
        height:    form.height ? Number(form.height) : undefined,
        codAmount: Number(form.codAmount) || 0,
      };
      const d = await api.post('/shipping/shipments', payload);
      if (d.shipment) navigate(`/orders/${d.shipment._id}`);
      else alert(d.error ?? 'Failed to create shipment');
    } finally { setLoading(false); }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Create Shipment</h1>
      </div>

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Recipient */}
            <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">Recipient Information</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name"><Input value={form.recipientName} onChange={set('recipientName')} placeholder="Ahmed Mohamed" required /></Field>
                <Field label="Phone" half><Input value={form.recipientPhone} onChange={set('recipientPhone')} placeholder="010XXXXXXXX" required /></Field>
                <Field label="Phone 2 (optional)" half><Input value={form.recipientPhone2} onChange={set('recipientPhone2')} placeholder="011XXXXXXXX" /></Field>
                <Field label="Email (for notifications, optional)"><Input type="email" value={form.recipientEmail} onChange={set('recipientEmail')} placeholder="customer@example.com" /></Field>
                <Field label="Full Address"><Input value={form.recipientAddress} onChange={set('recipientAddress')} placeholder="12 Tahrir Square, Apartment 3" required /></Field>
                <Field label="City" half>
                  <select value={form.cityId} onChange={set('cityId')} required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
                    <option value="">Select city…</option>
                    {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Zone / District" half>
                  <select value={form.zoneId} onChange={set('zoneId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white" disabled={!form.cityId}>
                    <option value="">Select zone…</option>
                    {zones.map(z => <option key={z._id} value={z._id}>{z.zoneName}{z.isRemote ? ' (Remote)' : ''}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* Package */}
            <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">Package Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Actual Weight (kg)" half><Input type="number" step="0.1" min="0.1" value={form.weight} onChange={set('weight')} placeholder="1.5" required /></Field>
                <Field label="Shipment Type" half>
                  <select value={form.shipmentType} onChange={set('shipmentType')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
                    <option value="deliver">Deliver</option>
                    <option value="exchange">Exchange</option>
                    <option value="return">Return</option>
                    <option value="cash_collection">Cash Collection</option>
                  </select>
                </Field>
                <Field label="Length (cm)" half><Input type="number" min="0" value={form.length} onChange={set('length')} placeholder="30" /></Field>
                <Field label="Width (cm)" half><Input type="number" min="0" value={form.width} onChange={set('width')} placeholder="20" /></Field>
                <Field label="Height (cm)" half><Input type="number" min="0" value={form.height} onChange={set('height')} placeholder="15" /></Field>
                <Field label="COD Amount (EGP)" half><Input type="number" min="0" value={form.codAmount} onChange={set('codAmount')} placeholder="500" /></Field>
                <Field label="SLA / Speed">
                  <select value={form.slaId} onChange={set('slaId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
                    <option value="">Standard (Next Day)</option>
                    {slas.map(s => <option key={s._id} value={s._id}>{s.name}{s.price > 0 ? ` (+${s.price} EGP)` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Description (optional)">
                  <Input value={form.description} onChange={set('description')} placeholder="Electronics, clothing, etc." />
                </Field>
              </div>
            </div>
          </div>

          {/* Right: Price Preview */}
          <div className="space-y-4">
            <div className="bg-[#1a1b3e]/80 border border-amber-500/20 rounded-xl p-5 space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-400">Price Preview</h2>
                {calculating && <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />}
              </div>

              {pricing ? (
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: 'Base Price',     value: pricing.basePrice },
                    { label: 'Weight Fee',     value: pricing.weightFee },
                    { label: 'Zone Fee',       value: pricing.zoneFee },
                    { label: 'SLA Fee',        value: pricing.slaFee },
                    { label: 'COD Fee',        value: pricing.codFee },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-gray-400">
                      <span>{r.label}</span>
                      <span className={r.value > 0 ? 'text-white' : 'text-gray-600'}>{r.value > 0 ? `${r.value} EGP` : '—'}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Fee</span>
                      <span className="text-amber-400">{pricing.total} EGP</span>
                    </div>
                  </div>
                  {Number(form.codAmount) > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-2">
                      <p className="text-xs text-gray-400">You receive after fees:</p>
                      <p className="text-lg font-bold text-emerald-400 mt-0.5">{pricing.merchantReceives} EGP</p>
                    </div>
                  )}
                  {pricing.volumetricWeight > 0 && (
                    <div className="bg-white/5 rounded-lg p-2 text-gray-500">
                      <p>Volumetric: {pricing.volumetricWeight}kg</p>
                      <p>Chargeable: {pricing.chargeableWeight}kg</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-500">Enter weight to see pricing</p>
                </div>
              )}

              <button type="submit" disabled={loading || !pricing}
                className="w-full py-3 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Creating…' : (<><span>Create Shipment</span><ArrowRight className="w-4 h-4" /></>)}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
