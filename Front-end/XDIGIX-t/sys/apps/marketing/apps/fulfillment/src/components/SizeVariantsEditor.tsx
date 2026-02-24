import { Plus, Trash2 } from 'lucide-react';

export type SizeVariant = { id: string; size: string; stock: number; barcode: string };

const PRESET_SIZES = ['S', 'M', 'L', 'XL'];

type Props = {
  variants: SizeVariant[];
  onVariantsChange: (variants: SizeVariant[]) => void;
  disabled?: boolean;
};

export function SizeVariantsEditor({ variants, onVariantsChange, disabled }: Props) {
  const update = (id: string, field: keyof SizeVariant, value: string | number) => {
    onVariantsChange(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const add = () => {
    onVariantsChange([...variants, { id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), size: '', stock: 0, barcode: '' }]);
  };

  const remove = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    onVariantsChange(next.length ? next : [{ id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), size: '', stock: 0, barcode: '' }]);
  };

  const addPreset = () => {
    const existing = new Set(variants.map((v) => v.size.trim().toLowerCase()).filter(Boolean));
    const toAdd = PRESET_SIZES.filter((s) => !existing.has(s.toLowerCase())).map((size) => ({
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      size,
      stock: 0,
      barcode: '',
    }));
    if (toAdd.length) onVariantsChange([...variants, ...toAdd]);
  };

  const filledVariants = variants.filter((v) => v.size.trim());
  const totalQty = filledVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Size variants
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addPreset}
            disabled={disabled}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            Quick add S, M, L, XL
          </button>
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add row
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_1fr_40px] gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>Size</span>
          <span>Qty</span>
          <span>Barcode (optional)</span>
          <span />
        </div>
        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
          {variants.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[1fr_80px_1fr_40px] gap-2 px-3 py-2 items-center"
            >
              <input
                type="text"
                placeholder="e.g. S, M, 32"
                value={v.size}
                onChange={(e) => update(v.id, 'size', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="number"
                min={0}
                value={v.stock === 0 ? '' : v.stock}
                onChange={(e) => update(v.id, 'stock', Math.max(0, Number(e.target.value) || 0))}
                disabled={disabled}
                className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                placeholder="Auto if empty"
                value={v.barcode}
                onChange={(e) => update(v.id, 'barcode', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => remove(v.id)}
                disabled={disabled || variants.length <= 1}
                className="p-1.5 rounded text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none"
                title="Remove row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {filledVariants.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filledVariants.length} size(s) · Total quantity: <strong>{totalQty}</strong>
        </p>
      )}
    </div>
  );
}

/** Build stock + sizeBarcodes from variant list for API payload */
export function buildStockPayloadFromVariants(variants: SizeVariant[]): {
  stock: Record<string, number>;
  sizeBarcodes: Record<string, string>;
} {
  const stock: Record<string, number> = {};
  const sizeBarcodes: Record<string, string> = {};
  const seenSizes = new Set<string>();
  for (const v of variants) {
    const sizeKey = v.size.trim();
    if (!sizeKey) continue;
    const normalized = sizeKey.toLowerCase();
    if (seenSizes.has(normalized)) continue;
    seenSizes.add(normalized);
    stock[sizeKey] = Math.max(0, Number(v.stock) || 0);
    if (String(v.barcode ?? '').trim()) sizeBarcodes[sizeKey] = String(v.barcode).trim();
  }
  return { stock, sizeBarcodes };
}

/** Normalize product from API so it always has stock and sizeBarcodes (plain objects). */
export function normalizeProductFromApi(
  p: Record<string, unknown> & { id?: string }
): Record<string, unknown> & { id?: string; stock: Record<string, number>; sizeBarcodes: Record<string, string> } {
  let stock: Record<string, number> =
    p.stock != null && typeof p.stock === 'object' && !Array.isArray(p.stock)
      ? (p.stock as Record<string, number>)
      : {};
  let sizeBarcodes: Record<string, string> =
    p.sizeBarcodes != null && typeof p.sizeBarcodes === 'object' && !Array.isArray(p.sizeBarcodes)
      ? (p.sizeBarcodes as Record<string, string>)
      : {};
  // Legacy: derive from sizeVariants if stock/sizeBarcodes empty
  if (Object.keys(stock).length === 0 && p.sizeVariants != null && typeof p.sizeVariants === 'object' && !Array.isArray(p.sizeVariants)) {
    const sv = p.sizeVariants as Record<string, { stock?: number; qty?: number; barcode?: string }>;
    stock = {};
    sizeBarcodes = {};
    for (const [k, v] of Object.entries(sv)) {
      if (k == null || String(k).includes('|')) continue;
      const qty = typeof v === 'object' && v != null ? (v.stock ?? v.qty) : undefined;
      const num = Math.max(0, Number(qty) || 0);
      stock[k] = num;
      if (typeof v === 'object' && v != null && typeof v.barcode === 'string') sizeBarcodes[k] = v.barcode;
    }
  }
  return { ...p, stock, sizeBarcodes } as Record<string, unknown> & {
    id?: string;
    stock: Record<string, number>;
    sizeBarcodes: Record<string, string>;
  };
}

/** Build variant list from product (for edit modal). Use normalizeProductFromApi first if product is from API. */
export function buildVariantsFromProduct(
  p: Record<string, unknown> & { id?: string }
): SizeVariant[] {
  const normalized = normalizeProductFromApi(p);
  const stock = normalized.stock;
  const sizeBarcodes = normalized.sizeBarcodes;
  const makeId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  if (Object.keys(stock).length === 0) {
    return [{ id: makeId(), size: '', stock: 0, barcode: '' }];
  }
  return Object.entries(stock)
    .filter(([k]) => k != null && !String(k).includes('|'))
    .map(([size, qty]) => ({
      id: makeId(),
      size,
      stock: Math.max(0, Number(qty) || 0),
      barcode: (typeof sizeBarcodes[size] === 'string' ? sizeBarcodes[size] : '') || '',
    }));
}

export const emptyVariant = (): SizeVariant => ({
  id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
  size: '',
  stock: 0,
  barcode: '',
});
