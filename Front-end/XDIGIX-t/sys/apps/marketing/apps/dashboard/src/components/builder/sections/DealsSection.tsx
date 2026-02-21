import { useState, useEffect, useRef } from 'react';
import { DealsSectionData, SelectedProduct } from '../../../types/builder';
import { useCurrency } from '../../../hooks/useCurrency';

type Props = {
  data: DealsSectionData;
  style?: React.CSSProperties;
};

const defaultCardStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  descriptionColor: '#6b7280',
  priceColor: '#1f2937',
  borderRadius: 8,
  showBorder: true,
  borderColor: '#e5e7eb',
  imageBackgroundColor: '#f3f4f6',
  buttonBackgroundColor: '#F0CAE1',
  buttonTextColor: '#27491F',
  buttonBorderRadius: 6
};

const defaultCountdownStyle = {
  backgroundColor: '#1f2937',
  textColor: '#ffffff',
  labelColor: '#9ca3af',
  borderRadius: 8,
  style: 'modern' as 'modern' | 'minimal' | 'boxed' | 'urgent'
};

const DealsSection = ({ data, style }: Props) => {
  const { formatCurrency } = useCurrency();
  
  const {
    title = 'DEAL OF THE DAY',
    viewMoreText = 'VIEW MORE',
    viewMoreLink = '#',
    selectedProducts = [],
    columns = 4,
    showCountdown = false,
    countdownEndDate = '',
    countdownStyle = defaultCountdownStyle,
    cardStyle = defaultCardStyle
  } = data;

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isUrgent, setIsUrgent] = useState(false);
  const prevSecondsRef = useRef(0);
  const [animate, setAnimate] = useState(false);

  // Calculate countdown
  useEffect(() => {
    if (!showCountdown || !countdownEndDate) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(countdownEndDate).getTime();
      const now = new Date().getTime();
      const difference = endDate - now;

      if (difference > 0) {
        const newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        };
        
        // Check if seconds changed for animation
        if (newTimeLeft.seconds !== prevSecondsRef.current) {
          setAnimate(true);
          setTimeout(() => setAnimate(false), 300);
          prevSecondsRef.current = newTimeLeft.seconds;
        }
        
        // Set urgent if less than 1 hour remaining
        setIsUrgent(difference < 1000 * 60 * 60);
        setTimeLeft(newTimeLeft);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [showCountdown, countdownEndDate]);

  // Merge with defaults
  const cs = { ...defaultCardStyle, ...cardStyle };
  const ctStyle = { ...defaultCountdownStyle, ...countdownStyle };

  // Grid columns based on selection
  const gridCols = columns === 2 
    ? 'grid-cols-1 sm:grid-cols-2' 
    : columns === 3 
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  // Placeholder products for preview when none selected
  const placeholderProducts: SelectedProduct[] = [
    { id: '1', name: 'Classic Platform', price: 129, description: 'Bold floral pattern with attitude' },
    { id: '2', name: 'Retro High-Tops', price: 89, description: 'Timeless design with modern edge' },
    { id: '3', name: 'Performance Boost', price: 159, description: 'Innovation meets street style' },
    { id: '4', name: 'Premium Collection', price: 199, description: 'Elevated style with bold presence' }
  ];

  const productsToShow = selectedProducts.length > 0 ? selectedProducts : placeholderProducts;

  // Pad number with leading zero
  const padNumber = (num: number) => num.toString().padStart(2, '0');

  // Get countdown colors based on urgency and style
  const getCountdownColors = () => {
    if (isUrgent && ctStyle.style !== 'minimal') {
      return {
        bg: '#dc2626',
        text: '#ffffff',
        label: 'rgba(255,255,255,0.8)'
      };
    }
    return {
      bg: ctStyle.backgroundColor,
      text: ctStyle.textColor,
      label: ctStyle.labelColor
    };
  };

  const colors = getCountdownColors();

  // Render countdown based on style
  const renderCountdown = () => {
    const countdownStyle = ctStyle.style || 'modern';
    
    const TimeUnit = ({ value, label }: { value: number; label: string }) => {
      switch (countdownStyle) {
        case 'boxed':
          return (
            <div className="flex flex-col items-center">
              <div 
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg font-bold text-lg sm:text-xl ${animate ? 'scale-110' : 'scale-100'} transition-transform`}
                style={{ 
                  backgroundColor: `${colors.text}15`,
                  color: colors.text
                }}
              >
                {padNumber(value)}
              </div>
              <span className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: colors.label }}>{label}</span>
            </div>
          );
        
        case 'minimal':
          return (
            <div className="flex items-baseline gap-0.5">
              <span className="font-mono font-bold text-lg" style={{ color: colors.text }}>{padNumber(value)}</span>
              <span className="text-[10px] uppercase" style={{ color: colors.label }}>{label.charAt(0)}</span>
            </div>
          );
        
        case 'urgent':
          return (
            <div className="flex flex-col items-center">
              <div 
                className={`relative px-3 py-2 rounded ${animate ? 'animate-pulse' : ''}`}
                style={{ 
                  background: `linear-gradient(135deg, ${colors.bg} 0%, ${isUrgent ? '#ef4444' : colors.bg} 100%)`
                }}
              >
                <span className="font-mono font-bold text-xl" style={{ color: colors.text }}>{padNumber(value)}</span>
              </div>
              <span className="text-[9px] mt-1 uppercase tracking-widest" style={{ color: colors.label }}>{label}</span>
            </div>
          );
        
        default: // modern
          return (
            <div className="flex flex-col items-center min-w-[40px]">
              <span 
                className={`font-mono font-bold text-xl sm:text-2xl ${animate && label === 'sec' ? 'scale-110' : 'scale-100'} transition-transform`}
                style={{ color: colors.text }}
              >
                {padNumber(value)}
              </span>
              <span className="text-[9px] uppercase tracking-wider opacity-70" style={{ color: colors.label }}>{label}</span>
            </div>
          );
      }
    };

    const Separator = () => {
      if (countdownStyle === 'minimal') {
        return <span className="mx-1 opacity-50" style={{ color: colors.text }}>·</span>;
      }
      if (countdownStyle === 'boxed' || countdownStyle === 'urgent') {
        return <span className="text-xl font-bold mx-1 self-start mt-3" style={{ color: colors.text }}>:</span>;
      }
      return (
        <div className="flex flex-col items-center justify-center px-1">
          <div className="w-1 h-1 rounded-full mb-1" style={{ backgroundColor: colors.text, opacity: 0.6 }}></div>
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.6 }}></div>
        </div>
      );
    };

    return (
      <div 
        className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg deals-countdown ${isUrgent && countdownStyle !== 'minimal' ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: countdownStyle === 'minimal' ? 'transparent' : colors.bg,
          borderRadius: `${ctStyle.borderRadius}px`,
          border: countdownStyle === 'minimal' ? `1px solid ${colors.text}30` : 'none'
        }}
        data-edit-type="countdown"
      >
        {countdownStyle !== 'minimal' && (
          <span 
            className="material-icons text-base sm:text-lg mr-1" 
            style={{ color: colors.text }}
          >
            {isUrgent ? 'warning' : 'timer'}
          </span>
        )}
        
        <div className="flex items-center">
          <TimeUnit value={timeLeft.days} label="days" />
          <Separator />
          <TimeUnit value={timeLeft.hours} label="hrs" />
          <Separator />
          <TimeUnit value={timeLeft.minutes} label="min" />
          <Separator />
          <TimeUnit value={timeLeft.seconds} label="sec" />
        </div>
      </div>
    );
  };

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 transition-all duration-300"
      style={style}
      data-edit-type="background"
    >
      {/* Custom styles for animations */}
      <style>{`
        @keyframes countdown-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .deals-countdown.animate-pulse {
          animation: countdown-pulse 1s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header with title, countdown, and View More button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h2 
              className="text-xl sm:text-2xl md:text-3xl font-bold italic tracking-wide deals-title"
              style={{ fontStyle: 'italic' }}
              data-edit-type="title"
            >
              {title}
            </h2>
            
            {/* Countdown Timer */}
            {showCountdown && renderCountdown()}
          </div>
          
          {/* View More button - only show if text exists */}
          {viewMoreText && viewMoreText.trim() && (
            <a
              href={viewMoreLink || '#'}
              className="px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all hover:opacity-80 deals-button"
              style={{
                backgroundColor: '#1f2937',
                color: '#ffffff',
                borderRadius: '4px'
              }}
              data-edit-type="deals-button"
            >
              {viewMoreText}
            </a>
          )}
        </div>

        {/* Divider line */}
        <div className="border-t border-gray-300 mb-8" />

        {/* Products Grid */}
        <div className={`grid gap-4 sm:gap-6 ${gridCols}`} data-edit-type="deals-grid">
          {productsToShow.map((product, index) => (
            <div
              key={product.id || index}
              className="group transition-all duration-300 hover:-translate-y-1 deals-card"
              style={{
                backgroundColor: cs.backgroundColor,
                borderRadius: `${cs.borderRadius}px`,
                border: cs.showBorder ? `1px solid ${cs.borderColor}` : 'none',
                overflow: 'hidden'
              }}
              data-edit-type="deals-card"
              data-edit-index={index}
            >
              {/* Product Image */}
              <div 
                className="aspect-square overflow-hidden flex items-center justify-center deals-image"
                style={{ backgroundColor: cs.imageBackgroundColor || '#f3f4f6' }}
                data-edit-type="deals-image"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    style={{ objectFit: (cs as any).imageFit || 'contain' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-icons text-5xl text-gray-300">image</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 
                  className="text-base sm:text-lg font-semibold mb-1 line-clamp-1 deals-product-name"
                  style={{ color: cs.textColor }}
                  data-edit-type="deals-product-name"
                >
                  {product.name}
                </h3>
                <p 
                  className="text-sm mb-3 line-clamp-1 deals-description"
                  style={{ color: cs.descriptionColor }}
                  data-edit-type="deals-description"
                >
                  {product.description || 'Premium quality product'}
                </p>

                {/* Price and Add to Cart Row */}
                <div className="flex items-center justify-between">
                  <span 
                    className="text-base sm:text-lg font-semibold deals-price"
                    style={{ color: cs.priceColor }}
                    data-edit-type="deals-price"
                  >
                    {formatCurrency(product.sellingPrice || product.price || 0)}
                  </span>
                  <button
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium transition-all hover:opacity-90 deals-add-button"
                    style={{
                      backgroundColor: cs.buttonBackgroundColor,
                      color: cs.buttonTextColor,
                      borderRadius: `${cs.buttonBorderRadius}px`
                    }}
                    data-edit-type="deals-add-button"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show message when no products selected */}
        {selectedProducts.length === 0 && (
          <p className="text-center text-sm opacity-50 mt-4">
            Click to select products for this section
          </p>
        )}
      </div>
    </section>
  );
};

export default DealsSection;
