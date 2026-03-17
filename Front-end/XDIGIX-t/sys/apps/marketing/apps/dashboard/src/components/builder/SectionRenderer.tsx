import { Section } from '../../types/builder';
import NavbarSection from './sections/NavbarSection';
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import ProductsSection from './sections/ProductsSection';
import DealsSection from './sections/DealsSection';
import CollectionsSection from './sections/CollectionsSection';
import TestimonialsSection from './sections/TestimonialsSection';
import CTASection from './sections/CTASection';
import AboutSection from './sections/AboutSection';
import ContactSection from './sections/ContactSection';
import GallerySection from './sections/GallerySection';
import PricingSection from './sections/PricingSection';
import FAQSection from './sections/FAQSection';
import FooterSection from './sections/FooterSection';
import StatsSection from './sections/StatsSection';
import TeamSection from './sections/TeamSection';
import ServicesSection from './sections/ServicesSection';
import VideoSection from './sections/VideoSection';
import CountdownSection from './sections/CountdownSection';
import BannerSection from './sections/BannerSection';
import PartnersSection from './sections/PartnersSection';
import NewsletterSection from './sections/NewsletterSection';
import DividerSection from './sections/DividerSection';
import ImageComparisonSection from './sections/ImageComparisonSection';
import { mergeSectionData } from './sections/sectionDefaults';

type Props = {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  previewMode?: 'desktop' | 'tablet' | 'mobile';
  siteId?: string;
};

const SectionRenderer = ({ section, isSelected, onSelect, siteId }: Props) => {
  /**
   * BULLETPROOF DATA RESOLUTION
   * ────────────────────────────
   * Priority order (highest → lowest):
   *  1. section.data   (new format saved by React builder)
   *  2. section.content (legacy format from old HTML builder)
   *  3. SECTION_DEFAULTS[section.type] (canonical defaults)
   *
   * `mergeSectionData` always returns a plain object — never undefined/null —
   * which eliminates the entire family of "Cannot read properties of undefined"
   * crashes across every section component.
   */
  const rawData: unknown =
    (section.data && typeof section.data === 'object' && Object.keys(section.data).length > 0)
      ? section.data
      : ((section as Record<string, unknown>).content ?? {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionData = mergeSectionData(section.type as any, rawData) as Record<string, any>;

  const style = section.style || {};
  const padding = style.padding || {};
  const margin  = style.margin  || {};

  // Build margin values based on alignment
  let marginLeft  = margin.left  !== undefined ? `${margin.left}px`  : undefined;
  let marginRight = margin.right !== undefined ? `${margin.right}px` : undefined;

  if (style.maxWidth && style.align === 'center') {
    marginLeft  = 'auto';
    marginRight = 'auto';
  } else if (style.maxWidth && style.align === 'right') {
    marginLeft  = 'auto';
    marginRight = margin.right !== undefined ? `${margin.right}px` : '0';
  }

  // Get animation class
  const getAnimationClass = () => {
    const animation = style.animation || 'none';
    if (animation === 'none') return '';
    return `animate-${animation}`;
  };

  // Build background style
  const backgroundStyle: React.CSSProperties = {};
  if (style.backgroundImage) {
    backgroundStyle.backgroundImage    = `url(${style.backgroundImage})`;
    backgroundStyle.backgroundSize     = 'cover';
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat   = 'no-repeat';
    if (style.backgroundColor) {
      backgroundStyle.position = 'relative';
    }
  } else if (style.backgroundColor) {
    backgroundStyle.backgroundColor = style.backgroundColor;
  }

  const sectionStyle: React.CSSProperties = {
    paddingTop:    padding.top    !== undefined ? `${padding.top}px`    : undefined,
    paddingBottom: padding.bottom !== undefined ? `${padding.bottom}px` : undefined,
    paddingLeft:   padding.left   !== undefined ? `${padding.left}px`   : undefined,
    paddingRight:  padding.right  !== undefined ? `${padding.right}px`  : undefined,
    marginTop:     margin.top     !== undefined ? `${margin.top}px`     : undefined,
    marginBottom:  margin.bottom  !== undefined ? `${margin.bottom}px`  : undefined,
    marginLeft,
    marginRight,
    ...backgroundStyle,
    color:        style.textColor    || undefined,
    borderRadius: style.borderRadius !== undefined ? `${style.borderRadius}px` : undefined,
    boxShadow:    style.shadow
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : undefined,
    maxWidth: style.maxWidth !== undefined ? `${style.maxWidth}px` : undefined,
    width:    style.maxWidth !== undefined ? '100%'                : undefined,
  };

  const renderSection = () => {
    switch (section.type) {
      case 'navbar':
        return <NavbarSection data={sectionData as any} style={sectionStyle} siteId={siteId} />;
      case 'hero':
        return <HeroSection data={sectionData as any} style={sectionStyle} />;
      case 'features':
        return <FeaturesSection data={sectionData as any} style={sectionStyle} />;
      case 'products':
        return <ProductsSection data={sectionData as any} style={sectionStyle} />;
      case 'deals':
        return <DealsSection data={sectionData as any} style={sectionStyle} />;
      case 'collections':
        return <CollectionsSection data={sectionData as any} style={sectionStyle} />;
      case 'testimonials':
        return <TestimonialsSection data={sectionData as any} style={sectionStyle} />;
      case 'cta':
        return <CTASection data={sectionData as any} style={sectionStyle} />;
      case 'about':
        return <AboutSection data={sectionData as any} style={sectionStyle} />;
      case 'contact':
        return <ContactSection data={sectionData as any} style={sectionStyle} />;
      case 'gallery':
        return <GallerySection data={sectionData as any} style={sectionStyle} />;
      case 'pricing':
        return <PricingSection data={sectionData as any} style={sectionStyle} />;
      case 'faq':
        return <FAQSection data={sectionData as any} style={sectionStyle} />;
      case 'footer':
        return <FooterSection data={sectionData as any} style={sectionStyle} siteId={siteId} />;
      case 'stats':
        return <StatsSection data={sectionData as any} style={sectionStyle} />;
      case 'team':
        return <TeamSection data={sectionData as any} style={sectionStyle} />;
      case 'services':
        return <ServicesSection data={sectionData as any} style={sectionStyle} />;
      case 'video':
        return <VideoSection data={sectionData as any} style={sectionStyle} />;
      case 'countdown':
        return <CountdownSection data={sectionData as any} style={sectionStyle} />;
      case 'banner':
        return <BannerSection data={sectionData as any} style={sectionStyle} />;
      case 'partners':
        return <PartnersSection data={sectionData as any} style={sectionStyle} />;
      case 'newsletter':
        return <NewsletterSection data={sectionData as any} style={sectionStyle} />;
      case 'divider':
        return <DividerSection data={sectionData as any} style={sectionStyle} />;
      case 'imageComparison':
        return <ImageComparisonSection data={sectionData as any} style={sectionStyle} />;
      default:
        return (
          <div className="p-8 text-center text-madas-text/60">
            Unknown section type: {section.type}
          </div>
        );
    }
  };

  return (
    <div
      className={`relative ${isSelected ? 'outline-2 outline-primary outline-offset-2' : ''} ${getAnimationClass()}`}
      onClick={onSelect}
    >
      {style.backgroundImage && style.backgroundColor && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundColor: style.backgroundColor,
            opacity: 0.4,
            borderRadius: style.borderRadius !== undefined ? `${style.borderRadius}px` : undefined,
          }}
        />
      )}
      {renderSection()}
    </div>
  );
};

export default SectionRenderer;
