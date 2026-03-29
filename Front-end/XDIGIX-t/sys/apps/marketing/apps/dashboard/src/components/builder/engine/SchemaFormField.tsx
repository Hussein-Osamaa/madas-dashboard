// src/components/builder/engine/SchemaFormField.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FieldSchema } from '../../../types/engine';
import TextField from '../editors/shared/TextField';
import ColorField from '../editors/shared/ColorField';
import ImageField from '../editors/shared/ImageField';
import SelectField from '../editors/shared/SelectField';
import ToggleField from '../editors/shared/ToggleField';
import NumberField from '../editors/shared/NumberField';
import { useTheme, DEFAULT_COLOR_SCHEMES } from '../../../contexts/ThemeContext';
import { useCollections } from '../../../hooks/useCollections';
import { useBusiness } from '../../../contexts/BusinessContext';
import { fetchProducts } from '../../../services/productsService';

interface Props {
  fieldKey: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Update multiple fields at once (e.g. collection change also sets selectedProducts) */
  onBatchChange?: (updates: Record<string, unknown>) => void;
  /** All field values in the current form — used for showWhen evaluation */
  allValues: Record<string, unknown>;
  /** Context for image uploads */
  siteId?: string;
  businessId?: string;
}

/* ── Color Scheme visual picker ──────────────────────────────────────── */
const ColorSchemeSelect: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange, label }) => {
  const { theme } = useTheme();
  const schemes = theme.colorSchemes ?? DEFAULT_COLOR_SCHEMES;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = schemes.find(s => s.id === value) ?? schemes[0];

  return (
    <div className="space-y-1" ref={ref}>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors cursor-pointer"
      >
        {/* Color preview dots */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: active?.background ?? '#fff' }} />
          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: active?.text ?? '#000' }} />
          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: active?.solidButtonBg ?? '#000' }} />
        </div>
        <span className="flex-1 text-left text-[13px] text-[#374151] truncate">{active?.name ?? value}</span>
        <span className="material-icons text-sm text-[#9ca3af]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden z-50 relative">
          {schemes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${s.id === value ? 'bg-[#e8f0e6]' : ''}`}
            >
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: s.background }} />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: s.text }} />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: s.solidButtonBg }} />
              </div>
              <span className="text-[13px] text-[#374151] flex-1">{s.name}</span>
              {s.id === value && <span className="material-icons text-sm text-[#27491F]">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Link picker (pages, collections, custom URL) ─────────────────── */
const BUILTIN_PAGES = [
  { value: '/', label: 'Home' },
  { value: '/products', label: 'All Products' },
  { value: '/cart', label: 'Cart' },
  { value: '/favorites', label: 'Wishlist' },
  { value: '/account', label: 'Account' },
  { value: '/login', label: 'Sign In' },
  { value: '/register', label: 'Sign Up' },
];

const LinkPicker: React.FC<{ value: string; onChange: (v: string) => void; label: string; helpText?: string }> = ({ value, onChange, label, helpText }) => {
  const { businessId } = useBusiness();
  const { collections } = useCollections(businessId);
  const [mode, setMode] = useState<'page' | 'collection' | 'custom'>(() => {
    if (!value || BUILTIN_PAGES.some(p => p.value === value)) return 'page';
    if (value.startsWith('/products?collection=')) return 'collection';
    return 'custom';
  });

  const isPage = BUILTIN_PAGES.some(p => p.value === value);
  const collectionMatch = value?.match(/^\/products\?collection=(.+)$/);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {/* Mode tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(['page', 'collection', 'custom'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-[11px] font-medium transition-all border-r last:border-r-0 border-gray-200 ${
              mode === m ? 'bg-[#111827] text-white' : 'bg-white text-[#6b7280] hover:bg-gray-50'
            }`}
          >
            {m === 'page' ? 'Page' : m === 'collection' ? 'Collection' : 'Custom URL'}
          </button>
        ))}
      </div>

      {mode === 'page' && (
        <select
          value={isPage ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="">Select a page...</option>
          {BUILTIN_PAGES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      )}

      {mode === 'collection' && (
        <>
          {collections && collections.length > 0 ? (
            <select
              value={collectionMatch?.[1] || ''}
              onChange={(e) => onChange(e.target.value ? `/products?collection=${e.target.value}` : '/products')}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="">All products</option>
              {collections.map((col: any) => (
                <option key={col.id} value={col.id}>{col.name || col.title}</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2.5 text-sm border border-amber-200 rounded-lg bg-amber-50">
              <p className="text-amber-800 text-xs">No collections yet.</p>
              <a href="/dashboard/inventory/collections" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-700 hover:text-amber-900 underline">
                <span className="material-icons" style={{ fontSize: '14px' }}>add_circle_outline</span>
                Create collection
              </a>
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}

      {helpText && <p className="text-xs text-gray-400">{helpText}</p>}
    </div>
  );
};

/* ── Collection picker ──────────────────────────────────────────────── */
const CollectionSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onCollectionSelect?: (collection: any) => void;
  label: string;
  helpText?: string;
}> = ({ value, onChange, onCollectionSelect, label, helpText }) => {
  const { businessId } = useBusiness();
  const { collections, isLoading } = useCollections(businessId);

  if (isLoading) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
        <div className="px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">Loading collections...</div>
      </div>
    );
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
        <div className="px-3 py-2.5 text-sm border border-amber-200 rounded-lg bg-amber-50">
          <p className="text-amber-800 mb-1">No collections found</p>
          <p className="text-xs text-amber-600">Create collections in your inventory to display them here.</p>
          <a href="/dashboard/inventory/collections" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 underline">
            <span className="material-icons" style={{ fontSize: '14px' }}>add_circle_outline</span>
            Create collection
          </a>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colId = e.target.value;
    onChange(colId);
    if (onCollectionSelect) {
      const col = collections.find((c: any) => c.id === colId);
      onCollectionSelect(col || null);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <select
        value={value || ''}
        onChange={handleChange}
        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
      >
        <option value="">All products</option>
        {collections.map((col: any) => (
          <option key={col.id} value={col.id}>
            {col.name || col.title}
          </option>
        ))}
      </select>
      {helpText && <p className="text-xs text-gray-400">{helpText}</p>}
    </div>
  );
};

const SchemaFormField: React.FC<Props> = ({
  fieldKey,
  schema,
  value,
  onChange,
  onBatchChange,
  allValues,
  siteId: _siteId,
  businessId: _businessId,
}) => {
  const { businessId: ctxBusinessId } = useBusiness();
  const effectiveBusinessId = _businessId || ctxBusinessId;

  // When a collection is selected, fetch its products and update selectedProducts
  const handleCollectionSelect = useCallback(async (col: any) => {
    if (!col || !effectiveBusinessId || !onBatchChange) return;
    const productIds: string[] = col.productIds || [];
    if (productIds.length === 0) {
      // Collection has no products assigned
      onBatchChange({ collection: col.id, selectedProducts: [] });
      return;
    }
    try {
      const allProducts = await fetchProducts(effectiveBusinessId);
      const matched = allProducts
        .filter(p => productIds.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sellingPrice: p.sellingPrice,
          image: p.images?.[0] || '',
          images: p.images || [],
          category: p.category,
        }));
      onBatchChange({ collection: col.id, selectedProducts: matched });
    } catch (err) {
      console.error('[SchemaFormField] Failed to fetch products for collection:', err);
    }
  }, [effectiveBusinessId, onBatchChange]);

  // Conditional display
  if (schema.showWhen) {
    const watchValue = allValues[schema.showWhen.field];
    if (watchValue !== schema.showWhen.equals) return null;
  }

  const strVal = (value ?? schema.defaultValue ?? '') as string;
  const numVal = (value ?? schema.defaultValue ?? 0) as number;
  const boolVal = (value ?? schema.defaultValue ?? false) as boolean;

  // Special field: collection picker
  if (fieldKey === 'collection' && (schema.type === 'text' || schema.type === 'select')) {
    return (
      <CollectionSelect
        label={schema.label}
        value={strVal}
        onChange={(v) => {
          if (!v) {
            // Cleared collection — reset to defaults
            if (onBatchChange) {
              onBatchChange({ collection: '', selectedProducts: [] });
            } else {
              onChange(v);
            }
          }
        }}
        onCollectionSelect={handleCollectionSelect}
        helpText={schema.helpText}
      />
    );
  }

  switch (schema.type) {
    case 'text':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
        />
      );

    case 'textarea':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
          multiline
          rows={3}
        />
      );

    case 'url':
      return (
        <LinkPicker
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          helpText={schema.helpText}
        />
      );

    case 'icon':
      return (
        <div className="space-y-1">
          <TextField
            label={schema.label}
            value={strVal}
            onChange={(v) => onChange(v)}
            placeholder={schema.placeholder ?? 'material-icons name'}
            helperText={schema.helpText}
          />
          {strVal && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="material-icons text-gray-600 text-lg">{strVal}</span>
              <span className="text-xs text-gray-500">{strVal}</span>
            </div>
          )}
        </div>
      );

    case 'richtext':
      // Fall back to textarea — RichTextEditor can be wired here if needed
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          multiline
          rows={4}
          helperText={schema.helpText}
        />
      );

    case 'color':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
        />
      );

    case 'color-gradient':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          allowGradient
        />
      );

    case 'image':
      // ImageField does not accept an `accept` prop — omitted
      return (
        <ImageField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
        />
      );

    case 'number':
      // NumberField does not have helperText — omitted
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={(v) => onChange(v)}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          unit={schema.unit}
        />
      );

    case 'range':
      // NumberField does not have helperText — omitted
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={(v) => onChange(v)}
          min={schema.min ?? 0}
          max={schema.max ?? 100}
          step={schema.step ?? 1}
          unit={schema.unit}
          showSlider
        />
      );

    case 'select':
      // Use visual color scheme picker for color_scheme fields
      if (fieldKey === 'color_scheme') {
        return (
          <ColorSchemeSelect
            label={schema.label}
            value={String(value ?? schema.defaultValue ?? '')}
            onChange={(v) => onChange(v)}
          />
        );
      }
      return (
        <SelectField
          label={schema.label}
          value={String(value ?? schema.defaultValue ?? '')}
          onChange={(v) => onChange(v)}
          options={(schema.options ?? []).map(o => ({ value: String(o.value), label: o.label }))}
          helperText={schema.helpText}
        />
      );

    case 'toggle':
      return (
        <ToggleField
          label={schema.label}
          value={boolVal}
          onChange={(v) => onChange(v)}
          helperText={schema.helpText}
        />
      );

    case 'date':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{schema.label}</label>
          <input
            type="date"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {schema.helpText && <p className="text-xs text-gray-400">{schema.helpText}</p>}
        </div>
      );

    case 'header':
      return (
        <div className="pt-3 pb-1 border-t border-gray-200 mt-2">
          <h3 className="text-[13px] font-semibold text-[#111827]">{schema.label}</h3>
          {schema.helpText && <p className="text-[11px] text-[#9ca3af] mt-0.5">{schema.helpText}</p>}
        </div>
      );

    case 'button-group':
      return (
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-[#374151]">{schema.label}</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(schema.options ?? []).map((opt) => {
              const isActive = String(value ?? schema.defaultValue ?? '') === String(opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChange(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium transition-all border-r last:border-r-0 border-gray-200 ${
                    isActive
                      ? 'bg-[#111827] text-white'
                      : 'bg-white text-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {schema.helpText && <p className="text-[11px] text-[#9ca3af]">{schema.helpText}</p>}
        </div>
      );

    default:
      return (
        <div className="text-xs text-red-400 p-2 bg-red-50 rounded">
          Unknown field type: {(schema as { type: string }).type} ({fieldKey})
        </div>
      );
  }
};

export default React.memo(SchemaFormField);
