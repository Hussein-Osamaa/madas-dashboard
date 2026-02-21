import { useMemo, useState } from 'react';
import clsx from 'clsx';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import ProductModal, { ProductDraft } from '../../components/inventory/ProductModal';
import { useBusiness } from '../../contexts/BusinessContext';
import { useProducts } from '../../hooks/useProducts';
import { useWarehouses } from '../../hooks/useWarehouses';
import { Product } from '../../services/productsService';
import { useCurrency } from '../../hooks/useCurrency';
import { exportProductsToExcel } from '../../utils/excelUtils';

const LAST_STOCK_THRESHOLD = 1;

type ViewMode = 'grid' | 'list';

const LastPiecesPage = () => {
  const { businessId, permissions, loading, hasPermission } = useBusiness();
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [exporting, setExporting] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const canEdit =
    hasPermission('product_update') ||
    hasPermission('product_edit') ||
    permissions?.product?.includes('update') ||
    permissions?.product?.includes('edit') ||
    permissions?.inventory?.includes('edit');

  const deriveTotalStock = (product: Product): number => {
    const stockByLocation = product.stockByLocation ?? {};
    const stockVariants = product.stock ?? {};

    if (Object.keys(stockByLocation).length > 0) {
      return Object.values(stockByLocation).reduce((sum, qty) => sum + (qty ?? 0), 0);
    }

    if (Object.keys(stockVariants).length > 0) {
      return Object.values(stockVariants).reduce((sum, qty) => sum + (qty ?? 0), 0);
    }

    return 0;
  };

  const lastPieces = useMemo(() => {
    return products
      .map((product) => {
        const totalStock = deriveTotalStock(product);
        return { ...product, totalStock };
      })
      .filter((product) => product.totalStock === LAST_STOCK_THRESHOLD)
      .sort((a, b) => a.totalStock - b.totalStock);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return lastPieces;

    return lastPieces.filter((product) => {
      const haystacks = [product.name, product.description, product.sku, product.barcode, product.id];
      return haystacks.some((value) => value && value.toLowerCase().includes(term));
    });
  }, [lastPieces, searchTerm]);

  const stats = useMemo(() => {
    const totalValue = lastPieces.reduce((sum, product) => sum + (product.price ?? 0) * product.totalStock, 0);
    const averageStock =
      lastPieces.length > 0
        ? Math.round(lastPieces.reduce((sum, product) => sum + product.totalStock, 0) / lastPieces.length)
        : 0;

    return {
      total: lastPieces.length,
      totalValue,
      averageStock
    };
  }, [lastPieces]);

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

  const handleExportExcel = async () => {
    if (lastPieces.length === 0) {
      alert('No products to export.');
      return;
    }
    try {
      setExporting(true);
      const date = new Date().toISOString().split('T')[0];
      await exportProductsToExcel(lastPieces, `MADAS_Last_Pieces_${date}.xlsx`);
      alert(`Successfully exported ${lastPieces.length} last piece products to Excel!`);
    } catch (error) {
      console.error('[LastPiecesPage] Export failed:', error);
      alert('Failed to export products. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Last Pieces</h1>
          <p className="text-sm text-madas-text/70">
            Products with exactly {LAST_STOCK_THRESHOLD} unit left across all locations/variants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <span className="material-icons text-base">grid_view</span>
              Grid
            </button>
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                viewMode === 'list' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <span className="material-icons text-base">view_list</span>
              List
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
            onClick={handleExportExcel}
            disabled={exporting || lastPieces.length === 0}
          >
            <span className="material-icons text-base text-current">
              {exporting ? 'hourglass_empty' : 'download'}
            </span>
            {exporting ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total flagged</p>
            <span className="material-icons rounded-lg bg-orange-100 p-2 text-lg text-orange-600">hourglass_empty</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.total}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Average stock</p>
            <span className="material-icons rounded-lg bg-blue-100 p-2 text-lg text-blue-600">inventory_2</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.averageStock}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Inventory value</p>
            <span className="material-icons rounded-lg bg-green-100 p-2 text-lg text-green-600">payments</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{formatCurrency(stats.totalValue)}</p>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <p className="text-xs text-madas-text/60">
          Showing {filteredProducts.length} of {lastPieces.length} flagged products.
        </p>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Checking inventory…</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">hourglass_bottom</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No products are in the last pieces list</h3>
            <p className="text-sm text-madas-text/60">
              Adjust your stock thresholds or check back after new sales.
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="card-hover flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md overflow-hidden"
            >
              {/* Product Image or Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                <span className="material-icons text-6xl text-primary/20">inventory_2</span>
                <span className="absolute top-3 right-3 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  {product.totalStock} left
                </span>
              </div>
              
              {/* Product Info */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-lg font-semibold text-primary line-clamp-1">
                  {product.name || 'Unnamed product'}
                </h3>
                <p className="mt-1 text-sm text-madas-text/60 line-clamp-2">
                  {product.description || 'No description available.'}
                </p>
                
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-madas-text/50">SKU: {product.sku ?? 'N/A'}</span>
                  <span className="font-semibold text-primary">{formatCurrency(product.price ?? 0)}</span>
                </div>

                {/* Stock breakdown compact */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(product.stockByLocation ?? {}).slice(0, 3).map(([locationId, quantity]) => (
                    <span
                      key={locationId}
                      className="inline-flex items-center gap-1 rounded bg-base px-2 py-0.5 text-xs text-madas-text/70"
                    >
                      <span className="material-icons text-xs">warehouse</span>
                      {quantity}
                    </span>
                  ))}
                  {Object.entries(product.stock ?? {}).slice(0, 3).map(([variant, quantity]) => (
                    <span
                      key={variant}
                      className="inline-flex items-center gap-1 rounded bg-base px-2 py-0.5 text-xs text-madas-text/70"
                    >
                      {variant}: {quantity}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                    onClick={() => handleEditProduct(product)}
                    disabled={!canEdit}
                  >
                    <span className="material-icons text-sm">edit</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    onClick={() => handleDeleteProduct(product.id)}
                    disabled={!canEdit || deleting}
                  >
                    <span className="material-icons text-sm">delete</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="card-hover rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-1 flex-col gap-3">
                  <header className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-primary">
                      {product.name || 'Unnamed product'}
                    </h3>
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-medium capitalize',
                        'bg-orange-100 text-orange-700'
                      )}
                    >
                      {product.totalStock} left
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
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">SKU</dt>
                      <dd className="text-base font-semibold text-primary">{product.sku ?? 'N/A'}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">Price</dt>
                      <dd className="text-base font-semibold text-primary">
                        {formatCurrency(product.price ?? 0)}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs uppercase tracking-wide text-madas-text/50">Status</dt>
                      <dd className="text-base font-semibold text-primary">{product.status ?? 'N/A'}</dd>
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
    </div>
  );
};

export default LastPiecesPage;

