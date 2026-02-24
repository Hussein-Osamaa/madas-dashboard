/**
 * Full size variant system extracted from dashboard ProductModal.
 * Supports main barcode, size variants, and sub-variants (e.g. Size M → S/M/L sub-sizes).
 * Persists via stock (size and size|sub keys) and sizeBarcodes only (fulfillment API).
 */
import { Plus, Trash2 } from 'lucide-react';

/** Alphanumeric barcode (e.g. P + timestamp + random). */
export function generateBarcode(): string {
  return `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/** 12-digit numeric barcode for phone/scanner compatibility (EAN-style). */
export function generateNumericBarcode(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${random}`.padStart(12, '0').slice(0, 12);
}

export type SubVariant = {
  id: string;
  name: string;
  stock: number;
  barcode: string;
};

export type SizeVariantFull = {
  id: string;
  size: string;
  stock: number;
  barcode: string;
  subVariants?: SubVariant[];
};

const makeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Props = {
  variants: SizeVariantFull[];
  onVariantsChange: (variants: SizeVariantFull[]) => void;
  mainBarcode: string;
  onMainBarcodeChange?: (value: string) => void;
  disabled?: boolean;
};

export function SizeVariantsEditorFull({
  variants,
  onVariantsChange,
  mainBarcode,
  onMainBarcodeChange,
  disabled,
}: Props) {
  const handleVariantChange = (id: string, field: 'size' | 'stock' | 'barcode', value: string) => {
    onVariantsChange(
      variants.map((v) => {
        if (v.id !== id) return v;
        if (field === 'size') {
          const nextSize = value;
          const hasPrefix = !!mainBarcode && mainBarcode.length > 0 && v.barcode?.startsWith(`${mainBarcode}-`);
          const shouldReplace = !v.barcode || v.barcode === '' || hasPrefix;
          let nextBarcode = v.barcode ?? '';
          if (!nextSize && shouldReplace) nextBarcode = '';
          else if (nextSize && shouldReplace && mainBarcode) nextBarcode = `${mainBarcode}-${nextSize}`;
          return { ...v, size: nextSize, barcode: nextBarcode };
        }
        if (field === 'stock') return { ...v, stock: Math.max(0, Number(value) || 0) };
        return { ...v, barcode: value };
      })
    );
  };

  const handleAddVariant = () => {
    onVariantsChange([
      ...variants,
      {
        id: makeId(),
        size: '',
        stock: 0,
        barcode: mainBarcode ? `${mainBarcode}-VAR${variants.length + 1}` : '',
      },
    ]);
  };

  const handleRemoveVariant = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    onVariantsChange(next.length ? next : [emptyVariantFull()]);
  };

  const handleAddSubVariant = (variantId: string) => {
    onVariantsChange(
      variants.map((v) => {
        if (v.id !== variantId) return v;
        const subs = v.subVariants ?? [];
        return {
          ...v,
          subVariants: [
            ...subs,
            {
              id: makeId(),
              name: '',
              stock: 0,
              barcode: mainBarcode && v.size ? `${mainBarcode}-${v.size}-SUB${subs.length + 1}` : '',
            },
          ],
        };
      })
    );
  };

  const handleSubVariantChange = (
    variantId: string,
    subId: string,
    field: 'name' | 'stock' | 'barcode',
    value: string
  ) => {
    onVariantsChange(
      variants.map((v) => {
        if (v.id !== variantId || !v.subVariants) return v;
        return {
          ...v,
          subVariants: v.subVariants.map((s) => {
            if (s.id !== subId) return s;
            if (field === 'name') return { ...s, name: value };
            if (field === 'stock') return { ...s, stock: Math.max(0, Number(value) || 0) };
            return { ...s, barcode: value };
          }),
        };
      })
    );
  };

  const handleRemoveSubVariant = (variantId: string, subId: string) => {
    onVariantsChange(
      variants.map((v) => {
        if (v.id !== variantId) return v;
        const next = (v.subVariants ?? []).filter((s) => s.id !== subId);
        return { ...v, subVariants: next.length > 0 ? next : undefined };
      })
    );
  };

  const totalQty = variants.reduce((sum, v) => {
    if (v.subVariants?.length) return sum + v.subVariants.reduce((a, s) => a + s.stock, 0);
    return sum + (Number(v.stock) || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Size variants</h3>
        <div className="flex items-center gap-2">
          {onMainBarcodeChange && (
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-gray-500 dark:text-gray-400">Base barcode</label>
              <input
                type="text"
                value={mainBarcode}
                onChange={(e) => onMainBarcodeChange(e.target.value)}
                disabled={disabled}
                placeholder="Used for variant barcodes"
                className="w-36 sm:w-40 px-2 py-1.5 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm font-mono"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMainBarcodeChange(generateBarcode())}
                  disabled={disabled}
                  className="px-2 py-1.5 rounded border border-gray-300 dark:border-white/20 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
                  title="Generate alphanumeric barcode"
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => onMainBarcodeChange(generateNumericBarcode())}
                  disabled={disabled}
                  className="px-2 py-1.5 rounded border border-gray-300 dark:border-white/20 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
                  title="Generate 12-digit numeric barcode (scanner/phone friendly)"
                >
                  Generate (numeric)
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddVariant}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add variant
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto">
        {variants.map((variant) => {
          const hasSubs = variant.subVariants && variant.subVariants.length > 0;
          const subTotal = hasSubs ? variant.subVariants!.reduce((a, s) => a + s.stock, 0) : 0;
          return (
            <div
              key={variant.id}
              className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50/50 dark:bg-white/5"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,80px,1fr,auto] gap-2 items-center">
                  <input
                    type="text"
                    value={variant.size}
                    onChange={(e) => handleVariantChange(variant.id, 'size', e.target.value)}
                    placeholder="e.g. M, 32, Default"
                    disabled={disabled}
                    className="rounded-lg border border-gray-300 dark:border-white/10 px-3 py-2 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={hasSubs ? subTotal : variant.stock}
                      onChange={(e) => handleVariantChange(variant.id, 'stock', e.target.value)}
                      disabled={!!hasSubs || disabled}
                      className="w-full rounded-lg border border-gray-300 dark:border-white/10 px-3 py-2 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm disabled:opacity-60"
                    />
                    {hasSubs && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                        from subs
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={variant.barcode}
                    onChange={(e) => handleVariantChange(variant.id, 'barcode', e.target.value)}
                    placeholder={variant.size && mainBarcode ? `${mainBarcode}-${variant.size}` : 'Barcode'}
                    disabled={!!hasSubs || disabled}
                    className="rounded-lg border border-gray-300 dark:border-white/10 px-3 py-2 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm font-mono disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(variant.id)}
                    disabled={disabled || variants.length <= 1}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                    title="Remove variant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSubVariant(variant.id)}
                  disabled={disabled}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline self-start disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add sub-size
                </button>
              </div>

              {hasSubs && (
                <div className="border-t border-dashed border-gray-200 dark:border-white/10 bg-gray-100/50 dark:bg-black/20 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Sub-sizes ({variant.subVariants!.length})
                  </p>
                  {variant.subVariants!.map((sub) => (
                    <div
                      key={sub.id}
                      className="grid grid-cols-[1fr,70px,1fr,auto] gap-2 items-center pl-2"
                    >
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'name', e.target.value)}
                        placeholder="e.g. S, M, L"
                        disabled={disabled}
                        className="rounded border border-gray-300 dark:border-white/10 px-2.5 py-1.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={sub.stock}
                        onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'stock', e.target.value)}
                        disabled={disabled}
                        className="rounded border border-gray-300 dark:border-white/10 px-2.5 py-1.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={sub.barcode}
                        onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'barcode', e.target.value)}
                        placeholder="Barcode"
                        disabled={disabled}
                        className="rounded border border-gray-300 dark:border-white/10 px-2.5 py-1.5 text-sm font-mono bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubVariant(variant.id, sub.id)}
                        disabled={disabled}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Total quantity: <strong>{totalQty}</strong>
      </p>
    </div>
  );
}

/** Build stock + sizeBarcodes from full variant list (same shape as dashboard; API uses stock + sizeBarcodes only). */
export function buildStockPayloadFromVariantsFull(
  variants: SizeVariantFull[],
  mainBarcode: string
): { stock: Record<string, number>; sizeBarcodes: Record<string, string> } {
  const stock: Record<string, number> = {};
  const sizeBarcodes: Record<string, string> = {};
  for (const variant of variants) {
    if (!variant.size.trim()) continue;
    const fallback =
      mainBarcode && mainBarcode.length > 0 && variant.size
        ? `${mainBarcode}-${variant.size}`
        : '';
    const variantBarcode = variant.barcode?.trim() || fallback;

    if (variant.subVariants && variant.subVariants.length > 0) {
      for (const s of variant.subVariants) {
        if (!s.name.trim()) continue;
        const key = `${variant.size}|${s.name.trim()}`;
        stock[key] = Math.max(0, Number(s.stock) || 0);
        sizeBarcodes[key] =
          (s.barcode && s.barcode.trim()) || (mainBarcode ? `${mainBarcode}-${variant.size}-${s.name}` : '');
      }
    } else {
      stock[variant.size] = Math.max(0, Number(variant.stock) || 0);
      if (variantBarcode) sizeBarcodes[variant.size] = variantBarcode;
    }
  }
  return { stock, sizeBarcodes };
}

/** Build full variant list from product (stock + sizeBarcodes). Derives sub-variants from "size|sub" keys. */
export function buildVariantsFromProductFull(
  p: Record<string, unknown> & { id?: string },
  mainBarcode: string
): SizeVariantFull[] {
  const normalized = normalizeProductForFull(p);
  const stock = normalized.stock;
  const sizeBarcodes = normalized.sizeBarcodes;

  const parentToSubs = new Map<string, Array<{ name: string; stock: number; barcode: string }>>();
  const topLevelSizes = new Set<string>();

  for (const key of Object.keys(stock)) {
    const qty = Math.max(0, Number(stock[key]) || 0);
    if (key.includes('|')) {
      const [parent, subName] = key.split('|');
      if (parent && subName) {
        const list = parentToSubs.get(parent) ?? [];
        list.push({
          name: subName,
          stock: qty,
          barcode: sizeBarcodes[key] ?? (mainBarcode ? `${mainBarcode}-${parent}-${subName}` : ''),
        });
        parentToSubs.set(parent, list);
      }
    } else {
      topLevelSizes.add(key);
    }
  }

  const withSubs: SizeVariantFull[] = [];
  for (const [parentSize, subs] of parentToSubs) {
    withSubs.push({
      id: makeId(),
      size: parentSize,
      stock: subs.reduce((a, s) => a + s.stock, 0),
      barcode: sizeBarcodes[parentSize] ?? (mainBarcode ? `${mainBarcode}-${parentSize}` : ''),
      subVariants: subs.map((s) => ({
        id: makeId(),
        name: s.name,
        stock: s.stock,
        barcode: s.barcode,
      })),
    });
  }

  const withoutSubs: SizeVariantFull[] = [...topLevelSizes]
    .filter((size) => !parentToSubs.has(size))
    .map((size) => ({
      id: makeId(),
      size,
      stock: Math.max(0, Number(stock[size]) || 0),
      barcode: (typeof sizeBarcodes[size] === 'string' ? sizeBarcodes[size] : '') || (mainBarcode ? `${mainBarcode}-${size}` : ''),
    }));

  const result = [...withSubs, ...withoutSubs];
  return result.length ? result : [emptyVariantFull()];
}

function normalizeProductForFull(p: Record<string, unknown>): {
  stock: Record<string, number>;
  sizeBarcodes: Record<string, string>;
} {
  let stock: Record<string, number> =
    p.stock != null && typeof p.stock === 'object' && !Array.isArray(p.stock)
      ? (p.stock as Record<string, number>)
      : {};
  let sizeBarcodes: Record<string, string> =
    p.sizeBarcodes != null && typeof p.sizeBarcodes === 'object' && !Array.isArray(p.sizeBarcodes)
      ? (p.sizeBarcodes as Record<string, string>)
      : {};
  if (Object.keys(stock).length === 0 && p.sizeVariants != null && typeof p.sizeVariants === 'object') {
    const sv = p.sizeVariants as Record<string, { stock?: number; qty?: number; barcode?: string }>;
    stock = {};
    sizeBarcodes = {};
    for (const [k, v] of Object.entries(sv)) {
      if (!k || String(k).includes('|')) continue;
      const qty = typeof v === 'object' && v != null ? (v.stock ?? v.qty) : undefined;
      stock[k] = Math.max(0, Number(qty) || 0);
      if (typeof v === 'object' && v != null && typeof v.barcode === 'string') sizeBarcodes[k] = v.barcode;
    }
  }
  return { stock, sizeBarcodes };
}

export function emptyVariantFull(): SizeVariantFull {
  return {
    id: makeId(),
    size: '',
    stock: 0,
    barcode: '',
  };
}
