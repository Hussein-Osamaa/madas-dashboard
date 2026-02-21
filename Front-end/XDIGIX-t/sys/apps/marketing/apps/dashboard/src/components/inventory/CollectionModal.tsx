import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Collection,
  CollectionDraft,
  CollectionRules,
  CollectionStatus,
  CollectionType
} from '../../services/collectionsService';
import { Product } from '../../services/productsService';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CollectionDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
  deleting?: boolean;
  initialValue?: Collection | null;
  products: Product[];
};

type RulesState = {
  productType?: string;
  minPrice?: string;
  maxPrice?: string;
  stockStatus?: string;
  tags?: string;
  vendor?: string;
  dateAdded?: string;
  salesPerformance?: string;
};

const STATUS_OPTIONS: CollectionStatus[] = ['active', 'draft', 'archived'];
const TYPE_OPTIONS: Array<{ value: CollectionType; label: string; description: string }> = [
  {
    value: 'manual',
    label: 'Manual collection',
    description: 'Choose specific products to include.'
  },
  {
    value: 'smart',
    label: 'Smart collection',
    description: 'Automatically include products that match these rules.'
  }
];

const defaultRulesState: RulesState = {};

const CollectionModal = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  submitting,
  deleting,
  initialValue,
  products
}: Props) => {
  const initialDraft = useMemo<CollectionDraft>(() => {
    if (!initialValue) {
      return {
        name: '',
        description: '',
        status: 'draft',
        type: 'manual',
        productIds: [],
        productCount: 0,
        rules: {}
      };
    }

    return {
      id: initialValue.id,
      name: initialValue.name,
      description: initialValue.description ?? '',
      status: initialValue.status,
      type: initialValue.type,
      productIds: initialValue.productIds ?? [],
      productCount: initialValue.productCount ?? initialValue.productIds?.length ?? 0,
      rules: initialValue.rules ?? {}
    };
  }, [initialValue]);

  const [name, setName] = useState(initialDraft.name);
  const [description, setDescription] = useState(initialDraft.description ?? '');
  const [status, setStatus] = useState<CollectionStatus>(initialDraft.status ?? 'draft');
  const [type, setType] = useState<CollectionType>(initialDraft.type ?? 'manual');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialDraft.productIds ?? []));
  const [rules, setRules] = useState<RulesState>(() => ({
    productType: initialDraft.rules?.productType,
    minPrice: initialDraft.rules?.minPrice?.toString() ?? '',
    maxPrice: initialDraft.rules?.maxPrice?.toString() ?? '',
    stockStatus: initialDraft.rules?.stockStatus,
    tags: initialDraft.rules?.tags,
    vendor: initialDraft.rules?.vendor,
    dateAdded: initialDraft.rules?.dateAdded,
    salesPerformance: initialDraft.rules?.salesPerformance
  }));
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialDraft.name);
    setDescription(initialDraft.description ?? '');
    setStatus(initialDraft.status ?? 'draft');
    setType(initialDraft.type ?? 'manual');
    setSelected(new Set(initialDraft.productIds ?? []));
    setRules({
      productType: initialDraft.rules?.productType,
      minPrice: initialDraft.rules?.minPrice?.toString() ?? '',
      maxPrice: initialDraft.rules?.maxPrice?.toString() ?? '',
      stockStatus: initialDraft.rules?.stockStatus,
      tags: initialDraft.rules?.tags,
      vendor: initialDraft.rules?.vendor,
      dateAdded: initialDraft.rules?.dateAdded,
      salesPerformance: initialDraft.rules?.salesPerformance
    });
    setProductSearchTerm('');
    setError(null);
  }, [initialDraft]);

  const filteredProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const haystacks = [
        product.name,
        product.description,
        product.sku,
        product.barcode,
        product.id
      ];
      return haystacks.some((value) => value && value.toLowerCase().includes(term));
    });
  }, [productSearchTerm, products]);

  const toggleProduct = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleRuleChange = (field: keyof RulesState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRules((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Collection name is required.');
      return;
    }

    if (type === 'manual' && selected.size === 0) {
      setError('Select at least one product for a manual collection.');
      return;
    }

    const buildRules = (): CollectionRules | undefined => {
      if (type !== 'smart') {
        return undefined;
      }
      const next: CollectionRules = {
        productType: rules.productType?.trim() || undefined,
        stockStatus: rules.stockStatus?.trim() || undefined,
        tags: rules.tags?.trim() || undefined,
        vendor: rules.vendor?.trim() || undefined,
        dateAdded: rules.dateAdded?.trim() || undefined,
        salesPerformance: rules.salesPerformance?.trim() || undefined
      };

      const minPrice = Number(rules.minPrice);
      const maxPrice = Number(rules.maxPrice);

      if (!Number.isNaN(minPrice) && rules.minPrice && rules.minPrice.trim() !== '') {
        next.minPrice = minPrice;
      }
      if (!Number.isNaN(maxPrice) && rules.maxPrice && rules.maxPrice.trim() !== '') {
        next.maxPrice = maxPrice;
      }

      return Object.keys(next).length > 0 ? next : undefined;
    };

    const payload: CollectionDraft = {
      id: initialDraft.id,
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      type
    };

    if (type === 'manual') {
      const productIds = Array.from(selected);
      payload.productIds = productIds;
      payload.productCount = productIds.length;
      payload.rules = undefined;
    } else {
      payload.productIds = undefined;
      payload.productCount = undefined;
      payload.rules = buildRules();
    }

    try {
      await onSubmit(payload);
      setError(null);
    } catch (submitError) {
      console.error('[CollectionModal] Failed to submit collection', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to save collection.');
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl flex flex-col rounded-2xl border border-gray-100 bg-white shadow-card">
        <header className="flex-shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {initialDraft.id ? 'Edit Collection' : 'Create Collection'}
            </h2>
            <p className="text-xs text-madas-text/60">
              Group products by theme or automation rules to power your storefront.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 transition-colors hover:bg-base"
            onClick={handleClose}
            disabled={submitting}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <form id="collection-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Collection name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Summer essentials"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Collection status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as CollectionStatus)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-2 text-sm text-madas-text/80">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[120px] rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Describe this collection to your staff and storefront"
              />
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Collection type</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer flex-col gap-2 rounded-xl border border-gray-200 p-4 transition-all hover:border-accent"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="collection-type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={(event) => setType(event.target.value as CollectionType)}
                      className="text-primary focus:ring-accent"
                    />
                    <div>
                      <p className="text-sm font-semibold text-primary">{option.label}</p>
                      <p className="text-xs text-madas-text/60">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {type === 'manual' ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-primary">Select products</h3>
                  <p className="text-xs text-madas-text/60">
                    Choose specific products to include in this collection.
                  </p>
                </div>
                <input
                  type="search"
                  value={productSearchTerm}
                  onChange={(event) => setProductSearchTerm(event.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent sm:w-64"
                />
              </div>

              <div className="rounded-xl border border-gray-100">
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-sm text-madas-text/60">No products match this search.</div>
                  ) : (
                    filteredProducts.map((product) => {
                      const checked = selected.has(product.id);
                      return (
                        <label
                          key={product.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-base/60"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-primary">{product.name || 'Unnamed product'}</span>
                            <span className="text-xs text-madas-text/60">SKU: {product.sku || 'N/A'}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(product.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-madas-text/60">
                <span className="rounded-full bg-base px-3 py-1">
                  {selected.size} product{selected.size === 1 ? '' : 's'} selected
                </span>
                {selected.size > 0 && (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-primary">Smart collection rules</h3>
                <p className="text-xs text-madas-text/60">
                  Products that match all selected criteria will be added automatically.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Product type
                  <input
                    type="text"
                    value={rules.productType ?? ''}
                    onChange={handleRuleChange('productType')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. electronics"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Stock status
                  <select
                    value={rules.stockStatus ?? ''}
                    onChange={handleRuleChange('stockStatus')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Any</option>
                    <option value="in-stock">In stock</option>
                    <option value="low-stock">Low stock</option>
                    <option value="out-of-stock">Out of stock</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Minimum price
                  <input
                    type="number"
                    min="0"
                    value={rules.minPrice ?? ''}
                    onChange={handleRuleChange('minPrice')}
                    placeholder="0.00"
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Maximum price
                  <input
                    type="number"
                    min="0"
                    value={rules.maxPrice ?? ''}
                    onChange={handleRuleChange('maxPrice')}
                    placeholder="0.00"
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-2 text-sm text-madas-text/80">
                  Product tags
                  <input
                    type="text"
                    value={rules.tags ?? ''}
                    onChange={handleRuleChange('tags')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Comma separated tags"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Vendor / brand
                  <input
                    type="text"
                    value={rules.vendor ?? ''}
                    onChange={handleRuleChange('vendor')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Vendor name"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Date added
                  <select
                    value={rules.dateAdded ?? ''}
                    onChange={handleRuleChange('dateAdded')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Any time</option>
                    <option value="last-7-days">Last 7 days</option>
                    <option value="last-30-days">Last 30 days</option>
                    <option value="last-3-months">Last 3 months</option>
                    <option value="this-year">This year</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-madas-text/80">
                  Sales performance
                  <select
                    value={rules.salesPerformance ?? ''}
                    onChange={handleRuleChange('salesPerformance')}
                    className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Any performance</option>
                    <option value="bestsellers">Bestsellers (top 20%)</option>
                    <option value="slow-moving">Slow moving</option>
                    <option value="no-sales">No sales</option>
                    <option value="high-rating">High rating (4+ stars)</option>
                  </select>
                </label>
              </div>
            </section>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <footer className="flex-shrink-0 flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                {initialDraft.id && onDelete ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                onClick={() => onDelete()}
                disabled={deleting || submitting}
              >
                {deleting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">delete</span>
                    Delete
                  </>
                )}
              </button>
            ) : null}
            <div className="flex flex-1 justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
              form="collection-form"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">{initialDraft.id ? 'save' : 'add'}</span>
                    {initialDraft.id ? 'Save changes' : 'Create collection'}
                  </>
                )}
              </button>
            </div>
          </footer>
      </div>
    </div>
  );
};

export default CollectionModal;

