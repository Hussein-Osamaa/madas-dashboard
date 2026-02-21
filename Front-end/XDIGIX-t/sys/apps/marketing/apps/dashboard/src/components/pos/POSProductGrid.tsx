import { Product } from '../../services/productsService';
import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  products: Product[];
  onAddToCart: (product: Product, size?: string) => void;
};

const POSProductGrid = ({ products, onAddToCart }: Props) => {
  const { formatCurrency } = useCurrency();
  
  const getAvailableSizes = (product: Product) => {
    const stock = product.stock ?? {};
    return Object.entries(stock)
      .filter(([, qty]) => qty > 0)
      .map(([size]) => size);
  };

  const getTotalStock = (product: Product) => {
    const stock = product.stock ?? {};
    return Object.values(stock).reduce((sum, qty) => sum + qty, 0);
  };

  const handleProductClick = (product: Product) => {
    const sizes = getAvailableSizes(product);
    const totalStock = getTotalStock(product);

    if (totalStock <= 0) {
      alert('Product is out of stock');
      return;
    }

    if (sizes.length === 0) {
      // No sizes, add directly
      onAddToCart(product);
    } else if (sizes.length === 1) {
      // Single size, add directly
      onAddToCart(product, sizes[0]);
    } else {
      // Multiple sizes - show size selection
      const sizeOptions = sizes.map((size) => `${size} (${product.stock?.[size] ?? 0} available)`).join('\n');
      const selectedSize = prompt(`Select size:\n${sizeOptions}`, sizes[0]);
      if (selectedSize && sizes.includes(selectedSize)) {
        onAddToCart(product, selectedSize);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => {
        const totalStock = getTotalStock(product);
        const isOutOfStock = totalStock <= 0;
        const sizes = getAvailableSizes(product);

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => handleProductClick(product)}
            disabled={isOutOfStock}
            className={`
              relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all
              hover:shadow-md hover:border-primary/30
              ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Product Image Placeholder */}
            <div className="w-full aspect-square rounded-lg bg-base mb-3 flex items-center justify-center">
              <span className="material-icons text-4xl text-madas-text/30">image</span>
            </div>

            {/* Product Info */}
            <div className="text-left">
              <h3 className="text-sm font-semibold text-primary mb-1 line-clamp-2">{product.name}</h3>
              <p className="text-lg font-bold text-primary mb-2">{formatCurrency(product.price ?? 0)}</p>

              {/* Stock Info */}
              <div className="flex items-center justify-between text-xs">
                {sizes.length > 0 ? (
                  <span className="text-madas-text/60">{sizes.length} sizes</span>
                ) : (
                  <span className={isOutOfStock ? 'text-red-600' : 'text-green-600'}>
                    {totalStock} in stock
                  </span>
                )}
                {isOutOfStock && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Add Icon Overlay */}
            {!isOutOfStock && (
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                <span className="material-icons text-sm">add</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default POSProductGrid;

