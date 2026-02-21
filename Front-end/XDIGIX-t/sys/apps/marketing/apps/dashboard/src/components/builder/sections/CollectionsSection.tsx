import { useState, useRef, useEffect } from 'react';
import { CollectionsSectionData, SelectedCollection } from '../../../types/builder';

type Props = {
  data: CollectionsSectionData;
  style?: React.CSSProperties;
};

const defaultCardStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 16,
  showBorder: false,
  borderColor: '#e5e7eb',
  imageAspect: 'square' as const,
  imageFit: 'cover' as const,
  overlayColor: '#000000',
  overlayOpacity: 0.4,
  showName: true,
  showDescription: false,
  showProductCount: true,
  namePosition: 'overlay' as const,
  // Button defaults
  showButton: true,
  buttonText: 'EXPLORE COLLECTION',
  buttonBackgroundColor: 'rgba(255,255,255,0.2)',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 4,
  buttonHoverBackgroundColor: '#ffffff',
  buttonHoverTextColor: '#1f2937',
  buttonHoverEffect: 'fill' as const
};

const CollectionsSection = ({ data, style }: Props) => {
  const {
    title = 'Shop by Collection',
    subtitle = 'Browse our curated collections',
    layout = 'grid',
    columns = 4,
    selectedCollections = [],
    cardStyle = defaultCardStyle,
    titleStyle = {},
    subtitleStyle = {}
  } = data;

  // Merge with defaults
  const cs = { ...defaultCardStyle, ...cardStyle };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const collectionCount = selectedCollections.length;

  // Calculate items per view based on screen size
  const getItemsPerView = () => {
    if (typeof window === 'undefined') return columns;
    if (window.innerWidth < 640) return 2; // mobile - show 2
    if (window.innerWidth < 1024) return 3; // tablet
    return columns; // desktop
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());
  const maxIndex = Math.max(0, collectionCount - itemsPerView);

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerView = getItemsPerView();
      setItemsPerView(newItemsPerView);
      const newMaxIndex = Math.max(0, collectionCount - newItemsPerView);
      if (currentIndex > newMaxIndex) {
        setCurrentIndex(newMaxIndex);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collectionCount, currentIndex, columns]);

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

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  // Get aspect ratio class
  const getAspectClass = (aspect: string) => {
    switch (aspect) {
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      case 'wide': return 'aspect-[16/9]';
      default: return 'aspect-square';
    }
  };

  // Placeholder collections for preview when none selected
  const placeholderCollections: SelectedCollection[] = [
    { id: '1', name: 'New Arrivals', image: '', productCount: 24 },
    { id: '2', name: 'Best Sellers', image: '', productCount: 18 },
    { id: '3', name: 'Summer Collection', image: '', productCount: 32 },
    { id: '4', name: 'Sale', image: '', productCount: 45 }
  ];

  const collectionsToShow = selectedCollections.length > 0 ? selectedCollections : placeholderCollections;

  // Generate button hover CSS based on hover effect
  const getButtonHoverCSS = () => {
    const hoverEffect = cs.buttonHoverEffect || 'fill';
    const hoverBg = cs.buttonHoverBackgroundColor || '#ffffff';
    const hoverColor = cs.buttonHoverTextColor || '#1f2937';
    
    switch (hoverEffect) {
      case 'fill':
        return `
          .collection-btn {
            position: relative;
            overflow: hidden;
            z-index: 1;
          }
          .collection-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 100%;
            background-color: ${hoverBg};
            transition: width 0.3s ease;
            z-index: -1;
          }
          .collection-btn:hover::before {
            width: 100%;
          }
          .collection-btn:hover {
            color: ${hoverColor} !important;
            border-color: ${hoverBg} !important;
          }
        `;
      case 'scale':
        return `
          .collection-btn:hover {
            transform: scale(1.05);
            background-color: ${hoverBg} !important;
            color: ${hoverColor} !important;
          }
        `;
      case 'glow':
        return `
          .collection-btn:hover {
            box-shadow: 0 0 20px ${hoverBg}80, 0 0 40px ${hoverBg}40;
            background-color: ${hoverBg} !important;
            color: ${hoverColor} !important;
          }
        `;
      default:
        return `
          .collection-btn:hover {
            background-color: ${hoverBg} !important;
            color: ${hoverColor} !important;
          }
        `;
    }
  };

  const renderCollectionCard = (collection: SelectedCollection, index: number) => (
    <div
      key={collection.id || index}
      className="collection-card group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        backgroundColor: cs.backgroundColor,
        borderRadius: `${cs.borderRadius}px`,
        border: cs.showBorder ? `1px solid ${cs.borderColor}` : 'none'
      }}
      data-edit-type="collection-card"
      data-edit-index={index}
    >
      {/* Collection Image */}
      <div className={`${getAspectClass(cs.imageAspect)} relative overflow-hidden`}>
        {collection.image ? (
          <img
            src={collection.image}
            alt={collection.name}
            className="w-full h-full group-hover:scale-110 transition-transform duration-500"
            style={{ objectFit: cs.imageFit }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)' }}
          >
            <span className="material-icons text-white/50 text-5xl">collections</span>
          </div>
        )}
        
        {/* Overlay */}
        {cs.namePosition === 'overlay' && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 transition-opacity duration-300"
            style={{ 
              backgroundColor: cs.overlayColor,
              opacity: cs.overlayOpacity
            }}
          />
        )}
        
        {/* Overlay Content */}
        {cs.namePosition === 'overlay' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {cs.showName && (
              <h3 
                className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-lg"
              >
                {collection.name}
              </h3>
            )}
            {cs.showDescription && collection.description && (
              <p className="text-sm text-white/80 line-clamp-2 mb-2">
                {collection.description}
              </p>
            )}
            {cs.showProductCount && collection.productCount !== undefined && (
              <span className="text-sm text-white/70 font-medium mb-3">
                {collection.productCount} Products
              </span>
            )}
            {cs.showButton !== false && (
              <button 
                className="collection-btn px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-300 mt-2"
                style={{
                  backgroundColor: cs.buttonBackgroundColor || 'rgba(255,255,255,0.2)',
                  color: cs.buttonTextColor || '#ffffff',
                  borderRadius: `${cs.buttonBorderRadius || 4}px`,
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
                data-edit-type="collection-button"
              >
                {cs.buttonText || 'EXPLORE COLLECTION'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Below Image Content */}
      {cs.namePosition === 'below' && (
        <div className="p-4">
          {cs.showName && (
            <h3 
              className="text-base sm:text-lg font-semibold mb-1"
              style={{ color: cs.textColor }}
            >
              {collection.name}
            </h3>
          )}
          {cs.showDescription && collection.description && (
            <p 
              className="text-sm opacity-70 line-clamp-2 mb-2"
              style={{ color: cs.textColor }}
            >
              {collection.description}
            </p>
          )}
          {cs.showProductCount && collection.productCount !== undefined && (
            <span 
              className="text-sm opacity-60"
              style={{ color: cs.textColor }}
            >
              {collection.productCount} Products
            </span>
          )}
          {cs.showButton !== false && (
            <button 
              className="collection-btn w-full mt-3 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-300"
              style={{
                backgroundColor: cs.buttonBackgroundColor || '#27491F',
                color: cs.buttonTextColor || '#ffffff',
                borderRadius: `${cs.buttonBorderRadius || 4}px`
              }}
              data-edit-type="collection-button"
            >
              {cs.buttonText || 'EXPLORE COLLECTION'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Show placeholder when no collections
  if (collectionsToShow.length === 0) {
    return (
      <section 
        className="collections-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
        style={style}
        data-edit-type="background"
      >
        <style>{getButtonHoverCSS()}</style>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
            <h2 
              className="collections-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
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
                className="collections-subtitle px-2 cursor-pointer hover:opacity-60"
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
            className="collections-placeholder text-center py-12 border-2 border-dashed border-current/30 rounded-xl bg-current/5 cursor-pointer hover:border-current/50"
            data-edit-type="collection"
          >
            <span className="material-icons text-5xl opacity-50 mb-4 block">collections</span>
            <p className="opacity-70 font-medium">No collections selected</p>
            <p className="opacity-50 text-sm mt-1">Click here to select collections</p>
          </div>
        </div>
      </section>
    );
  }

  // Carousel Layout
  if (layout === 'carousel') {
    return (
      <section 
        className="collections-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300 relative"
        style={style}
        data-edit-type="background"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
            <h2 
              className="collections-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
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
                className="collections-subtitle px-2 cursor-pointer hover:opacity-60"
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
                aria-label="Previous collections"
              >
                <span className="material-icons text-gray-700 text-xl sm:text-2xl">chevron_left</span>
              </button>
            )}
            
            {currentIndex < maxIndex && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 z-10 bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200"
                aria-label="Next collections"
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
                  transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                  gap: '1rem',
                  width: '100%'
                }}
              >
                {collectionsToShow.map((collection, i) => {
                  const cardWidth = `calc((100% - ${(itemsPerView - 1) * 16}px) / ${itemsPerView})`;
                  return (
                    <div
                      key={collection.id || i}
                      className="flex-shrink-0"
                      style={{ 
                        width: cardWidth,
                        minWidth: cardWidth,
                        maxWidth: cardWidth
                      }}
                    >
                      {renderCollectionCard(collection, i)}
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

  // Featured Layout - First item large, rest smaller
  if (layout === 'featured') {
    const [featured, ...rest] = collectionsToShow;
    return (
      <section 
        className="collections-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
        style={style}
        data-edit-type="background"
      >
        <style>{getButtonHoverCSS()}</style>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
            <h2 
              className="collections-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
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
                className="collections-subtitle px-2 cursor-pointer hover:opacity-60"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Featured Large Card */}
            <div className="lg:row-span-2">
              <div
                className="collection-card group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl h-full"
                style={{
                  backgroundColor: cs.backgroundColor,
                  borderRadius: `${cs.borderRadius}px`,
                  border: cs.showBorder ? `1px solid ${cs.borderColor}` : 'none',
                  minHeight: '400px'
                }}
                data-edit-type="collection-card"
                data-edit-index={0}
              >
                <div className="absolute inset-0">
                  {featured?.image ? (
                    <img
                      src={featured.image}
                      alt={featured.name}
                      className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                      style={{ objectFit: cs.imageFit }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)' }}
                    >
                      <span className="material-icons text-white/50 text-7xl">collections</span>
                    </div>
                  )}
                </div>
                <div 
                  className="absolute inset-0"
                  style={{ 
                    backgroundColor: cs.overlayColor,
                    opacity: cs.overlayOpacity
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  {cs.showName && (
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                      {featured?.name}
                    </h3>
                  )}
                  {cs.showDescription && featured?.description && (
                    <p className="text-base text-white/80 line-clamp-2 mb-3 max-w-md">
                      {featured.description}
                    </p>
                  )}
                  {cs.showProductCount && featured?.productCount !== undefined && (
                    <span className="text-base text-white/70 font-medium">
                      {featured.productCount} Products
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Smaller Cards */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {rest.slice(0, 4).map((collection, i) => renderCollectionCard(collection, i + 1))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Grid Layout (default)
  const gridCols = 
    columns === 2 ? 'grid-cols-2' :
    columns === 3 ? 'grid-cols-2 sm:grid-cols-3' :
    columns === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' :
    columns === 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <section 
      className="collections-section w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
      style={style}
      data-edit-type="background"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-12" style={{ textAlign: (titleStyle.textAlign as any) || 'center' }}>
          <h2 
            className="collections-title mb-3 sm:mb-4 cursor-pointer hover:opacity-80"
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
              className="collections-subtitle px-2 cursor-pointer hover:opacity-60"
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
          {collectionsToShow.map((collection, i) => renderCollectionCard(collection, i))}
        </div>
      </div>
    </section>
  );
};

export default CollectionsSection;
