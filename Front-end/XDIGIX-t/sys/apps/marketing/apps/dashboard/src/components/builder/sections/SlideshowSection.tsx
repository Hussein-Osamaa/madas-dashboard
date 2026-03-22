import { useState, useEffect, useRef, memo } from 'react';
import BlockWrapper from '../BlockWrapper';

export interface SlideshowSlide {
  image: string;
  heading: string;
  subheading: string;
  button_label: string;
  button_link: string;
  button_style: 'solid' | 'outline';
  content_position: string;   // 9-point grid: 'top-left' | 'top-center' | ... | 'bottom-right'
  text_alignment: 'left' | 'center' | 'right';
  overlay_opacity: number;
}

export interface SlideshowSectionData {
  slides: SlideshowSlide[];
  slide_height: 'small' | 'medium' | 'large' | 'full';
  autoplay: boolean;
  autoplay_speed: number;
  show_arrows: boolean;
  show_dots: boolean;
  transition: 'slide' | 'fade';
  color_scheme?: string;
  padding_top?: number;
  padding_bottom?: number;
}

type Props = {
  data: SlideshowSectionData;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const DEFAULT_SLIDES: SlideshowSlide[] = [
  {
    image: '',
    heading: 'Welcome to our store',
    subheading: 'Discover amazing products crafted just for you.',
    button_label: 'Shop Now',
    button_link: '#',
    button_style: 'solid',
    content_position: 'middle-center',
    text_alignment: 'center',
    overlay_opacity: 40,
  },
  {
    image: '',
    heading: 'New Arrivals',
    subheading: 'Check out the latest additions to our collection.',
    button_label: 'Explore',
    button_link: '#',
    button_style: 'solid',
    content_position: 'middle-left',
    text_alignment: 'left',
    overlay_opacity: 40,
  },
  {
    image: '',
    heading: 'Special Offers',
    subheading: 'Limited time deals you don\'t want to miss.',
    button_label: 'View Deals',
    button_link: '#',
    button_style: 'outline',
    content_position: 'bottom-center',
    text_alignment: 'center',
    overlay_opacity: 40,
  },
];

const PLACEHOLDER_COLORS = ['#2d3748', '#1a365d', '#22543d', '#744210', '#553c9a'];

// 9-point content position grid → flex-col alignment classes
// In flex-col: justify = vertical (start/center/end), items = horizontal (start/center/end)
const POSITION_MAP: Record<string, string> = {
  'top-left':      'justify-start items-start',
  'top-center':    'justify-start items-center',
  'top-right':     'justify-start items-end',
  'middle-left':   'justify-center items-start',
  'middle-center': 'justify-center items-center',
  'middle-right':  'justify-center items-end',
  'bottom-left':   'justify-end items-start',
  'bottom-center': 'justify-end items-center',
  'bottom-right':  'justify-end items-end',
};

const ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Button justify alignment derived from text alignment
const BTN_ALIGN_MAP: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const SlideshowSection = ({ data, style, isSelected = false, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const slides: SlideshowSlide[] = d.slides?.length > 0 ? d.slides : DEFAULT_SLIDES;
  const slideHeight = d.slide_height ?? 'large';
  const autoplay = d.autoplay ?? true;
  const autoplaySpeed = d.autoplay_speed ?? 5;
  const showArrows = d.show_arrows ?? true;
  const showDots = d.show_dots ?? true;
  const transition = d.transition ?? 'slide';
  const paddingTop = d.padding_top ?? 0;
  const paddingBottom = d.padding_bottom ?? 0;

  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideCount = slides.length;

  // Auto-advance
  useEffect(() => {
    if (autoplay && slideCount > 1) {
      timerRef.current = setInterval(() => {
        setCurrent(prev => (prev + 1) % slideCount);
      }, autoplaySpeed * 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [autoplay, autoplaySpeed, slideCount]);

  const goTo = (idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoplay && slideCount > 1) {
      timerRef.current = setInterval(() => {
        setCurrent(prev => (prev + 1) % slideCount);
      }, autoplaySpeed * 1000);
    }
    setTimeout(() => setIsAnimating(false), 600);
  };

  const prev = () => goTo((current - 1 + slideCount) % slideCount);
  const next = () => goTo((current + 1) % slideCount);

  const heightMap: Record<string, string> = {
    small: 'min-h-[300px]',
    medium: 'min-h-[450px]',
    large: 'min-h-[600px]',
    full: 'min-h-screen',
  };

  // Render slide content with position + alignment
  const renderSlideContent = (slide: SlideshowSlide, i: number) => {
    const posClasses = POSITION_MAP[slide.content_position || 'middle-center'] || POSITION_MAP['middle-center'];
    const textAlign = ALIGN_MAP[slide.text_alignment || 'center'];

    // BlockWrapper adds a <div> when selected that breaks flex layout.
    // We place BlockWrapper inside the full-size positioning container
    // and give it absolute positioning so it doesn't interfere with flex.
    return (
      <div className={`relative z-10 flex flex-col ${posClasses} w-full h-full px-8 sm:px-16 py-12`}>
        <BlockWrapper dataKey="slides" blockIndex={i} blockType="slide" isSelected={isSelected} onEdit={onEditBlock ?? (() => {})} onDelete={onDeleteBlock ?? (() => {})}>
          <div className={`max-w-2xl ${textAlign}`}>
            {slide.heading && (
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                {slide.heading}
              </h2>
            )}
            {slide.subheading && (
              <p className="text-base md:text-lg text-white/80 mb-8">
                {slide.subheading}
              </p>
            )}
            {slide.button_label && (
              <a
                href={slide.button_link || '#'}
                className={`inline-block px-8 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-300 ${
                  slide.button_style === 'outline'
                    ? 'border-2 border-white text-white hover:bg-white hover:text-black'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
                style={{ borderRadius: 'var(--btn-radius, 8px)' }}
              >
                {slide.button_label}
              </a>
            )}
          </div>
        </BlockWrapper>
      </div>
    );
  };

  // Render slide background (image or placeholder gradient)
  const renderSlideBg = (slide: SlideshowSlide, i: number) => (
    <>
      {slide.image ? (
        <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length]} 0%, ${PLACEHOLDER_COLORS[(i + 2) % PLACEHOLDER_COLORS.length]} 100%)` }} />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: (slide.overlay_opacity ?? 40) / 100 }} />
    </>
  );

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}
    >
      {/* Slides */}
      {transition === 'slide' ? (
        <div
          className="flex"
          style={{
            transform: `translateX(-${current * 100}%)`,
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {slides.map((slide, i) => (
            <div key={i} className={`relative w-full flex-shrink-0 ${heightMap[slideHeight] || heightMap.large} flex`}>
              {renderSlideBg(slide, i)}
              {renderSlideContent(slide, i)}
            </div>
          ))}
        </div>
      ) : (
        <div className={`relative ${heightMap[slideHeight] || heightMap.large}`}>
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 flex transition-opacity duration-700 ease-in-out ${
                i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {renderSlideBg(slide, i)}
              {renderSlideContent(slide, i)}
            </div>
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {showArrows && slideCount > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"
            aria-label="Previous slide"
          >
            <span className="material-icons" style={{ fontSize: 20 }}>chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"
            aria-label="Next slide"
          >
            <span className="material-icons" style={{ fontSize: 20 }}>chevron_right</span>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && slideCount > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-white scale-110'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide counter */}
      {slideCount > 1 && (
        <div className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
          {current + 1} / {slideCount}
        </div>
      )}
    </section>
  );
};

export default memo(SlideshowSection);
