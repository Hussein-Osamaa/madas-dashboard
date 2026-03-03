import { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, X, Pencil } from 'lucide-react';
import { apiGetList, createClientWithOwner, updateClient, type ApiClient, type CreateClientWithOwnerBody } from '../lib/api';

const PLANS = ['starter', 'standard', 'premium', 'enterprise'] as const;

export default function ClientsPage() {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<ApiClient | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    brandName: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    subscriptionPlan: 'standard' as typeof PLANS[number],
    systemAccess: { dashboard: true, finance: true, fulfillment: true, shipping: false },
  });
  const [editForm, setEditForm] = useState<{ subscriptionPlan: string; active: boolean; systemAccess: { dashboard: boolean; finance: boolean; fulfillment: boolean; shipping: boolean } }>({
    subscriptionPlan: 'standard',
    active: true,
    systemAccess: { dashboard: true, finance: true, fulfillment: true, shipping: false },
  });

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetList<ApiClient>('/api/clients');
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const brandName = form.brandName.trim();
    const ownerEmail = form.ownerEmail.trim().toLowerCase();
    if (!brandName || !ownerEmail) {
      setFormError('Brand name and owner email are required.');
      return;
    }
    const body: CreateClientWithOwnerBody = {
      brandName,
      owner: {
        name: form.ownerName.trim() || undefined,
        email: ownerEmail,
      },
      subscriptionPlan: form.subscriptionPlan,
      systemAccess: form.systemAccess,
    };
    if (form.password) {
      if (form.password.length < 6) {
        setFormError('Password must be at least 6 characters for new accounts.');
        return;
      }
      body.password = form.password;
    }
    setCreating(true);
    try {
      await createClientWithOwner(body);
      setShowAddModal(false);
      setForm({ brandName: '', ownerName: '', ownerEmail: '', password: '', subscriptionPlan: 'standard', systemAccess: { dashboard: true, finance: true, fulfillment: true, shipping: false } });
      loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    setSaving(true);
    try {
      await updateClient(editing._id, {
        subscriptionPlan: editForm.subscriptionPlan as ApiClient['subscriptionPlan'],
        active: editForm.active,
        systemAccess: editForm.systemAccess,
      });
      setEditing(null);
      loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          type="button"
          onClick={() => { setShowAddModal(true); setFormError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 font-medium"
        >
          <Plus className="w-5 h-5" /> Add Client
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      ) : clients.length === 0 ? (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No clients yet. Add your first client to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Access</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {clients.map((c) => (
                <tr key={c._id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{c.brandName || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span>{c.owner?.name || '—'}</span>
                    {c.owner?.email && (
                      <span className="block text-sm text-gray-500">{c.owner.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.subscriptionPlan || 'standard'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.systemAccess?.dashboard && 'D '}
                    {c.systemAccess?.finance && 'F '}
                    {c.systemAccess?.fulfillment && 'Fl '}
                    {c.systemAccess?.shipping && 'S'}
                    {!c.systemAccess?.dashboard && !c.systemAccess?.finance && !c.systemAccess?.fulfillment && !c.systemAccess?.shipping && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                        c.active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {c.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => { setEditing(c); setEditForm({ subscriptionPlan: c.subscriptionPlan || 'standard', active: c.active !== false, systemAccess: { dashboard: c.systemAccess?.dashboard !== false, finance: c.systemAccess?.finance !== false, fulfillment: c.systemAccess?.fulfillment !== false, shipping: c.systemAccess?.shipping === true } }); setFormError(null); }} className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#1a1b3e] border border-white/10 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Client</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Brand name</label>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Acme Inc"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner name</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner email</label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50"
                  placeholder="owner@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subscription plan</label>
                <select value={form.subscriptionPlan} onChange={(e) => setForm((f) => ({ ...f, subscriptionPlan: e.target.value as typeof form.subscriptionPlan }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50">
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">System access</label>
                <div className="flex flex-wrap gap-4">
                  {(['dashboard', 'finance', 'fulfillment', 'shipping'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={form.systemAccess[k]} onChange={(e) => setForm((f) => ({ ...f, systemAccess: { ...f.systemAccess, [k]: e.target.checked } }))} className="rounded border-white/20" />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password <span className="text-gray-500">(if new account)</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Min 6 characters"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty if this email already has a user (e.g. super admin). They will be linked as owner.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {creating ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#1a1b3e] border border-white/10 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit {editing.brandName}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subscription plan</label>
                <select value={editForm.subscriptionPlan} onChange={(e) => setEditForm((f) => ({ ...f, subscriptionPlan: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">System access</label>
                <div className="flex flex-wrap gap-4">
                  {(['dashboard', 'finance', 'fulfillment', 'shipping'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={editForm.systemAccess[k]} onChange={(e) => setEditForm((f) => ({ ...f, systemAccess: { ...f.systemAccess, [k]: e.target.checked } }))} className="rounded border-white/20" />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-white/20" />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}