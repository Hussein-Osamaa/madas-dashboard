import { useState, useEffect, useRef, memo, Fragment } from 'react';
import { HeroSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = {
  data: HeroSectionData;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const HeroSection = ({ data, style, isSelected = false, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  // Settings
  const image = d.image || d.backgroundImage || '';
  const image2 = d.image_2 || '';
  const overlayOpacity = d.image_overlay_opacity ?? 0;
  const imageHeight = d.image_height ?? d.height ?? 'medium';
  const animation = d.animation ?? 'none';
  const contentPosition = d.desktop_content_position ?? 'middle-center';
  const contentAlignment = d.desktop_content_alignment ?? 'center';
  const showTextBox = d.show_text_box ?? false;

  // Mobile layout
  const mobileStackImages = d.mobile_stack_images ?? false;
  const mobileContentAlignment = d.mobile_content_alignment ?? 'center';
  const mobileShowContainer = d.mobile_show_container ?? false;

  // Blocks data — rendered in array order
  const blocks: any[] = d.blocks ?? [];

  // Also support carousel
  const isCarousel = d.isCarousel ?? false;
  const slides = d.slides ?? [];
  const autoplay = d.autoplay ?? false;
  const autoplayInterval = d.autoplayInterval ?? 5000;

  const [currentSlide, setCurrentSlide] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const heroSlides = isCarousel && slides.length > 0 ? slides : null;

  useEffect(() => {
    if (isCarousel && autoplay && heroSlides && heroSlides.length > 1) {
      autoplayRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % heroSlides.length);
      }, autoplayInterval);
      return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
    }
  }, [isCarousel, autoplay, autoplayInterval, heroSlides?.length]);

  // Animation: intersection observer for entrance animations
  useEffect(() => {
    if (animation === 'none') { setIsVisible(true); return; }
    const el = sectionRef.current;
    if (!el) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animation]);

  // Height classes
  const heightMap: Record<string, string> = {
    small: 'min-h-[300px]',
    medium: 'min-h-[450px]',
    large: 'min-h-[600px]',
    full: 'min-h-screen',
  };

  // Content position mapping (flex-col: justify = vertical, items = horizontal)
  const posMap: Record<string, string> = {
    'top-left': 'justify-start items-start',
    'top-center': 'justify-start items-center',
    'top-right': 'justify-start items-end',
    'middle-left': 'justify-center items-start',
    'middle-center': 'justify-center items-center',
    'middle-right': 'justify-center items-end',
    'bottom-left': 'justify-end items-start',
    'bottom-center': 'justify-end items-center',
    'bottom-right': 'justify-end items-end',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const mobileAlignMap: Record<string, string> = {
    left: 'max-md:text-left',
    center: 'max-md:text-center',
    right: 'max-md:text-right',
  };

  const headingSizeMap: Record<string, string> = {
    h2: 'text-2xl md:text-3xl',
    h1: 'text-3xl md:text-5xl',
    h0: 'text-4xl md:text-6xl',
    hxl: 'text-5xl md:text-7xl',
    hxxl: 'text-6xl md:text-8xl',
  };

  // Animation CSS class
  const getAnimationStyle = (): React.CSSProperties => {
    if (animation === 'none') return {};
    const base: React.CSSProperties = { transition: 'opacity 0.8s ease, transform 0.8s ease' };
    if (!isVisible) {
      switch (animation) {
        case 'fade-in': return { ...base, opacity: 0 };
        case 'slide-up': return { ...base, opacity: 0, transform: 'translateY(40px)' };
        case 'zoom-in': return { ...base, opacity: 0, transform: 'scale(0.95)' };
        default: return base;
      }
    }
    return { ...base, opacity: 1, transform: 'translateY(0) scale(1)' };
  };

  // Parallax: applied to background image only
  const parallaxStyle = animation === 'parallax' ? { backgroundAttachment: 'fixed' as const } : {};

  const wrapBlock = (blockIndex: number, blockType: string, children: React.ReactNode) => {
    if (!isSelected) return <Fragment key={`block-${blockIndex}`}>{children}</Fragment>;
    return (
      <BlockWrapper key={`block-${blockIndex}`} dataKey="blocks" blockIndex={blockIndex} blockType={blockType} isSelected={isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
        {children}
      </BlockWrapper>
    );
  };

  // Fallback placeholder image when no user image is set
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop';
  const displayImage = image || FALLBACK_IMAGE;

  const renderContent = (slideData?: any) => {
    const bg = slideData?.backgroundColor || d.backgroundColor || '';
    const txt = slideData?.textColor || d.textColor || '#FFFFFF';
    const hasSecondImage = !slideData && image2;

    // Button alignment derived from text alignment
    const btnAlignMap: Record<string, string> = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };
    const btnJustify = btnAlignMap[contentAlignment] || 'justify-center';

    const posClasses = posMap[contentPosition] || posMap['middle-center'];
    const textAlign = alignMap[contentAlignment] || 'text-center';
    const mobileTextAlign = mobileAlignMap[mobileContentAlignment] || '';

    return (
      <div className={`relative w-full flex flex-col ${heightMap[imageHeight] || heightMap.medium}`}
        style={{
          backgroundColor: !displayImage && !slideData?.backgroundImage ? (bg || '#121212') : undefined,
          ...style,
          ...getAnimationStyle(),
        }}
      >
        {/* Background image(s) */}
        {hasSecondImage ? (
          <div className={`absolute inset-0 flex ${mobileStackImages ? 'max-md:flex-col' : ''}`}>
            <div className="flex-1 relative overflow-hidden">
              <img src={displayImage} alt="" className="w-full h-full object-cover" style={parallaxStyle} />
            </div>
            <div className="flex-1 relative overflow-hidden">
              <img src={image2} alt="" className="w-full h-full object-cover" style={parallaxStyle} />
            </div>
          </div>
        ) : (displayImage || slideData?.backgroundImage) ? (
          <div className="absolute inset-0">
            <img
              src={slideData?.backgroundImage || displayImage}
              alt=""
              className="w-full h-full object-cover"
              style={parallaxStyle}
            />
          </div>
        ) : null}

        {/* Overlay */}
        {overlayOpacity > 0 && (
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />
        )}

        {/* Positioning container — flex-col fills the whole slide area */}
        <div className={`relative z-10 flex flex-col ${posClasses} w-full flex-1 px-8 sm:px-16 py-12`}>
          <div className={`max-w-2xl ${textAlign} ${mobileTextAlign} ${
            showTextBox || mobileShowContainer
              ? `${showTextBox ? 'md:bg-white/90 md:backdrop-blur-sm md:p-6' : ''} ${mobileShowContainer ? 'max-md:bg-white/90 max-md:backdrop-blur-sm max-md:p-5' : ''}`
              : ''
          }`}>
            {blocks.map((block: any, idx: number) => {
              if (block.type === 'heading') {
                const h = slideData?.title || block.text || d.title || 'Image banner';
                const hSize = block.heading_size || 'h1';
                return wrapBlock(idx, 'heading',
                  <h2 className={`${headingSizeMap[hSize] || headingSizeMap.h1} font-bold leading-tight mb-3`}
                    style={{ color: (showTextBox || mobileShowContainer) ? '#121212' : txt }}>
                    {h}
                  </h2>
                );
              }
              if (block.type === 'text') {
                const t = slideData?.subtitle || block.text || d.subtitle || '';
                if (!t) return null;
                return wrapBlock(idx, 'text',
                  <p className="text-base md:text-lg mb-6 opacity-80"
                    style={{ color: (showTextBox || mobileShowContainer) ? '#121212' : txt }}>
                    {t}
                  </p>
                );
              }
              if (block.type === 'buttons') {
                const b1Text = slideData?.buttonText || block.button_label_1 || d.buttonText || '';
                const b1Link = block.button_link_1 || d.buttonLink || '#';
                const b2Text = slideData ? '' : (block.button_label_2 || d.secondaryButtonText || '');
                const b2Link = block.button_link_2 || d.secondaryButtonLink || '#';
                const bSec1 = block.button_style_1 === 'outline';
                const bSec2 = block.button_style_2 === 'outline' || block.button_style_secondary_2 !== false;
                return wrapBlock(idx, 'buttons',
                  <div className={`flex flex-wrap gap-3 ${btnJustify} ${mobileContentAlignment === 'center' ? 'max-md:justify-center' : mobileContentAlignment === 'right' ? 'max-md:justify-end' : 'max-md:justify-start'}`}>
                    {b1Text && (
                      <a href={b1Link} className={`inline-block px-8 py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                        bSec1
                          ? 'border border-current bg-transparent'
                          : showTextBox ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]'
                      }`} style={bSec1 ? { color: showTextBox ? '#121212' : txt } : {}}>
                        {b1Text}
                      </a>
                    )}
                    {b2Text && (
                      <a href={b2Link} className={`inline-block px-8 py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                        bSec2
                          ? 'border border-current bg-transparent'
                          : showTextBox ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]'
                      }`} style={bSec2 ? { color: showTextBox ? '#121212' : txt } : {}}>
                        {b2Text}
                      </a>
                    )}
                  </div>
                );
              }
              if (block.type === 'email_signup') {
                const placeholder = block.placeholder || 'Email';
                const btnLabel = block.button_label || 'Subscribe';
                return wrapBlock(idx, 'email_signup',
                  <div className={`flex gap-2 mt-2 ${contentAlignment === 'center' ? 'justify-center' : contentAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex w-full max-w-md">
                      <input
                        type="email"
                        placeholder={placeholder}
                        className="flex-1 px-4 py-3 text-sm border border-white/30 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/50"
                        style={{ color: (showTextBox || mobileShowContainer) ? '#121212' : txt, borderColor: (showTextBox || mobileShowContainer) ? '#d1d5db' : undefined, backgroundColor: (showTextBox || mobileShowContainer) ? '#fff' : undefined }}
                      />
                      {btnLabel && (
                        <button
                          className="px-6 py-3 text-sm font-medium tracking-wider uppercase flex-shrink-0"
                          style={{
                            backgroundColor: (showTextBox || mobileShowContainer) ? '#121212' : '#fff',
                            color: (showTextBox || mobileShowContainer) ? '#fff' : '#121212',
                          }}
                        >
                          {btnLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {/* Fallback if no blocks exist — legacy support */}
            {blocks.length === 0 && (
              <>
                <h2 className={`${headingSizeMap.h1} font-bold leading-tight mb-3`}
                  style={{ color: txt }}>
                  {d.title || 'Image banner'}
                </h2>
                {d.subtitle && (
                  <p className="text-base md:text-lg mb-6 opacity-80" style={{ color: txt }}>{d.subtitle}</p>
                )}
                {d.buttonText && (
                  <a href={d.buttonLink || '#'} className={`inline-block px-8 py-3 text-sm font-medium tracking-wider uppercase bg-white text-[#121212]`}>
                    {d.buttonText}
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isCarousel && heroSlides && heroSlides.length > 1) {
    return (
      <section ref={sectionRef} className="relative w-full overflow-hidden">
        <div className="relative" style={{ transform: `translateX(-${currentSlide * 100}%)`, transition: 'transform 0.5s ease' }}>
          <div className="flex">
            {heroSlides.map((slide: any, i: number) => (
              <div key={i} className="w-full flex-shrink-0">{renderContent(slide)}</div>
            ))}
          </div>
        </div>
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_: any, i: number) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentSlide ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      </section>
    );
  }

  return <section ref={sectionRef} className="relative w-full">{renderContent()}</section>;
};

export default memo(HeroSection);
