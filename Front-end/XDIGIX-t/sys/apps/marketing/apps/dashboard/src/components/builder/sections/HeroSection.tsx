import { useState, useEffect, useRef } from 'react';
import { HeroSectionData } from '../../../types/builder';

type Props = {
  data: HeroSectionData;
  style?: React.CSSProperties;
};

const HeroSection = ({ data, style }: Props) => {
  const {
    layout = 'default',
    isCarousel = false,
    slides = [],
    title = 'Welcome to Our Store',
    subtitle = 'Discover amazing products',
    buttonText = 'Shop Now',
    buttonLink = '#',
    backgroundImage = '',
    backgroundColor = 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
    textColor = '#FFFFFF',
    autoplay = false,
    autoplayInterval = 5000,
    showNavigation = true,
    showIndicators = true
  } = data as any;

  const isMinimal = layout === 'minimal';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prepare slides array
  const heroSlides = isCarousel && slides && slides.length > 0
    ? slides
    : [{
        title,
        subtitle,
        buttonText,
        buttonLink,
        backgroundImage,
        backgroundColor,
        textColor
      }];

  const totalSlides = heroSlides.length;
  const maxSlideIndex = totalSlides - 1;

  // Autoplay functionality
  useEffect(() => {
    if (isCarousel && autoplay && totalSlides > 1) {
      autoplayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1));
      }, autoplayInterval);

      return () => {
        if (autoplayRef.current) {
          clearInterval(autoplayRef.current);
        }
      };
    }
  }, [isCarousel, autoplay, totalSlides, maxSlideIndex, autoplayInterval]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? maxSlideIndex : prev - 1));
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1));
      }, autoplayInterval);
    }
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1));
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1));
      }, autoplayInterval);
    }
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

  const currentSlideData = heroSlides[currentSlide] || heroSlides[0];
  
  // Get text styles - prefer slide-specific styles, fall back to global styles
  const textStyle = currentSlideData.textStyle || data.textStyle || {};
  // Note: textColor is now handled via HTML spans in the title/subtitle content
  // We only use it as a fallback base color if no spans are present
  const baseTextColor = currentSlideData.textColor || '#FFFFFF';
  const titleHasHTML = currentSlideData.title && /<[^>]+>/.test(currentSlideData.title);
  const subtitleHasHTML = currentSlideData.subtitle && /<[^>]+>/.test(currentSlideData.subtitle);
  
  const titleStyle = {
    fontSize: textStyle.titleFontSize ? `${textStyle.titleFontSize}px` : undefined,
    fontWeight: textStyle.titleFontWeight || undefined,
    textAlign: textStyle.titleAlignment || 'center' as const,
    color: titleHasHTML ? undefined : baseTextColor // Only set base color if no HTML spans
  };
  const subtitleStyle = {
    fontSize: textStyle.subtitleFontSize ? `${textStyle.subtitleFontSize}px` : undefined,
    fontWeight: textStyle.subtitleFontWeight || undefined,
    textAlign: textStyle.subtitleAlignment || 'center' as const,
    color: subtitleHasHTML ? undefined : baseTextColor, // Only set base color if no HTML spans
    opacity: subtitleHasHTML ? undefined : 0.9 // Remove opacity when HTML is used (let spans control it)
  };
  const buttonStyle = textStyle.buttonStyle || {};

  const backgroundStyle = currentSlideData.backgroundImage
    ? {
        backgroundImage: `url(${currentSlideData.backgroundImage})`,
        backgroundSize: currentSlideData.backgroundSize || data.backgroundSize || 'cover',
        backgroundPosition: currentSlideData.backgroundPosition || data.backgroundPosition || 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {
        background: currentSlideData.backgroundColor
      };

  // Get button variant for styling - default to 'outlined' for minimal layout
  const buttonVariant = buttonStyle.variant || (isMinimal ? 'outlined' : 'filled');
  
  // Button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = {
      borderRadius: buttonStyle.borderRadius ? `${buttonStyle.borderRadius}px` : '0',
      fontSize: buttonStyle.fontSize ? `${buttonStyle.fontSize}px` : undefined,
      fontWeight: buttonStyle.fontWeight || '500',
      padding: buttonStyle.padding || '1rem 2.5rem',
      transition: 'all 0.3s ease',
      ...(!buttonStyle.fontSize ? { fontSize: 'inherit' } : {})
    };

    // Outlined variant - transparent with border
    if (buttonVariant === 'outlined') {
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        color: buttonStyle.textColor || '#FFFFFF',
        border: `1px solid ${buttonStyle.textColor || '#FFFFFF'}`,
        boxShadow: 'none'
      };
    }
    
    // Ghost variant - transparent with no border (text only)
    if (buttonVariant === 'ghost') {
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        color: buttonStyle.textColor || '#FFFFFF',
        border: 'none',
        boxShadow: 'none',
        textDecoration: 'underline',
        textUnderlineOffset: '4px'
      };
    }

    // Filled variant - solid background
    return {
      ...baseStyles,
      backgroundColor: buttonStyle.backgroundColor || '#FFFFFF',
      color: buttonStyle.textColor || (currentSlideData.backgroundColor?.includes?.('#27491F') ? '#27491F' : '#000'),
      border: 'none',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    };
  };

  // Get button color for hover effect
  const buttonTextColor = buttonStyle.textColor || '#FFFFFF';
  const buttonHoverEffect = buttonStyle.hoverEffect || 'fill';
  const buttonHoverBgColor = buttonStyle.hoverBackgroundColor || buttonTextColor;
  const buttonHoverTextColor = buttonStyle.hoverTextColor || (isMinimal ? '#1a1a1a' : currentSlideData.backgroundColor || '#000');

  return (
    <section
      className={`hero-section relative w-full text-center overflow-hidden ${
        isMinimal 
          ? 'min-h-[100vh] flex items-center justify-center' 
          : 'py-12 sm:py-16 md:py-20 lg:py-32'
      } px-4 sm:px-6`}
      style={style}
      onTouchStart={isCarousel ? handleTouchStart : undefined}
      onTouchMove={isCarousel ? handleTouchMove : undefined}
      onTouchEnd={isCarousel ? handleTouchEnd : undefined}
      data-edit-type="background"
    >
      {/* Button hover effects - Left to Right Fill Animation */}
      <style>{`
        .hero-button {
          position: relative;
          overflow: hidden;
          z-index: 1;
        }
        .hero-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          background: ${buttonTextColor};
          transition: width 0.4s ease;
          z-index: -1;
        }
        .hero-button:hover::before {
          width: 100%;
        }
        .hero-button-outlined {
          transition: color 0.4s ease, border-color 0.3s ease;
        }
        .hero-button-outlined:hover {
          color: ${isMinimal ? '#1a1a1a' : (currentSlideData.backgroundColor?.includes?.('gradient') ? '#000' : currentSlideData.backgroundColor || '#000')} !important;
          border-color: ${buttonTextColor} !important;
        }
        .hero-button-ghost {
          transition: opacity 0.3s ease;
        }
        .hero-button-ghost::before {
          display: none;
        }
        .hero-button-ghost:hover {
          opacity: 0.7 !important;
        }
        .hero-button-filled {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hero-button-filled:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
        }
      `}</style>
      {/* Background with fade transition */}
      <div
        key={currentSlide}
        className="hero-background absolute inset-0 transition-opacity duration-700 ease-in-out z-0"
        style={backgroundStyle}
        data-edit-type="background"
      />
      {currentSlideData.backgroundImage && !isMinimal && (
        <div 
          key={`overlay-${currentSlide}`}
          className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out"
          style={{ 
            background: currentSlideData.backgroundColor || 'rgba(0, 0, 0, 0.3)',
            opacity: 0.4
          }}
        />
      )}

      {/* Navigation Arrows - Only show for carousel with multiple slides */}
      {isCarousel && totalSlides > 1 && showNavigation && (
        <>
          <button
            onClick={handlePrev}
            className={`carousel-nav absolute left-4 sm:left-8 z-20 transition-all duration-300 hover:scale-110 ${
              isMinimal 
                ? 'bottom-8 top-auto -translate-y-0 bg-transparent text-white/70 hover:text-white p-2' 
                : 'top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl border border-gray-200'
            }`}
            aria-label="Previous slide"
            data-edit-type="icon"
          >
            <span className={`material-icons ${isMinimal ? 'text-2xl' : 'text-primary text-xl sm:text-2xl'}`}>chevron_left</span>
          </button>
          
          <button
            onClick={handleNext}
            className={`carousel-nav absolute right-4 sm:right-8 z-20 transition-all duration-300 hover:scale-110 ${
              isMinimal 
                ? 'bottom-8 top-auto -translate-y-0 bg-transparent text-white/70 hover:text-white p-2' 
                : 'top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl border border-gray-200'
            }`}
            aria-label="Next slide"
            data-edit-type="icon"
          >
            <span className={`material-icons ${isMinimal ? 'text-2xl' : 'text-primary text-xl sm:text-2xl'}`}>chevron_right</span>
          </button>
        </>
      )}

      <div className={`relative z-10 ${isMinimal ? 'flex flex-col items-center justify-center' : 'max-w-4xl mx-auto'}`}>
        <div className="transition-opacity duration-500 ease-in-out">
          {/* Title - Hidden in minimal layout */}
          {!isMinimal && (
            <h1 
              className={`hero-title mb-4 sm:mb-6 leading-tight cursor-pointer hover:opacity-80 transition-opacity ${
                !textStyle.titleFontSize 
                  ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl' 
                  : ''
              } ${
                !textStyle.titleFontWeight 
                  ? 'font-bold' 
                  : ''
              }`}
              style={titleStyle}
              data-edit-type="title"
              dangerouslySetInnerHTML={{ __html: currentSlideData.title || 'Welcome to Our Store' }}
            />
          )}
          
          {/* Subtitle - Hidden in minimal layout */}
          {!isMinimal && (
            <p 
              className={`hero-subtitle mb-6 sm:mb-8 px-2 cursor-pointer hover:opacity-80 transition-opacity ${
                !subtitleHasHTML ? 'opacity-90' : ''
              } ${
                !textStyle.subtitleFontSize 
                  ? 'text-base sm:text-lg md:text-xl' 
                  : ''
              }`}
              style={subtitleStyle}
              data-edit-type="subtitle"
              dangerouslySetInnerHTML={{ __html: currentSlideData.subtitle || 'Discover amazing products' }}
            />
          )}
          
          {/* Button */}
          {currentSlideData.buttonText && (
            <a
              href={currentSlideData.buttonLink || '#'}
              className={`hero-button hero-button-${buttonVariant} inline-block transition-all duration-300 ${
                isMinimal ? 'text-sm sm:text-base tracking-wider uppercase' : ''
              }`}
              style={getButtonStyles()}
              data-edit-type="button"
            >
              {currentSlideData.buttonText}
            </a>
          )}
        </div>
      </div>

      {/* Carousel Indicators */}
      {isCarousel && totalSlides > 1 && showIndicators && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-20 flex gap-2 ${
          isMinimal ? 'bottom-8' : 'bottom-4 sm:bottom-8'
        }`}>
          {heroSlides.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                isMinimal
                  ? index === currentSlide
                    ? 'bg-white w-2 h-2'
                    : 'bg-white/40 w-2 h-2 hover:bg-white/60'
                  : index === currentSlide
                    ? 'bg-white w-6 sm:w-8 h-2 sm:h-2.5'
                    : 'bg-white/50 w-2 sm:w-2.5 h-2 sm:h-2.5 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroSection;

