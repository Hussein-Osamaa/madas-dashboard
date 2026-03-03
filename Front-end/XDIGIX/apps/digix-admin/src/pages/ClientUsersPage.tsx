import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { apiGetList } from '../lib/api';

type UserWithClient = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  active?: boolean;
  clientId?: { _id: string; brandName?: string } | null;
};

export default function ClientUsersPage() {
  const [users, setUsers] = useState<UserWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetList<UserWithClient>('/api/users')
      .then((data) => {
        if (!cancelled) {
          setUsers(data.filter((u) => u.clientId != null));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Client Users</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No client users yet. Users linked to a client will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {typeof u.clientId === 'object' && u.clientId?.brandName
                      ? u.clientId.brandName
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{u.role || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                        u.active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {u.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
