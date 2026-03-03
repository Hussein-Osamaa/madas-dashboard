import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Loader2, X } from 'lucide-react';
import { usePermissions, PERMISSIONS } from '../contexts/PermissionContext';
import { apiGetUsers, apiUpdateUser, apiRequest, type ApiUserManage } from '../lib/api';

const ALL_PERMISSIONS = [
  { key: PERMISSIONS.clientsRead, label: 'Clients (view)' },
  { key: PERMISSIONS.clientsWrite, label: 'Clients (edit)' },
  { key: PERMISSIONS.fulfillmentRead, label: 'Fulfillment' },
  { key: PERMISSIONS.financeRead, label: 'Finance' },
  { key: PERMISSIONS.shippingRead, label: 'Shipping' },
  { key: PERMISSIONS.usersRead, label: 'Users (view)' },
  { key: PERMISSIONS.usersWrite, label: 'Users (edit)' },
];

export default function UsersPage() {
  const { isAdmin } = usePermissions();
  const [users, setUsers] = useState<ApiUserManage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ApiUserManage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'staff' as 'admin' | 'staff', permissions: [] as string[] });
  const [editForm, setEditForm] = useState<{ role: string; active: boolean; permissions: string[] }>({ role: 'staff', active: true, permissions: [] });

  const load = () => {
    setLoading(true);
    setError(null);
    apiGetUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!addForm.name.trim() || !addForm.email.trim() || addForm.password.length < 6) {
      setFormError('Name, email and password (min 6 characters) are required.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest<{ success: boolean; data: ApiUserManage }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim().toLowerCase(),
          password: addForm.password,
          role: addForm.role,
          permissions: addForm.permissions,
        }),
      });
      setShowAdd(false);
      setAddForm({ name: '', email: '', password: '', role: 'staff', permissions: [] });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    setSaving(true);
    try {
      await apiUpdateUser(editing._id, {
        role: editForm.role as 'admin' | 'staff',
        active: editForm.active,
        permissions: editForm.permissions,
      });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (list: string[], key: string) =>
    list.includes(key) ? list.filter((p) => p !== key) : [...list, key];

  if (!isAdmin) {
    return (
      <div className="py-8">
        <p className="text-amber-400 font-medium">Admin only. You need admin role to manage staff and users.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Staff & Users</h1>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setFormError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 font-medium"
        >
          <Plus className="w-5 h-5" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No users yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Permissions</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.filter((u) => u.role !== 'client').map((u) => (
                <tr key={u._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs ${u.active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {(u.permissions || []).length ? (u.permissions || []).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(u);
                        setEditForm({ role: u.role, active: u.active !== false, permissions: u.permissions || [] });
                        setFormError(null);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#1a1b3e] border border-white/10 shadow-xl p-6">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add User</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password (min 6)</label>
                <input type="password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as 'admin' | 'staff' }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {addForm.role === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {ALL_PERMISSIONS.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" checked={addForm.permissions.includes(p.key)} onChange={() => setAddForm((f) => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))} className="rounded border-white/20" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-500 text-[#0a0b1a] font-semibold hover:bg-amber-400 disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#1a1b3e] border border-white/10 shadow-xl p-6">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit {editing.name || editing.email}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              {formError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-white/20" />
                  Active
                </label>
              </div>
              {editForm.role === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {ALL_PERMISSIONS.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" checked={editForm.permissions.includes(p.key)} onChange={() => setEditForm((f) => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))} className="rounded border-white/20" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-500 text-[#0a0b1a] font-semibold hover:bg-amber-400 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
