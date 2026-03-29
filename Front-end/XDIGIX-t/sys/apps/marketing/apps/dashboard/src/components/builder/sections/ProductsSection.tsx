import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { ProductsSectionData } from '../../../types/builder';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = { data: ProductsSectionData; style?: React.CSSProperties };

const ProductsSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const { theme } = useTheme();

  const title = d.title || 'Featured products';
  const headingSize = d.heading_size ?? 'h1';
  const columnsDesktop = d.columns_desktop ?? d.columns ?? 4;
  const showViewAll = d.show_view_all ?? true;
  const showPrice = d.showPrice ?? true;
  const showAddToCart = d.showAddToCart ?? true;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;
  const layout = d.layout ?? 'grid';

  // Read from THEME settings (Product cards panel)
  const cardStyle = theme.productCardStyle || 'standard';
  const imageRatio = d.image_ratio ?? theme.productImageRatio ?? 'adapt';
  const textAlign = theme.productTextAlign || 'left';
  const showVendor = theme.productShowVendor ?? false;
  const showRating = d.show_rating ?? false;

  const products = d.selectedProducts ?? [];

  // Currency from theme
  const currency = theme.currency || 'SAR';
  const currencyPosition = theme.currencyPosition || 'prefix';

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

  const hasCollection = !!d.collection;
  const displayProducts = products.length > 0 ? products : (hasCollection ? [] : defaultProducts);

  const formatPrice = (price: number) => {
    const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    return currencyPosition === 'suffix' ? `${num} ${currency}` : `${currency} ${num}`;
  };

  // ── Carousel state ──────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (layout !== 'carousel') return;
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [layout, checkScroll, displayProducts.length]);

  const scrollBy = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector(':scope > *')?.clientWidth ?? 280;
    el.scrollBy({ left: dir * (cardW + 24), behavior: 'smooth' });
  };

  // Card style classes
  const isCard = cardStyle === 'card';
  const isMinimal = cardStyle === 'minimal';

  const cardWrapperCls = isCard
    ? 'bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow'
    : '';

  const imgContainerCls = isCard
    ? `overflow-hidden ${ratioMap[imageRatio] || 'aspect-[3/4]'}`
    : `bg-[#F3F3F3] overflow-hidden mb-3 rounded-[var(--btn-radius,8px)] ${ratioMap[imageRatio] || 'aspect-[3/4]'}`;

  const bodyPaddingCls = isCard ? 'p-3' : '';

  const renderProductCard = (product: any, index: number) => (
    <a
      key={product.id || index}
      href="#"
      className={`group block ${cardWrapperCls} ${layout === 'carousel' ? 'flex-shrink-0 snap-start' : ''}`}
      style={layout === 'carousel' ? { width: `calc((100% - ${(columnsDesktop - 1) * 24}px) / ${columnsDesktop})`, minWidth: '200px' } : undefined}
    >
      {/* Product image */}
      <div className={imgContainerCls}>
        <img src={product.image || product.images?.[0] || defaultProducts[index % defaultProducts.length]?.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      {/* Product info */}
      <div className={`space-y-1 ${bodyPaddingCls}`} style={{ textAlign }}>
        {showVendor && product.vendor && <p className="text-xs uppercase tracking-wider" style={{ opacity: 0.5 }}>{product.vendor}</p>}
        <h3 className="text-sm group-hover:underline leading-snug">{product.name}</h3>
        {showRating && (
          <div className="flex gap-0.5" style={{ justifyContent: textAlign === 'center' ? 'center' : 'flex-start' }}>
            {[1,2,3,4,5].map(i => <span key={i} className="text-xs" style={{ opacity: 0.3 }}>&#9733;</span>)}
            <span className="text-xs ml-1" style={{ opacity: 0.5 }}>No reviews</span>
          </div>
        )}
        {showPrice && (
          <p className="text-sm font-semibold" style={{ color: 'var(--c-primary, #121212)' }}>
            {product.onSale || product.salePrice ? (
              <>
                <span className="text-red-600 mr-2">{formatPrice(product.salePrice ?? product.sellingPrice ?? product.price)}</span>
                <span className="line-through font-normal" style={{ opacity: 0.5 }}>{formatPrice(product.compareAtPrice ?? product.price)}</span>
              </>
            ) : (
              formatPrice(product.sellingPrice ?? product.price ?? 0)
            )}
          </p>
        )}
        {showAddToCart && (
          isCard ? (
            <button
              className="mt-2 w-full text-xs font-medium tracking-wider uppercase transition-colors text-white"
              style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', background: 'var(--c-primary, #121212)' }}>
              Add to cart
            </button>
          ) : isMinimal ? (
            <button className="mt-1 text-sm font-semibold underline" style={{ color: 'var(--c-primary, #121212)' }}>
              Add to cart
            </button>
          ) : (
            <button
              className="mt-2 w-full border text-xs font-medium tracking-wider uppercase transition-colors"
              style={{ padding: 'var(--btn-padding, 0.75rem 1.5rem)', borderRadius: 'var(--btn-radius, 8px)', boxShadow: 'var(--btn-shadow, none)', borderColor: 'var(--scheme-outline-btn, #121212)', color: 'var(--scheme-outline-btn, #121212)' }}>
              Add to cart
            </button>
          )
        )}
      </div>
    </a>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className={`${headingSizeMap[headingSize] || headingSizeMap.h1} font-bold`}>
            {title}
          </h2>
          <div className="flex items-center gap-3">
            {layout === 'carousel' && displayProducts.length > columnsDesktop && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => scrollBy(-1)}
                  disabled={!canScrollLeft}
                  className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ borderColor: 'var(--scheme-text, #121212)', color: 'var(--scheme-text, #121212)' }}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>chevron_left</span>
                </button>
                <button
                  onClick={() => scrollBy(1)}
                  disabled={!canScrollRight}
                  className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ borderColor: 'var(--scheme-text, #121212)', color: 'var(--scheme-text, #121212)' }}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              </div>
            )}
            {showViewAll && (
              <a href="#" className="text-sm underline hover:no-underline">View all</a>
            )}
          </div>
        </div>
        {hasCollection && displayProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <span className="material-icons text-4xl mb-2 block">inventory_2</span>
            <p className="text-sm">No products in this collection yet.</p>
            <p className="text-xs mt-1">Add products to this collection in your inventory.</p>
          </div>
        )}

        {layout === 'carousel' ? (
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayProducts.map((product: any, index: number) => renderProductCard(product, index))}
          </div>
        ) : (
          <div className={`grid ${colsMap[columnsDesktop] || colsMap[4]} gap-4 sm:gap-6`}>
            {displayProducts.map((product: any, index: number) => renderProductCard(product, index))}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(ProductsSection);
