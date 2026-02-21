import { useMemo, useState } from 'react';
import clsx from 'clsx';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import ProductModal, { ProductDraft } from '../../components/inventory/ProductModal';
import { useBusiness } from '../../contexts/BusinessContext';
import { useProducts } from '../../hooks/useProducts';
import { useWarehouses } from '../../hooks/useWarehouses';
import { Product } from '../../services/productsService';
import { useCurrency } from '../../hooks/useCurrency';

type StockStatus = 'low' | 'out';
type StatusFilter = 'all' | StockStatus;

type DerivedLowStock = Product & {
  totalStock: number;
  lowestStock: number;
  status: StockStatus;
  threshold: number;
};

const statusChipStyles: Record<StockStatus, string> = {
  low: 'bg-orange-100 text-orange-600',
  out: 'bg-red-100 text-red-600'
};

const statusLabels: Record<StockStatus, string> = {
  low: 'Low stock',
  out: 'Out of stock'
};

const LowStockPage = () => {
  const { businessId, permissions, loading } = useBusiness();
  const { formatCurrency } = useCurrency();
  const { warehouses } = useWarehouses(businessId);
  const {
    products,
    isLoading,
    updateProduct,
    deleteProduct,
    updating,
    deleting
  } = useProducts(businessId);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Bulk update state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkThreshold, setBulkThreshold] = useState<number>(10);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('product_update') || 
                  hasPermission('product_edit') || 
                  permissions?.product?.includes('update') ||
                  permissions?.product?.includes('edit') ||
                  permissions?.inventory?.includes('edit');

  const deriveStockValues = (product: Product): { total: number; lowest: number } => {
    const stockByLocation = product.stockByLocation ?? {};
    const stockVariants = product.stock ?? {};

    const values =
      Object.keys(stockByLocation).length > 0
        ? Object.values(stockByLocation)
        : Object.values(stockVariants);

    if (values.length === 0) {
      return { total: 0, lowest: 0 };
    }

    const total = values.reduce((sum, value) => sum + (value ?? 0), 0);
    const lowest = values.reduce((min, value) => Math.min(min, value ?? 0), Number.POSITIVE_INFINITY);

    return { total, lowest: lowest === Number.POSITIVE_INFINITY ? 0 : lowest };
  };

  const lowStockProducts = useMemo<DerivedLowStock[]>(() => {
    return products
      .map((product) => {
        const { total, lowest } = deriveStockValues(product);
        const threshold = product.lowStockAlert ?? 10;
        const status: StockStatus = total <= 0 ? 'out' : 'low';
        return {
          ...product,
          totalStock: total,
          lowestStock: lowest,
          status,
          threshold
        };
      })
      .filter((product) => {
        if (product.totalStock <= 0) {
          return true;
        }
        return product.totalStock <= product.threshold;
      })
      .sort((a, b) => a.totalStock - b.totalStock);
  }, [products]);

  const categoryOptions = useMemo(() => {
    const words = new Set<string>();
    lowStockProducts.forEach((product) => {
      const firstWord = product.name?.trim().split(/\s+/)[0];
      if (firstWord) {
        words.add(firstWord);
      }
    });
    return Array.from(words).sort();
  }, [lowStockProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return lowStockProducts.filter((product) => {
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' ||
        product.name?.toLowerCase().startsWith(categoryFilter.toLowerCase());

      if (!term) {
        return matchesStatus && matchesCategory;
      }

      const haystacks = [
        product.name,
        product.description,
        product.sku,
        product.barcode,
        product.id
      ];

      const matchesSearch = haystacks.some(
        (value) => value && value.toLowerCase().includes(term)
      );

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [lowStockProducts, searchTerm, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const base = lowStockProducts;
    const lowCount = base.filter((product) => product.status === 'low').length;
    const outCount = base.filter((product) => product.status === 'out').length;
    const totalValue = base.reduce(
      (sum, product) => sum + (product.price ?? 0) * product.totalStock,
      0
    );
    const averageStock =
      base.length > 0
        ? Math.round(base.reduce((sum, product) => sum + product.totalStock, 0) / base.length)
        : 0;

    return {
      total: base.length,
      lowCount,
      outCount,
      totalValue,
      averageStock
    };
  }, [lowStockProducts]);

  const handleEditProduct = (product: Product) => {
    if (!canEdit) return;
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) return;
    await deleteProduct(productId);
  };

  const handleProductSubmit = async (payload: ProductDraft) => {
    if (!businessId) return;
    if (!payload.id) return;

    const { id, ...rest } = payload;
    await updateProduct({ productId: id, payload: rest });
    setProductModalOpen(false);
    setEditingProduct(null);
  };

  // Bulk update handlers
  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (!businessId || selectedProductIds.size === 0) return;
    
    setBulkUpdating(true);
    try {
      const updatePromises = Array.from(selectedProductIds).map((productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return Promise.resolve();
        return updateProduct({
          productId,
          payload: { lowStockAlert: bulkThreshold }
        });
      });
      
      await Promise.all(updatePromises);
      setBulkModalOpen(false);
      setSelectedProductIds(new Set());
      setBulkThreshold(10);
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Failed to update some products. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const openBulkModal = () => {
    if (selectedProductIds.size === 0) {
      // If no products selected, select all filtered products
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
    setBulkModalOpen(true);
  };

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Low Stock Monitor</h1>
          <p className="text-sm text-madas-text/70">
            Keep an eye on products that need attention before inventory runs out.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProductIds.size > 0 && (
            <span className="text-sm text-madas-text/60">
              {selectedProductIds.size} selected
            </span>
          )}
          <button
            type="button"
            onClick={openBulkModal}
            disabled={!canEdit || filteredProducts.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons text-base">tune</span>
            Bulk Update Alert Threshold
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total flagged</p>
            <span className="material-icons rounded-lg bg-blue-100 p-2 text-lg text-blue-600">
              inventory_2
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.total}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Low stock</p>
            <span className="material-icons rounded-lg bg-orange-100 p-2 text-lg text-orange-600">
              warning
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.lowCount}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Out of stock</p>
            <span className="material-icons rounded-lg bg-red-100 p-2 text-lg text-red-600">
              do_not_disturb
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.outCount}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Inventory value</p>
            <span className="material-icons rounded-lg bg-green-100 p-2 text-lg text-green-600">
              payments
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">
            {formatCurrency(stats.totalValue)}
          </p>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Select All Checkbox */}
          {filteredProducts.length > 0 && canEdit && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-white transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
              />
              <span>Select All</span>
            </button>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products"
              className="w-48 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All statuses</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
        <p className="text-xs text-madas-text/60">
          Showing {filteredProducts.length} of {lowStockProducts.length} flagged products.
        </p>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Checking inventory levels…</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">inventory_2</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No products need attention</h3>
            <p className="text-sm text-madas-text/60">
              Adjust your filters or check back after new sales.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className={clsx(
                "card-hover rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
                selectedProductIds.has(product.id) ? "border-primary/50 ring-2 ring-primary/20" : "border-gray-100"
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-1 gap-4">
                  {/* Checkbox for selection */}
                  {canEdit && (
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => handleToggleProduct(product.id)}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3">
                  <header className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-primary">
                      {product.name || 'Unnamed product'}
                    </h3>
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-medium capitalize',
                        statusChipStyles[product.status]
                      )}
                    >
                      {statusLabels[product.status]}
                    </span>
                  </header>
                  <p className="text-sm text-madas-text/60">
                    {product.description || 'No description available.'}
                  </p>
                  <dl className="grid grid-cols-2 gap-4 text-sm text-madas-text/70 md:grid-cols-4">
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">Total stock</dt>
                      <dd className="text-base font-semibold text-primary">{product.totalStock}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">Alert threshold</dt>
                      <dd className="text-base font-semibold text-primary">{product.threshold}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">SKU</dt>
                      <dd className="text-base font-semibold text-primary">{product.sku ?? 'N/A'}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">Price</dt>
                      <dd className="text-base font-semibold text-primary">
                        {formatCurrency(product.price ?? 0)}
                      </dd>
                    </div>
                  </dl>
                  <div className="rounded-xl border border-gray-100 bg-base/60 p-4 text-sm text-madas-text/70">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-madas-text/50">
                      Stock breakdown
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(product.stockByLocation ?? {}).map(([locationId, quantity]) => (
                        <span
                          key={locationId}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-primary shadow-sm"
                        >
                          <span className="material-icons text-sm text-madas-text/60">warehouse</span>
                          {locationId}: {quantity}
                        </span>
                      ))}
                      {Object.entries(product.stock ?? {}).map(([variant, quantity]) => (
                        <span
                          key={variant}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-primary shadow-sm"
                        >
                          <span className="material-icons text-sm text-madas-text/60">straighten</span>
                          {variant}: {quantity}
                        </span>
                      ))}
                      {Object.keys(product.stockByLocation ?? {}).length === 0 &&
                      Object.keys(product.stock ?? {}).length === 0 ? (
                        <span className="text-xs text-madas-text/50">No detailed stock data available.</span>
                      ) : null}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                    onClick={() => handleEditProduct(product)}
                    disabled={!canEdit}
                  >
                    <span className="material-icons text-base">edit</span>
                    Edit product
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    onClick={() => handleDeleteProduct(product.id)}
                    disabled={!canEdit || deleting}
                  >
                    <span className="material-icons text-base">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProductModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleProductSubmit}
        initialValue={editingProduct}
        submitting={updating}
        warehouses={warehouses}
      />

      {/* Bulk Update Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-icons text-primary">tune</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">Bulk Update Alert Threshold</h2>
                  <p className="text-sm text-madas-text/60">
                    Update low stock alert for {selectedProductIds.size} product{selectedProductIds.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-full p-2 text-madas-text/60 hover:bg-gray-100 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </header>

            <div className="p-6 space-y-6">
              {/* Selected Products Preview */}
              <div className="rounded-xl bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-madas-text/80 mb-3">Selected Products</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {Array.from(selectedProductIds).map((id) => {
                    const product = filteredProducts.find((p) => p.id === id);
                    if (!product) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-primary truncate">{product.name}</span>
                        <span className="text-madas-text/60 text-xs">
                          Current: {product.threshold}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* New Threshold Input */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                  New Alert Threshold
                </label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">
                    warning
                  </span>
                  <input
                    type="number"
                    value={bulkThreshold}
                    onChange={(e) => setBulkThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter threshold value"
                  />
                </div>
                <p className="mt-2 text-xs text-madas-text/60">
                  Products will be flagged as "Low Stock" when quantity falls below this number.
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 50].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBulkThreshold(value)}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        bulkThreshold === value
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-madas-text hover:bg-gray-200"
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setBulkModalOpen(false);
                  setSelectedProductIds(new Set());
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-madas-text hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkUpdating || selectedProductIds.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bulkUpdating ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Updating...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">check</span>
                    Update {selectedProductIds.size} Product{selectedProductIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockPage;

