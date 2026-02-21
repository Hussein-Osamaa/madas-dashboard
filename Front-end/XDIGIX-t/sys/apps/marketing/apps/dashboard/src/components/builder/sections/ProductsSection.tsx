import { useState, useRef, useEffect } from 'react';
import { ProductsSectionData, SelectedProduct, ProductCardStyle } from '../../../types/builder';
import { useCurrency } from '../../../hooks/useCurrency';

type Props = {
  data: ProductsSectionData;
  style?: React.CSSProperties;
};

const defaultCardStyle: ProductCardStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  priceColor: '#6b7280',
  borderRadius: 12,
  shadow: 'md',
  imageAspect: 'square',
  imageFit: 'cover',
  imageBackgroundColor: '#f3f4f6',
  buttonBackgroundColor: '#27491F',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 8,
  buttonFullWidth: true,
  buttonHoverEffect: 'fill',
  buttonHoverBackgroundColor: '#ffffff',
  buttonHoverTextColor: '#27491F',
  showBorder: true,
  borderColor: '#e5e7eb'
};

const ProductsSection = ({ data, style }: Props) => {
  const { formatCurrency } = useCurrency();
  
  const { 
    title = 'Featured Products', 
    subtitle = 'Check out our best sellers', 
    layout = 'grid',
    columns = 4,
    selectedProducts = [],
    showPrice = true,
    showAddToCart = true,
    cardStyle = defaultCardStyle,
    titleStyle = {},
    subtitleStyle = {}
  } = data;

  // Merge with defaults for any missing card style properties
  const cs: ProductCardStyle = { ...defaultCardStyle, ...cardStyle };
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const productCount = selectedProducts.length;

  // Calculate items per view based on screen size
  const getItemsPerView = () => {
    if (typeof window === 'undefined') return columns;
    if (window.innerWidth < 640) return 1; // mobile
    if (window.innerWidth < 1024) return 2; // tablet
    return columns; // desktop
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());
  const maxIndex = Math.max(0, productCount - itemsPerView);

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerView = getItemsPerView();
      setItemsPerView(newItemsPerView);
      const newMaxIndex = Math.max(0, productCount - newItemsPerView);
      if (currentIndex > newMaxIndex) {
        setCurrentIndex(newMaxIndex);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [productCount, currentIndex, columns]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  // Get shadow class
  const getShadowClass = (shadow: string) => {
    switch (shadow) {
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-lg';
      case 'xl': return 'shadow-xl';
      default: return '';
    }
  };

  // Get image aspect ratio class
  const getAspectClass = (aspect: string) => {
    switch (aspect) {
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  // Show placeholder if no products selected
  if (selectedProducts.length === 0) {
    return (
      <section 
        className="products-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
        style={style}
        data-edit-type="background"
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
            <h2 
              className="products-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
              data-edit-type="title"
              style={{
                fontSize: titleStyle.fontSize || '2.5rem',
                fontWeight: titleStyle.fontWeight || '700',
                color: titleStyle.color || 'inherit',
                textAlign: (titleStyle.textAlign as any) || 'center'
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p 
                className="products-subtitle px-2 cursor-pointer hover:opacity-60"
                data-edit-type="subtitle"
                style={{
                  fontSize: subtitleStyle.fontSize || '1rem',
                  color: subtitleStyle.color || '#6b7280'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div 
            className="products-placeholder text-center py-12 border-2 border-dashed border-current/30 rounded-xl bg-current/5 cursor-pointer hover:border-current/50"
            data-edit-type="product"
          >
            <span className="material-icons text-5xl opacity-50 mb-4 block">inventory_2</span>
            <p className="opacity-70 font-medium">No products selected</p>
            <p className="opacity-50 text-sm mt-1">Click here to select products from your inventory</p>
          </div>
        </div>
      </section>
    );
  }

  const renderProduct = (product: SelectedProduct, index: number) => (
    <div 
      key={product.id || index} 
      className={`product-card overflow-hidden hover:-translate-y-1 group transition-all duration-300 ${getShadowClass(cs.shadow)} hover:shadow-xl cursor-pointer`}
      style={{
        backgroundColor: cs.backgroundColor,
        borderRadius: `${cs.borderRadius}px`,
        border: cs.showBorder ? `1px solid ${cs.borderColor}` : 'none'
      }}
      data-edit-type="card"
      data-edit-index={index}
    >
      <div 
        className={`${getAspectClass(cs.imageAspect)} flex items-center justify-center overflow-hidden relative`}
        style={{ backgroundColor: cs.imageBackgroundColor || '#f3f4f6' }}
      >
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            style={{ objectFit: cs.imageFit || 'contain' }}
          />
        ) : (
          <span className="material-icons text-4xl sm:text-6xl text-gray-300 group-hover:scale-110 transition-transform duration-300">image</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
      </div>
      <div className="p-4 sm:p-6">
        <h3 
          className="text-base sm:text-lg font-semibold mb-2 transition-colors line-clamp-2"
          style={{ color: cs.textColor }}
        >
          {product.name}
        </h3>
        {showPrice && (
          <p 
            className="text-sm sm:text-base mb-3 sm:mb-4 font-medium"
            style={{ color: cs.priceColor }}
          >
            {formatCurrency(product.sellingPrice || product.price || 0)}
          </p>
        )}
        {showAddToCart && (
          <button 
            className={`${cs.buttonFullWidth !== false ? 'w-full' : 'px-4'} py-2 text-sm sm:text-base font-medium transition-all duration-300 hover:opacity-90 hover:shadow-lg`}
            style={{
              backgroundColor: cs.buttonBackgroundColor,
              color: cs.buttonTextColor,
              borderRadius: `${cs.buttonBorderRadius}px`
            }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );

  if (layout === 'carousel') {
    return (
      <section 
        className="products-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300 relative"
        style={style}
        data-edit-type="background"
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
            <h2 
              className="products-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
              data-edit-type="title"
              style={{
                fontSize: titleStyle.fontSize || '2.5rem',
                fontWeight: titleStyle.fontWeight || '700',
                color: titleStyle.color || 'inherit',
                textAlign: (titleStyle.textAlign as any) || 'center'
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p 
                className="products-subtitle px-2 cursor-pointer hover:opacity-60"
                data-edit-type="subtitle"
                style={{
                  fontSize: subtitleStyle.fontSize || '1rem',
                  color: subtitleStyle.color || '#6b7280'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="relative px-8 sm:px-12 md:px-16">
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 z-10 bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200"
                aria-label="Previous products"
              >
                <span className="material-icons text-gray-700 text-xl sm:text-2xl">chevron_left</span>
              </button>
            )}
            
            {currentIndex < maxIndex && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 z-10 bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200"
                aria-label="Next products"
              >
                <span className="material-icons text-gray-700 text-xl sm:text-2xl">chevron_right</span>
              </button>
            )}

            <div
              ref={carouselRef}
              className="overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: currentIndex === maxIndex && maxIndex > 0 && productCount > itemsPerView
                    ? `translateX(calc(-100% + ${itemsPerView}00% / ${productCount} + ${(itemsPerView - 1) * 16}px))`
                    : `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                  gap: '1rem',
                  width: '100%'
                }}
              >
                {selectedProducts.map((product, i) => {
                  const cardWidth = `calc((100% - ${(itemsPerView - 1) * 16}px) / ${itemsPerView})`;
                  return (
                    <div
                      key={product.id || i}
                      className="flex-shrink-0"
                      style={{ 
                        width: cardWidth,
                        minWidth: cardWidth,
                        maxWidth: cardWidth
                      }}
                    >
                      {renderProduct(product, i)}
                    </div>
                  );
                })}
              </div>
            </div>

            {maxIndex > 0 && (
              <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? 'bg-current w-6 sm:w-8'
                        : 'bg-current/30 w-2 sm:w-2.5 hover:bg-current/50'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Grid and List layouts
  const gridCols = layout === 'grid' 
    ? columns === 2 
      ? 'grid-cols-1 sm:grid-cols-2' 
      : columns === 3 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    : 'grid-cols-1';

  const hoverEffect = cs.buttonHoverEffect || 'fill';
  const hoverBg = cs.buttonHoverBackgroundColor || cs.buttonTextColor;
  const hoverText = cs.buttonHoverTextColor || cs.buttonBackgroundColor;

  return (
    <>
      <style>{`
        .product-add-btn {
          position: relative;
          overflow: hidden;
          z-index: 1;
        }
        ${hoverEffect === 'fill' ? `
        .product-add-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          background: ${hoverBg};
          transition: width 0.4s ease;
          z-index: -1;
          border-radius: inherit;
        }
        .product-add-btn:hover::before {
          width: 100%;
        }
        .product-add-btn:hover {
          color: ${hoverText} !important;
        }
        ` : hoverEffect === 'scale' ? `
        .product-add-btn:hover {
          transform: scale(1.05);
          background-color: ${hoverBg} !important;
          color: ${hoverText} !important;
        }
        ` : hoverEffect === 'glow' ? `
        .product-add-btn:hover {
          box-shadow: 0 0 15px ${hoverBg}80, 0 0 30px ${hoverBg}40;
          background-color: ${hoverBg} !important;
          color: ${hoverText} !important;
        }
        ` : `
        .product-add-btn:hover {
          opacity: 0.9;
        }
        `}
      `}</style>
      <section 
        className="products-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
        style={style}
        data-edit-type="background"
      >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
          <h2 
            className="products-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
            data-edit-type="title"
            style={{
              fontSize: titleStyle.fontSize || '2.5rem',
              fontWeight: titleStyle.fontWeight || '700',
              color: titleStyle.color || 'inherit',
              textAlign: (titleStyle.textAlign as any) || 'center'
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p 
              className="products-subtitle px-2 cursor-pointer hover:opacity-60"
              data-edit-type="subtitle"
              style={{
                fontSize: subtitleStyle.fontSize || '1rem',
                color: subtitleStyle.color || '#6b7280'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className={`grid gap-4 sm:gap-6 ${gridCols}`}>
          {selectedProducts.map((product, i) => renderProduct(product, i))}
        </div>
      </div>
    </section>
    </>
  );
};

export default ProductsSection;
