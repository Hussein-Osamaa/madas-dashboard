import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { apiGetOne } from '../lib/api';

type Product = {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity?: number;
  lowStockAlert?: number;
  sellingPrice?: number;
  costPrice?: number;
  active?: boolean;
  clientId?: { _id: string; brandName?: string };
  variants?: Array<{ size?: string; color?: string; sku?: string; barcode?: string; quantity?: number; sellingPrice?: number }>;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

export default function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    apiGetOne<Product>(`/api/products/${productId}`)
      .then(setProduct)
      .catch((err) => setError(err instanceof Error ? err.message : 'Product not found'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-yellow-500' : 'text-sky-500'}`} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Link to="/inventory/products" className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-sky-600 hover:text-sky-700'}`}>
          <ArrowLeft className="w-4 h-4" /> Back to products
        </Link>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error ?? 'Product not found'}</div>
      </div>
    );
  }

  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const linkClass = isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-sky-600 hover:text-sky-700';

  return (
    <div className="space-y-6">
      <Link to="/inventory/products" className={`inline-flex items-center gap-2 text-sm font-medium ${linkClass}`}>
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>
      <h1 className={`text-2xl font-bold ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>{product.name}</h1>
      <div className={`rounded-2xl border ${cardBg} p-6 space-y-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${textMuted}`}>SKU</p>
            <p className={textPrimary}>{product.sku ?? '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Barcode</p>
            <p className={textPrimary}>{product.barcode ?? '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Quantity</p>
            <p className={textPrimary}>{product.quantity ?? 0}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Low stock alert</p>
            <p className={textPrimary}>{product.lowStockAlert ?? 5}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Selling price</p>
            <p className={textPrimary}>{formatMoney(product.sellingPrice ?? 0)}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Cost price</p>
            <p className={textPrimary}>{formatMoney(product.costPrice ?? 0)}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Brand</p>
            <p className={textPrimary}>{typeof product.clientId === 'object' && product.clientId?.brandName ? product.clientId.brandName : '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${textMuted}`}>Status</p>
            <p className={textPrimary}>{product.active !== false ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        {product.variants && product.variants.length > 0 && (
          <div>
            <p className={`text-sm font-medium ${textMuted} mb-2`}>Variants</p>
            <ul className="space-y-2">
              {product.variants.map((v, i) => (
                <li key={i} className={`flex flex-wrap gap-2 text-sm ${textPrimary}`}>
                  {v.size && <span>Size: {v.size}</span>}
                  {v.color && <span>Color: {v.color}</span>}
                  {v.sku && <span>SKU: {v.sku}</span>}
                  {v.quantity != null && <span>Qty: {v.quantity}</span>}
                  {v.sellingPrice != null && <span>{formatMoney(v.sellingPrice)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
