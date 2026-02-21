import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../services/productsService';
import { useCurrency } from '../../hooks/useCurrency';

export type InventoryViewMode = 'grid' | 'list';

type Props = {
  product: Product;
  selected: boolean;
  viewMode: InventoryViewMode;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  /** When readOnly (XDF), allow editing image & pricing only */
  onEditImageAndPricing?: () => void;
};

const ProductCard = ({ product, selected, viewMode, onSelect, onEdit, onDelete, readOnly = false, onEditImageAndPricing }: Props) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const stock = product.stock ?? {};
  const totalStock = Object.values(stock).reduce((acc, qty) => acc + qty, 0);
  const minStock = Object.values(stock).reduce((acc, qty) => Math.min(acc, qty), Number.POSITIVE_INFINITY);
  const lowStockThreshold = product.lowStockAlert ?? 10;

  const status = (() => {
    if (totalStock <= 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-600' };
    if (minStock <= lowStockThreshold) return { label: 'Low Stock', className: 'bg-orange-100 text-orange-600' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-600' };
  })();

  const details = (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1 bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-primary">{product.name || 'Unnamed Product'}</h3>
          <span className="text-primary font-semibold">{formatCurrency(product.price ?? 0)}</span>
        </div>
        <p className="text-sm text-madas-text/70">{product.description || 'No description'}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-xs text-madas-text/70">
        <span className="inline-flex items-center gap-1 rounded-full bg-base px-3 py-1">
          <span className="material-icons text-sm text-primary">tag</span>
          SKU: {product.sku || 'N/A'}
        </span>
        <span className={clsx('inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium', status.className)}>
          <span className="material-icons text-sm">circle</span>
          {status.label}
        </span>
      </div>
    </div>
  );

  const actions = readOnly ? (
    <div className={clsx('flex flex-wrap gap-2 text-sm', viewMode === 'grid' ? 'pt-2' : 'lg:pt-0')}>
      {onEditImageAndPricing && (
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-2 text-madas-text hover:bg-base transition-colors"
          onClick={onEditImageAndPricing}
        >
          Edit image & pricing
        </button>
      )}
      <button
        type="button"
        className="rounded-lg border border-gray-200 px-3 py-2 text-madas-text hover:bg-base transition-colors"
        onClick={() => navigate(`/inventory/products/${product.id}`)}
      >
        Details
      </button>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-madas-text/70 self-center">
        Linked
      </span>
    </div>
  ) : (
    <div className={clsx('flex flex-wrap gap-2 text-sm', viewMode === 'grid' ? 'pt-2' : 'lg:pt-0')}>
      <button
        type="button"
        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-madas-text hover:bg-base transition-colors"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-madas-text hover:bg-base transition-colors"
        onClick={() => navigate(`/inventory/products/${product.id}`)}
      >
        Details
      </button>
      <button
        type="button"
        className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );

  return (
    <article
      className={clsx(
        'relative rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md',
        viewMode === 'list'
          ? 'flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-start lg:justify-between'
          : 'px-6 py-5 space-y-4'
      )}
    >
      {!readOnly && (
        <div className="absolute top-3 left-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent bg-white checked:bg-primary checked:border-primary"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
          />
        </div>
      )}

      {viewMode === 'list' ? (
        <>
          <div className="mt-8 w-full max-w-[200px] aspect-square rounded-xl bg-base flex items-center justify-center self-center lg:self-start overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[0]} 
                alt={product.name || 'Product'} 
                className="w-full h-full object-cover"
              />
            ) : (
            <span className="material-icons text-4xl text-madas-text/30">image</span>
            )}
          </div>
          <div className="flex flex-col gap-4 lg:flex-1">
            {details}
            {actions}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-4">
            {details}
            {actions}
          </div>
      )}
    </article>
  );
};

export default ProductCard;

