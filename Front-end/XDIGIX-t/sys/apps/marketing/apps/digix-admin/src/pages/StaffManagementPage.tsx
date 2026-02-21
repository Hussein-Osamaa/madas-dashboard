/**
 * Staff Management - Create and manage warehouse/staff users.
 * Roles and permissions via checkboxes; uses MongoDB Admin auth.
 */
import { useState, useEffect } from 'react';
import { UserPlus, RefreshCw, Pencil, Key, Power, PowerOff, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:4000/api';
const STAFF_ADMIN_KEY = 'staff_admin_token';
const STAFF_REFRESH_KEY = 'staff_admin_refresh';

async function getStaffToken(): Promise<string | null> {
  // 1. Try backend_access_token (from main admin sign-in - MongoDB)
  const backendToken = localStorage.getItem('backend_access_token');
  if (backendToken) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      });
      const data = await res.json();
      if (data?.user?.accountType === 'ADMIN') return backendToken;
    } catch {
      // fall through
    }
  }

  // 2. Try staff_admin_token (legacy)
  let t = localStorage.getItem(STAFF_ADMIN_KEY);
  if (t) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data?.user?.accountType === 'ADMIN') return t;
    } catch {
      // fall through
    }
  }

  // 3. Try refresh token
  const rt = localStorage.getItem(STAFF_REFRESH_KEY);
  if (!rt) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt, accountType: 'ADMIN' }),
    });
    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem(STAFF_ADMIN_KEY, data.accessToken);
      return data.accessToken;
    }
  } catch {
    localStorage.removeItem(STAFF_ADMIN_KEY);
    localStorage.removeItem(STAFF_REFRESH_KEY);
  }
  return null;
}

async function fetchStaffApi<T>(token: string, path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers as Record<string, string>) };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
  return json as T;
}

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
] as const;

const PERMISSIONS: { id: string; label: string; group: 'inventory' | 'audit' | 'orders' | 'reports' | 'admin' }[] = [
  { id: 'inventory_view', label: 'View inventory', group: 'inventory' },
  { id: 'inventory_edit', label: 'Edit products', group: 'inventory' },
  { id: 'inventory_adjust', label: 'Adjust stock (in/out)', group: 'inventory' },
  { id: 'audit_scan', label: 'Scan in audit', group: 'audit' },
  { id: 'audit_start_finish', label: 'Start / finish audit', group: 'audit' },
  { id: 'orders_view', label: 'View orders', group: 'orders' },
  { id: 'orders_fulfill', label: 'Fulfill orders', group: 'orders' },
  { id: 'orders_ship', label: 'Ship / update tracking', group: 'orders' },
  { id: 'reports_view', label: 'View reports', group: 'reports' },
  { id: 'staff_manage', label: 'Manage staff', group: 'admin' },
];

const APP_OPTIONS = ['WAREHOUSE', 'SHIPPING', 'ADMIN'] as const;

interface StaffMember {
  _id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  allowedApps: string[];
  permissions?: string[];
  active: boolean;
  createdAt: string;
}

const WAREHOUSE_URL = typeof window !== 'undefined' ? `${window.location.origin}/warehouse/` : '/warehouse/';

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({
    fullName: '',
    email: '',
    password: '',
    department: 'WAREHOUSE',
    role: 'staff',
    allowedApps: ['WAREHOUSE'] as string[],
    permissions: [] as string[],
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [editData, setEditData] = useState({
    fullName: '',
    department: 'WAREHOUSE',
    role: 'staff',
    allowedApps: [] as string[],
    permissions: [] as string[],
    active: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const token = await getStaffToken();
      if (cancelled) return;
      if (!token) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setStaffToken(token);
      setLoading(true);
      setError('');
      try {
        const res = await fetchStaffApi<{ staff: StaffMember[] }>(token, '/staff');
        if (cancelled) return;
        setStaff(res.staff || []);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        if (String((e as Error).message).includes('403') || String((e as Error).message).includes('401')) {
          setAccessDenied(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStaff = async () => {
    const token = staffToken ?? (await getStaffToken());
    if (!token) return;
    setError('');
    try {
      const res = await fetchStaffApi<{ staff: StaffMember[] }>(token, '/staff');
      setStaff(res.staff || []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = staffToken ?? (await getStaffToken());
    if (!token) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await fetchStaffApi(token, '/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...createData,
          permissions: createData.permissions,
        }),
      });
      setCreateData({ fullName: '', email: '', password: '', department: 'WAREHOUSE', role: 'staff', allowedApps: ['WAREHOUSE'], permissions: [] });
      setShowCreate(false);
      await loadStaff();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleApp = (app: string) => {
    setCreateData((d) => ({
      ...d,
      allowedApps: d.allowedApps.includes(app) ? d.allowedApps.filter((a) => a !== app) : [...d.allowedApps, app],
    }));
  };

  const toggleEditApp = (app: string) => {
    setEditData((d) => ({
      ...d,
      allowedApps: d.allowedApps.includes(app) ? d.allowedApps.filter((a) => a !== app) : [...d.allowedApps, app],
    }));
  };

  const toggleCreatePermission = (id: string) => {
    setCreateData((d) => ({
      ...d,
      permissions: d.permissions.includes(id) ? d.permissions.filter((p) => p !== id) : [...d.permissions, id],
    }));
  };

  const toggleEditPermission = (id: string) => {
    setEditData((d) => ({
      ...d,
      permissions: d.permissions.includes(id) ? d.permissions.filter((p) => p !== id) : [...d.permissions, id],
    }));
  };

  const openEdit = (s: StaffMember) => {
    setEditMember(s);
    setEditData({
      fullName: s.fullName,
      department: s.department,
      role: s.role || 'staff',
      allowedApps: s.allowedApps || [],
      permissions: s.permissions || [],
      active: s.active ?? true,
    });
    setEditError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    const token = staffToken ?? (await getStaffToken());
    if (!token) return;
    setEditLoading(true);
    setEditError('');
    try {
      await fetchStaffApi(token, `/staff/${editMember._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editData,
          permissions: editData.permissions,
        }),
      });
      setEditMember(null);
      await loadStaff();
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordId || !resetPassword) return;
    const token = staffToken ?? (await getStaffToken());
    if (!token) return;
    setResetLoading(true);
    setResetError('');
    try {
      await fetchStaffApi(token, `/staff/${resetPasswordId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPassword }),
      });
      setResetPasswordId(null);
      setResetPassword('');
    } catch (e) {
      setResetError((e as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleActive = async (s: StaffMember) => {
    const token = staffToken ?? (await getStaffToken());
    if (!token) return;
    try {
      await fetchStaffApi(token, `/staff/${s._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !s.active }),
      });
      await loadStaff();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (accessDenied) {
    return (
      <div className="px-6 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-white mb-2">Staff Management</h1>
        <p className="text-gray-400 mb-6">
          Create and manage warehouse staff. Staff log in at the{' '}
          <a href={WAREHOUSE_URL} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
            Warehouse Portal
          </a>
          .
        </p>
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <p>Unable to access staff management. Admin credentials are required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white mb-2">Staff Management</h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Create and manage warehouse staff. Assign roles and permissions with the checkboxes below. Staff log in at the{' '}
            <a href={WAREHOUSE_URL} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
              Warehouse Portal
            </a>
            .
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium shrink-0 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-[#1a1b3e] rounded-xl border border-white/10 max-w-lg w-full shadow-xl my-8">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create Staff</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {createError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={createData.fullName}
                  onChange={(e) => setCreateData((d) => ({ ...d, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData((d) => ({ ...d, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Password * (min 8 chars)</label>
                <input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData((d) => ({ ...d, password: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  minLength={8}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Department</label>
                  <select
                    value={createData.department}
                    onChange={(e) => setCreateData((d) => ({ ...d, department: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="SHIPPING">Shipping</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                  <select
                    value={createData.role}
                    onChange={(e) => setCreateData((d) => ({ ...d, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Allowed Apps</label>
                <div className="flex flex-wrap gap-4">
                  {APP_OPTIONS.map((app) => (
                    <label key={app} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createData.allowedApps.includes(app)}
                        onChange={() => toggleApp(app)}
                        className="rounded border-white/20 text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-sm text-gray-300">{app}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500/80" />
                  Permissions
                </label>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-4 max-h-48 overflow-y-auto">
                  {(['inventory', 'audit', 'orders', 'reports', 'admin'] as const).map((group) => {
                    const perms = PERMISSIONS.filter((p) => p.group === group);
                    if (perms.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {group === 'inventory' && 'Inventory'}
                          {group === 'audit' && 'Audit'}
                          {group === 'orders' && 'Orders'}
                          {group === 'reports' && 'Reports'}
                          {group === 'admin' && 'Admin'}
                        </p>
                        <div className="space-y-1.5">
                          {perms.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={createData.permissions.includes(p.id)}
                                onChange={() => toggleCreatePermission(p.id)}
                                className="rounded border-white/20 text-amber-500 focus:ring-amber-500/50"
                              />
                              <span className="text-sm text-gray-300">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50 transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 rounded-lg bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading staff...
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Department</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Role</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Apps</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Permissions</th>
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-4 px-5 text-gray-400 font-medium pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 px-6 text-center text-gray-500">
                      No staff yet. Click &quot;Add Staff&quot; to create one and grant warehouse portal access.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 text-white font-medium">{s.fullName}</td>
                      <td className="py-4 px-5 text-gray-300">{s.email}</td>
                      <td className="py-4 px-5 text-gray-300">{s.department}</td>
                      <td className="py-4 px-5 text-gray-300 capitalize">{s.role || 'staff'}</td>
                      <td className="py-4 px-5 text-gray-400">{s.allowedApps?.join(', ') || '—'}</td>
                      <td className="py-4 px-5">
                        {(s.permissions?.length ?? 0) > 0 ? (
                          <span className="text-gray-400" title={(s.permissions || []).join(', ')}>
                            {(s.permissions?.length ?? 0)} permission{(s.permissions?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${s.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}>
                          {s.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-5 pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setResetPasswordId(s._id); setResetPassword(''); setResetError(''); }}
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(s)}
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title={s.active ? 'Deactivate' : 'Activate'}
                          >
                            {s.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-[#1a1b3e] rounded-xl border border-white/10 max-w-lg w-full shadow-xl my-8">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Edit Staff</h2>
              <p className="text-sm text-gray-500 mt-0.5">{editMember.email}</p>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-5">
              {editError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editData.fullName}
                  onChange={(e) => setEditData((d) => ({ ...d, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Department</label>
                  <select
                    value={editData.department}
                    onChange={(e) => setEditData((d) => ({ ...d, department: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="SHIPPING">Shipping</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData((d) => ({ ...d, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Allowed Apps</label>
                <div className="flex flex-wrap gap-4">
                  {APP_OPTIONS.map((app) => (
                    <label key={app} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.allowedApps.includes(app)}
                        onChange={() => toggleEditApp(app)}
                        className="rounded border-white/20 text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-sm text-gray-300">{app}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500/80" />
                  Permissions
                </label>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-4 max-h-48 overflow-y-auto">
                  {(['inventory', 'audit', 'orders', 'reports', 'admin'] as const).map((group) => {
                    const perms = PERMISSIONS.filter((p) => p.group === group);
                    if (perms.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {group === 'inventory' && 'Inventory'}
                          {group === 'audit' && 'Audit'}
                          {group === 'orders' && 'Orders'}
                          {group === 'reports' && 'Reports'}
                          {group === 'admin' && 'Admin'}
                        </p>
                        <div className="space-y-1.5">
                          {perms.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editData.permissions.includes(p.id)}
                                onChange={() => toggleEditPermission(p.id)}
                                className="rounded border-white/20 text-amber-500 focus:ring-amber-500/50"
                              />
                              <span className="text-sm text-gray-300">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editData.active}
                  onChange={(e) => setEditData((d) => ({ ...d, active: e.target.checked }))}
                  className="rounded border-white/20 text-amber-500 focus:ring-amber-500/50"
                />
                <label htmlFor="edit-active" className="text-sm text-gray-400 cursor-pointer">Active (can log in)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50 transition-colors"
                >
                  {editLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-5 py-2.5 rounded-lg bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a1b3e] rounded-xl border border-white/10 max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">New password must be at least 8 characters.</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {resetError}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">New Password (min 8 chars)</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
                >
                  {resetLoading ? 'Resetting...' : 'Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetPasswordId(null); setResetPassword(''); }}
                  className="px-5 py-2.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
