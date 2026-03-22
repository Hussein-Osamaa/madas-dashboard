import { memo } from 'react';
import { ProductsSectionData } from '../../../types/builder';

type Props = { data: ProductsSectionData; style?: React.CSSProperties };

const ProductsSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Featured products';
  const headingSize = d.heading_size ?? 'h1';
  const columnsDesktop = d.columns_desktop ?? d.columns ?? 4;
  const showViewAll = d.show_view_all ?? true;
  const imageRatio = d.image_ratio ?? 'adapt';
  const showVendor = d.show_vendor ?? d.showVendor ?? false;
  const showRating = d.show_rating ?? false;
  const showPrice = d.showPrice ?? true;
  const showAddToCart = d.showAddToCart ?? true;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const products = d.selectedProducts ?? [];

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-4xl',
    h0: 'text-4xl md:text-5xl',
    hxl: 'text-5xl md:text-6xl',
  };

  const colsMap: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-2 lg:grid-cols-6',
  };

  const ratioMap: Record<string, string> = {
    adapt: '',
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
  };

  const defaultProducts = [
    { id: '1', name: 'Classic Leather Bag', price: 89.99, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop' },
    { id: '2', name: 'Minimalist Watch', price: 149.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop' },
    { id: '3', name: 'Wireless Headphones', price: 59.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=800&fit=crop' },
    { id: '4', name: 'Designer Sunglasses', price: 124.99, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop' },
  ];

  const displayProducts = products.length > 0 ? products : defaultProducts;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold`}>
            {title}
          </h2>
          {showViewAll && (
            <a href="#" className="text-sm underline hover:no-underline">View all</a>
          )}
        </div>
        <div className={`grid ${colsMap[columnsDesktop] || colsMap[4]} gap-4 sm:gap-6`}>
          {displayProducts.map((product: any, index: number) => (
            <a key={product.id || index} href="#" className="group block">
              {/* Product image */}
              <div className={`bg-[#F3F3F3] overflow-hidden mb-3 ${ratioMap[imageRatio] || 'aspect-[3/4]'}`}>
                <img src={product.image || defaultProducts[index % defaultProducts.length]?.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              {/* Product info */}
              <div className="space-y-1">
                {showVendor && <p className="text-xs uppercase tracking-wider" style={{ opacity: 0.5 }}>Vendor</p>}
                <h3 className="text-sm group-hover:underline leading-snug">{product.name}</h3>
                {showRating && (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <span key={i} className="text-xs" style={{ opacity: 0.3 }}>&#9733;</span>)}
                    <span className="text-xs ml-1" style={{ opacity: 0.5 }}>No reviews</span>
                  </div>
                )}
                {showPrice && (
                  <p className="text-sm">
                    {product.onSale || product.salePrice ? (
                      <>
                        <span className="text-red-600 mr-2">{formatPrice(product.salePrice ?? product.sellingPrice ?? product.price)}</span>
                        <span className="line-through" style={{ opacity: 0.5 }}>{formatPrice(product.compareAtPrice ?? product.price)}</span>
                      </>
                    ) : (
                      formatPrice(product.sellingPrice ?? product.price ?? 0)
                    )}
                  </p>
                )}
                {showAddToCart && (
                  <button
                    className="mt-2 w-full py-2.5 border text-xs font-medium tracking-wider uppercase transition-colors"
                    style={{ borderColor: 'var(--scheme-outline-btn, #121212)', color: 'var(--scheme-outline-btn, #121212)' }}>
                    Add to cart
                  </button>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(ProductsSection);
