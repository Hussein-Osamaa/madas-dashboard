import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { apiGetList } from '../lib/api';

type Client = {
  _id: string;
  brandName: string;
  owner?: { name?: string; email?: string; phone?: string };
  subscriptionPlan?: string;
  active?: boolean;
};

export default function CustomersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetList<Client>('/api/clients')
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-yellow-500' : 'text-sky-500'}`} />
      </div>
    );
  }

  const cardBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const cardShadow = isDark ? '' : 'shadow-sm';
  const tableHeadBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const divide = isDark ? 'divide-white/5' : 'divide-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const textSub = isDark ? 'text-gray-500' : 'text-gray-500';

  const planClass = (plan: string | undefined) => {
    if (!plan) return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600';
    const accent = isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-100 text-sky-700';
    return plan === 'enterprise' ? accent : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600';
  };

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Customers</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : clients.length === 0 ? (
        <div className={`p-8 rounded-xl border ${cardBg} ${cardBorder} ${cardShadow} text-center ${textMuted}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No customers yet.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Brand</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Owner</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Contact</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Plan</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {clients.map((c) => (
                <tr key={c._id} className={rowHover}>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${textPrimary}`}>{c.brandName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={textPrimary}>{c.owner?.name ?? '—'}</span>
                    {c.owner?.email && (
                      <span className={`block text-sm ${textSub}`}>{c.owner.email}</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>{c.owner?.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${planClass(c.subscriptionPlan)}`}>
                      {c.subscriptionPlan ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                      c.active !== false
                        ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-100 text-sky-700'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {c.active !== false ? 'Active' : 'Inactive'}
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
