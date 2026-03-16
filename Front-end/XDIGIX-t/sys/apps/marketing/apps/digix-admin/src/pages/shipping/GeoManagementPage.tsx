import { useEffect, useState } from 'react';
import { Globe, Plus, Pencil, Trash2, ChevronRight, X, Save } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Country { _id: string; code: string; name: string; currency: string; timezone: string; isActive: boolean; }
interface City    { _id: string; countryCode: string; name: string; nameAr?: string; isActive: boolean; }
interface Zone    { _id: string; cityId: string; zoneName: string; zoneCode?: string; isRemote: boolean; extraFee: number; deliverySLADays: number; isActive: boolean; }

type ModalState = { type: 'country'|'city'|'zone'; data?: Country|City|Zone } | null;

export default function GeoManagementPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities,    setCities]    = useState<City[]>([]);
  const [zones,     setZones]     = useState<Zone[]>([]);
  const [selCountry, setSelCountry] = useState<Country | null>(null);
  const [selCity,    setSelCity]    = useState<City | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm]   = useState<Record<string, unknown>>({});

  const load = async () => {
    const [c, ci] = await Promise.all([
      fetch(`${API}/api/shipping/geo/countries`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/api/shipping/geo/cities`,    { headers: headers() }).then(r => r.json()),
    ]);
    setCountries(c.countries ?? []);
    setCities(ci.cities ?? []);
  };

  const loadZones = async (cityId: string) => {
    const r = await fetch(`${API}/api/shipping/geo/zones?cityId=${cityId}`, { headers: headers() });
    const d = await r.json();
    setZones(d.zones ?? []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selCity) loadZones(selCity._id); }, [selCity]);

  const openModal = (type: 'country'|'city'|'zone', data?: Country|City|Zone) => {
    setModal({ type, data });
    setForm(data ? { ...data } : {});
  };

  const save = async () => {
    if (!modal) return;
    const { type, data } = modal;
    const url = `${API}/api/shipping/geo/${type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'zones'}${data ? `/${(data as {_id:string})._id}` : ''}`;
    const method = data ? 'PATCH' : 'POST';
    const r = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setModal(null);
    load();
    if (selCity) loadZones(selCity._id);
  };

  const del = async (type: 'country'|'city'|'zone', id: string) => {
    if (!confirm('Delete?')) return;
    const path = type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'zones';
    await fetch(`${API}/api/shipping/geo/${path}/${id}`, { method: 'DELETE', headers: headers() });
    load();
    if (selCity) loadZones(selCity._id);
  };

  const Field = ({ label, k, type='text' }: { label: string; k: string; type?: string }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input
        type={type}
        value={String(form[k] ?? '')}
        onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
      />
    </div>
  );

  const Check = ({ label, k }: { label: string; k: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={Boolean(form[k])} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} className="accent-amber-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Geographic Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Countries */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Countries</span>
            <button onClick={() => openModal('country')} className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {countries.map(c => (
              <div key={c._id} onClick={() => { setSelCountry(c); setSelCity(null); setZones([]); }}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${selCountry?._id === c._id ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}>
                <div>
                  <p className="text-sm text-white font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.code} · {c.currency}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); openModal('country', c); }} className="p-1 text-gray-500 hover:text-amber-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); del('country', c._id); }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cities */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Cities {selCountry ? `— ${selCountry.name}` : ''}</span>
            {selCountry && <button onClick={() => openModal('city')} className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20"><Plus className="w-4 h-4" /></button>}
          </div>
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {cities.filter(c => !selCountry || c.countryCode === selCountry.code).map(c => (
              <div key={c._id} onClick={() => setSelCity(c)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${selCity?._id === c._id ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}>
                <div>
                  <p className="text-sm text-white font-medium">{c.name}</p>
                  {c.nameAr && <p className="text-xs text-gray-500">{c.nameAr}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); openModal('city', c); }} className="p-1 text-gray-500 hover:text-amber-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); del('city', c._id); }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zones */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Zones {selCity ? `— ${selCity.name}` : ''}</span>
            {selCity && <button onClick={() => openModal('zone')} className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20"><Plus className="w-4 h-4" /></button>}
          </div>
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {zones.map(z => (
              <div key={z._id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                <div>
                  <p className="text-sm text-white font-medium">{z.zoneName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {z.isRemote && <span className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Remote</span>}
                    {z.extraFee > 0 && <span className="text-xs text-gray-500">+{z.extraFee} EGP</span>}
                    <span className="text-xs text-gray-500">{z.deliverySLADays}d SLA</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openModal('zone', z)} className="p-1 text-gray-500 hover:text-amber-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del('zone', z._id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white capitalize">{modal.data ? 'Edit' : 'Add'} {modal.type}</h2>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {modal.type === 'country' && (<>
                <Field label="Country Code (ISO)" k="code" />
                <Field label="Name" k="name" />
                <Field label="Currency" k="currency" />
                <Field label="Timezone" k="timezone" />
                <Check label="Active" k="isActive" />
              </>)}
              {modal.type === 'city' && (<>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Country</label>
                  <select value={String(form.countryCode ?? selCountry?.code ?? '')} onChange={e => setForm(f => ({...f, countryCode: e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <Field label="City Name (English)" k="name" />
                <Field label="City Name (Arabic)" k="nameAr" />
              </>)}
              {modal.type === 'zone' && (<>
                <input type="hidden" value={selCity?._id ?? ''} />
                {!form.cityId && setForm(f => ({...f, cityId: selCity?._id}))}
                <Field label="Zone Name" k="zoneName" />
                <Field label="Zone Code (optional)" k="zoneCode" />
                <Field label="Extra Fee (EGP)" k="extraFee" type="number" />
                <Field label="SLA Days" k="deliverySLADays" type="number" />
                <Check label="Remote Area" k="isRemote" />
              </>)}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10">Cancel</button>
              <button onClick={save} className="flex-1 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
