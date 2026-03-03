import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiGetList } from '../lib/api';

type UserRecord = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  active?: boolean;
  clientId?: { _id: string; brandName?: string };
};

export default function UsersPage() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetList<UserRecord>('/api/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="py-8">
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>You need admin access to view users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-yellow-500' : 'text-sky-500'}`} />
      </div>
    );
  }

  const cardBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const cardShadow = isDark ? '' : 'shadow-sm';
  const tableHeadBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const divide = isDark ? 'divide-white/5' : 'divide-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Users</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className={`p-8 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} ${cardShadow} text-center ${textMuted}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Name</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Email</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Role</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Brand</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {users.map((u) => (
                <tr key={u._id} className={rowHover}>
                  <td className={`px-4 py-3 font-medium ${textPrimary}`}>{u.name ?? '—'}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-100 text-sky-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>
                    {typeof u.clientId === 'object' && u.clientId?.brandName ? u.clientId.brandName : '—'}
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>{u.active !== false ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
