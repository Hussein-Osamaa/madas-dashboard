import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useClient } from '../contexts/ClientContext';
import { apiGetList, buildListPath } from '../lib/api';

type Product = {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity?: number;
  lowStockAlert?: number;
  sellingPrice?: number;
  clientId?: { _id: string; brandName?: string };
};

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

export default function LowStockPage() {
  const { theme } = useTheme();
  const { effectiveClientId } = useClient();
  const isDark = theme === 'dark';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { lowStock: 'true' };
    if (effectiveClientId) params.clientId = effectiveClientId;
    apiGetList<Product>(buildListPath('/api/products', params))
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load low stock items'))
      .finally(() => setLoading(false));
  }, [effectiveClientId]);

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
  const linkAccent = isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-sky-600 hover:text-sky-700';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Low Stock</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : products.length === 0 ? (
        <div className={`p-8 rounded-xl border ${cardBg} ${cardBorder} ${cardShadow} text-center ${textMuted}`}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No low stock items.</p>
          <Link to="/inventory/products" className={`mt-3 inline-block text-sm font-medium ${linkAccent}`}>
            View all products →
          </Link>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Product</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>SKU</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Quantity</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Alert at</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Price</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Brand</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {products.map((p) => (
                <tr key={p._id} className={rowHover}>
                  <td className="px-4 py-3">
                    <Link to="/inventory/products" className={`font-medium ${linkAccent}`}>
                      {p.name}
                    </Link>
                    {p.barcode && <span className={`block text-xs ${textSub}`}>Barcode: {p.barcode}</span>}
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>{p.sku || '—'}</td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{p.quantity ?? 0}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>{p.lowStockAlert ?? 5}</td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{formatMoney(p.sellingPrice ?? 0)}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>
                    {typeof p.clientId === 'object' && p.clientId?.brandName ? p.clientId.brandName : '—'}
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
