import { useEffect, useState } from 'react';
import { Bike, Plus, Pencil, Trash2, X, Save, Star, MapPin } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface Courier {
  _id: string; name: string; phone: string; email?: string;
  courierType: 'company'|'freelancer'; vehicleType: string;
  maxWeightCapacity: number; rating: number; status: string;
  activeOrders: number; totalDeliveries: number; successRate: number; isActive: boolean;
}

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-400',
  busy:      'bg-amber-500/10 text-amber-400',
  offline:   'bg-gray-500/10 text-gray-400',
  suspended: 'bg-red-500/10 text-red-400',
};

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [filter,   setFilter]   = useState({ type: '', status: '' });
  const [modal,    setModal]    = useState<{ data?: Courier } | null>(null);
  const [form,     setForm]     = useState<Partial<Courier>>({});

  const load = async () => {
    const qs = new URLSearchParams();
    if (filter.type)   qs.set('type',   filter.type);
    if (filter.status) qs.set('status', filter.status);
    const r = await fetch(`${API}/api/shipping/couriers?${qs}`, { headers: auth() });
    const d = await r.json();
    setCouriers(d.couriers ?? []);
  };

  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    const url = `${API}/api/shipping/couriers${form._id ? `/${form._id}` : ''}`;
    const r = await fetch(url, { method: form._id ? 'PATCH' : 'POST', headers: auth(), body: JSON.stringify(form) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setModal(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Deactivate courier?')) return;
    await fetch(`${API}/api/shipping/couriers/${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  const Field = ({ label, k, type='text', options }: { label: string; k: keyof Courier; type?: string; options?: string[] }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {options ? (
        <select value={String(form[k] ?? '')} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={String(form[k] ?? '')}
          onChange={e => setForm(f => ({...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value}))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bike className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Couriers</h1>
          <span className="text-sm text-gray-500">{couriers.length} total</span>
        </div>
        <button onClick={() => { setModal({}); setForm({ courierType: 'company', vehicleType: 'motorcycle', status: 'offline', isActive: true, maxWeightCapacity: 20 }); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400">
          <Plus className="w-4 h-4" />Add Courier
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[['All Types',''],['Company','company'],['Freelancer','freelancer']].map(([l,v]) => (
          <button key={v} onClick={() => setFilter(f => ({...f, type: v}))}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter.type === v ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{l}</button>
        ))}
        <div className="w-px bg-white/10" />
        {[['All Status',''],['Available','available'],['Busy','busy'],['Offline','offline']].map(([l,v]) => (
          <button key={v} onClick={() => setFilter(f => ({...f, status: v}))}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter.status === v ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {couriers.map(c => (
          <div key={c._id} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                {c.name.slice(0,2).toUpperCase()}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] ?? 'bg-gray-500/10 text-gray-400'}`}>{c.status}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{c.name}</h3>
              <p className="text-xs text-gray-500">{c.phone}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{c.rating.toFixed(1)}</span>
              <span>{c.vehicleType}</span>
              <span className="text-xs text-gray-500 capitalize">{c.courierType}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="bg-white/5 rounded p-1.5 text-center">
                <p className="text-gray-500">Active</p>
                <p className="text-white font-semibold">{c.activeOrders}</p>
              </div>
              <div className="bg-white/5 rounded p-1.5 text-center">
                <p className="text-gray-500">Total</p>
                <p className="text-white font-semibold">{c.totalDeliveries}</p>
              </div>
              <div className="bg-white/5 rounded p-1.5 text-center">
                <p className="text-gray-500">Success</p>
                <p className="text-emerald-400 font-semibold">{c.successRate}%</p>
              </div>
            </div>
            <div className="flex gap-1 pt-1">
              <button onClick={() => { setModal({ data: c }); setForm({...c}); }}
                className="flex-1 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10 flex items-center justify-center gap-1">
                <Pencil className="w-3 h-3" />Edit
              </button>
              <button onClick={() => del(c._id)}
                className="py-1.5 px-3 bg-red-500/5 text-red-400 rounded-lg text-xs hover:bg-red-500/10">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{form._id ? 'Edit' : 'Add'} Courier</h2>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label="Name" k="name" /></div>
              <Field label="Phone" k="phone" />
              <Field label="Email" k="email" type="email" />
              <Field label="Type" k="courierType" options={['company','freelancer']} />
              <Field label="Vehicle" k="vehicleType" options={['motorcycle','car','van','truck']} />
              <Field label="Max Weight (kg)" k="maxWeightCapacity" type="number" />
              <Field label="Status" k="status" options={['available','busy','offline','suspended']} />
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
