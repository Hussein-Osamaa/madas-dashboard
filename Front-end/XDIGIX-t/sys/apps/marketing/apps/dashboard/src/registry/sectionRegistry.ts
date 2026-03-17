/**
 * SECTION REGISTRY — Single source of truth for all builder section types.
 *
 * Replaces:
 * 1. The 200-line getElementTypeFromTarget() DOM class scanner in BuilderCanvas.tsx
 * 2. The hardcoded section catalog in BuilderSidebar.tsx
 * 3. The getDefaultSectionData() switch in BuilderPage.tsx
 *
 * To add a new section type:
 *   1. Add the type to SectionType union in types/builder.ts
 *   2. Create a corresponding *Editor.tsx in editors/
 *   3. Add an entry here
 *   4. Add data-edit-type attributes to the section renderer component
 */
import { lazy } from 'react';
import type { SectionType } from '../types/builder';
import type { SectionRegistryEntry } from './types';

// Lazy-load all editors for code splitting
const HeroEditor        = lazy(() => import('../components/builder/editors/HeroEditor'));
const NavbarEditor      = lazy(() => import('../components/builder/editors/NavbarEditor'));
const FeaturesEditor    = lazy(() => import('../components/builder/editors/FeaturesEditor'));
const ProductsEditor    = lazy(() => import('../components/builder/editors/ProductsEditor'));
const DealsEditor       = lazy(() => import('../components/builder/editors/DealsEditor'));
const CollectionsEditor = lazy(() => import('../components/builder/editors/CollectionsEditor'));
const TestimonialsEditor= lazy(() => import('../components/builder/editors/TestimonialsEditor'));
const CTAEditor         = lazy(() => import('../components/builder/editors/CTAEditor'));
const AboutEditor       = lazy(() => import('../components/builder/editors/AboutEditor'));
const ContactEditor     = lazy(() => import('../components/builder/editors/ContactEditor'));
const GalleryEditor     = lazy(() => import('../components/builder/editors/GalleryEditor'));
const PricingEditor     = lazy(() => import('../components/builder/editors/PricingEditor'));
const FAQEditor         = lazy(() => import('../components/builder/editors/FAQEditor'));
const FooterEditor      = lazy(() => import('../components/builder/editors/FooterEditor'));
const StatsEditor       = lazy(() => import('../components/builder/editors/StatsEditor'));
const TeamEditor        = lazy(() => import('../components/builder/editors/TeamEditor'));
const ServicesEditor    = lazy(() => import('../components/builder/editors/ServicesEditor'));
const VideoEditor       = lazy(() => import('../components/builder/editors/VideoEditor'));
const CountdownEditor   = lazy(() => import('../components/builder/editors/CountdownEditor'));
const BannerEditor      = lazy(() => import('../components/builder/editors/BannerEditor'));
const PartnersEditor    = lazy(() => import('../components/builder/editors/PartnersEditor'));
const NewsletterEditor  = lazy(() => import('../components/builder/editors/NewsletterEditor'));
const DividerEditor     = lazy(() => import('../components/builder/editors/DividerEditor'));
const ImageComparisonEditor = lazy(() => import('../components/builder/editors/ImageComparisonEditor'));

/* ──────────────────────────────────────────────────────────────────────────
   Master registry
────────────────────────────────────────────────────────────────────────── */
export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {

  /* ── LAYOUT ─────────────────────────────────────────────────────────── */
  navbar: {
    type: 'navbar',
    label: 'Navigation Bar',
    icon: 'menu',
    description: 'Site navigation with logo, links, cart and search',
    category: 'Layout',
    editableElements: [
      { dataType: 'navbar-logo',    elementType: 'logo',     label: 'Logo' },
      { dataType: 'navbar-item',    elementType: 'menuItem', label: 'Menu Item' },
      { dataType: 'navbar-bg',      elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      logo: '', logoText: 'BRAND',
      menuItems: [
        { label: 'Home', link: '#' },
        { label: 'Shop', link: '#' },
        { label: 'About', link: '#' },
      ],
      showSearch: true, searchPlaceholder: 'Search...',
      showCart: true, cartCount: 0,
      showWishlist: true, wishlistCount: 0,
      showUserIcon: true,
      backgroundColor: '#FFFFFF', textColor: '#27491F', sticky: false,
    },
    Editor: NavbarEditor as React.ComponentType<import('./types').EditorProps>,
  },

  hero: {
    type: 'hero',
    label: 'Hero Banner',
    icon: 'image',
    description: 'Full-width hero with headline, subtext and CTA',
    category: 'Layout',
    editableElements: [
      { dataType: 'hero-title',      elementType: 'title',      label: 'Heading' },
      { dataType: 'hero-subtitle',   elementType: 'subtitle',   label: 'Subheading' },
      { dataType: 'hero-button',     elementType: 'button',     label: 'CTA Button' },
      { dataType: 'hero-background', elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      title: 'Welcome to Our Store',
      subtitle: 'Discover amazing products and deals',
      buttonText: 'Shop Now',
      buttonLink: '#',
      backgroundImage: '',
      backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
      textColor: '#FFFFFF',
    },
    variants: [
      { variantId: 'default', label: 'Default Hero',  initialData: { layout: 'default' } },
      { variantId: 'minimal', label: 'Minimal Hero',  initialData: { layout: 'minimal', buttonText: 'Explore' } },
      { variantId: 'carousel',label: 'Hero Carousel', initialData: { isCarousel: true, slides: [] } },
    ],
    Editor: HeroEditor as React.ComponentType<import('./types').EditorProps>,
  },

  /* ── CONTENT ─────────────────────────────────────────────────────────── */
  features: {
    type: 'features',
    label: 'Features',
    icon: 'star',
    description: 'Highlight key features with icons',
    category: 'Content',
    editableElements: [
      { dataType: 'features-title',   elementType: 'title',   label: 'Section Title' },
      { dataType: 'features-feature', elementType: 'feature', label: 'Feature Card' },
    ],
    defaultData: {
      title: 'Why Choose Us',
      subtitle: 'What makes us special',
      items: [
        { icon: '⭐', title: 'Premium Quality', description: 'Only the finest materials' },
        { icon: '🚀', title: 'Fast Delivery',   description: 'Delivered in 24-48 hours' },
        { icon: '💎', title: 'Exclusive Deals', description: 'Members-only discounts' },
      ],
    },
    Editor: FeaturesEditor as React.ComponentType<import('./types').EditorProps>,
  },

  about: {
    type: 'about',
    label: 'About Us',
    icon: 'info',
    description: 'Brand story with image and text',
    category: 'Content',
    editableElements: [
      { dataType: 'about-title',   elementType: 'title',       label: 'Title' },
      { dataType: 'about-content', elementType: 'description', label: 'Content' },
      { dataType: 'about-image',   elementType: 'image',       label: 'Image' },
    ],
    defaultData: {
      title: 'About Us',
      content: 'We are a passionate team dedicated to bringing you the best products and experience.',
      image: '',
    },
    Editor: AboutEditor as React.ComponentType<import('./types').EditorProps>,
  },

  contact: {
    type: 'contact',
    label: 'Contact',
    icon: 'contact_mail',
    description: 'Contact form with details',
    category: 'Content',
    editableElements: [
      { dataType: 'contact-title',    elementType: 'title',    label: 'Title' },
      { dataType: 'contact-subtitle', elementType: 'subtitle', label: 'Subtitle' },
    ],
    defaultData: {
      title: 'Get in Touch',
      subtitle: "We'd love to hear from you",
      email: '', phone: '', address: '',
    },
    Editor: ContactEditor as React.ComponentType<import('./types').EditorProps>,
  },

  gallery: {
    type: 'gallery',
    label: 'Gallery',
    icon: 'photo_library',
    description: 'Image gallery in grid or masonry layout',
    category: 'Content',
    editableElements: [
      { dataType: 'gallery-title', elementType: 'title',       label: 'Title' },
      { dataType: 'gallery-image', elementType: 'galleryItem', label: 'Image' },
    ],
    defaultData: {
      title: 'Our Gallery',
      subtitle: '',
      layout: 'grid', columns: 3,
      images: [],
    },
    Editor: GalleryEditor as React.ComponentType<import('./types').EditorProps>,
  },

  video: {
    type: 'video',
    label: 'Video',
    icon: 'play_circle',
    description: 'Embedded YouTube / Vimeo video',
    category: 'Content',
    editableElements: [
      { dataType: 'video-title', elementType: 'title', label: 'Title' },
      { dataType: 'video-embed', elementType: 'video', label: 'Video Embed' },
    ],
    defaultData: {
      title: 'Watch Our Story',
      subtitle: 'See what makes us different',
      videoUrl: '',
      videoType: 'youtube',
      autoplay: false,
      showControls: true,
    },
    Editor: VideoEditor as React.ComponentType<import('./types').EditorProps>,
  },

  stats: {
    type: 'stats',
    label: 'Stats',
    icon: 'bar_chart',
    description: 'Key metrics and numbers',
    category: 'Content',
    editableElements: [
      { dataType: 'stats-title', elementType: 'title', label: 'Title' },
      { dataType: 'stats-stat',  elementType: 'stat',  label: 'Stat Item' },
    ],
    defaultData: {
      title: 'Our Impact',
      subtitle: 'Numbers that speak for themselves',
      stats: [
        { value: '10K+', label: 'Happy Customers', icon: '😊' },
        { value: '500+', label: 'Products',         icon: '📦' },
        { value: '99%',  label: 'Satisfaction',     icon: '⭐' },
        { value: '24/7', label: 'Support',          icon: '💬' },
      ],
      layout: 'row', animated: true,
    },
    Editor: StatsEditor as React.ComponentType<import('./types').EditorProps>,
  },

  team: {
    type: 'team',
    label: 'Team',
    icon: 'group',
    description: 'Meet the team section with photos',
    category: 'Content',
    editableElements: [
      { dataType: 'team-title',  elementType: 'title',      label: 'Title' },
      { dataType: 'team-member', elementType: 'teamMember', label: 'Team Member' },
    ],
    defaultData: {
      title: 'Meet Our Team',
      subtitle: 'The people behind our success',
      members: [
        { name: 'Jane Smith', role: 'CEO', bio: 'Visionary leader', image: '' },
        { name: 'John Doe',   role: 'CTO', bio: 'Tech innovator',   image: '' },
      ],
      layout: 'grid',
    },
    Editor: TeamEditor as React.ComponentType<import('./types').EditorProps>,
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    icon: 'horizontal_rule',
    description: 'Visual separator between sections',
    category: 'Content',
    editableElements: [
      { dataType: 'divider-line', elementType: 'divider', label: 'Divider' },
    ],
    defaultData: {
      style: 'line', color: '#e5e7eb', height: 1, width: '100%', spacing: 40,
    },
    Editor: DividerEditor as React.ComponentType<import('./types').EditorProps>,
  },

  imageComparison: {
    type: 'imageComparison',
    label: 'Before & After',
    icon: 'compare',
    description: 'Before/after image comparison slider',
    category: 'Content',
    editableElements: [
      { dataType: 'comparison-before', elementType: 'image', label: 'Before Image' },
      { dataType: 'comparison-after',  elementType: 'image', label: 'After Image' },
    ],
    defaultData: {
      title: '', subtitle: '',
      beforeImage: '', afterImage: '',
      beforeLabel: 'Before', afterLabel: 'After',
      sliderPosition: 50, sliderColor: '#FFFFFF',
      showLabels: true, orientation: 'horizontal',
    },
    Editor: ImageComparisonEditor as React.ComponentType<import('./types').EditorProps>,
  },

  /* ── E-COMMERCE ──────────────────────────────────────────────────────── */
  products: {
    type: 'products',
    label: 'Products',
    icon: 'inventory_2',
    description: 'Product grid or carousel',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'products-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'products-product', elementType: 'product', label: 'Product Card' },
    ],
    defaultData: {
      title: 'Featured Products',
      subtitle: 'Check out our best sellers',
      layout: 'grid', columns: 4,
      selectedProducts: [],
      showPrice: true, showAddToCart: true,
      cardStyle: {
        backgroundColor: '#ffffff', textColor: '#1f2937', priceColor: '#6b7280',
        borderRadius: 12, shadow: 'md',
        imageAspect: 'square', imageFit: 'contain', imageBackgroundColor: '#f3f4f6',
        buttonBackgroundColor: '#27491F', buttonTextColor: '#ffffff',
        buttonBorderRadius: 8, buttonFullWidth: true,
        showBorder: true, borderColor: '#e5e7eb',
      },
    },
    Editor: ProductsEditor as React.ComponentType<import('./types').EditorProps>,
  },

  deals: {
    type: 'deals',
    label: 'Deals',
    icon: 'local_offer',
    description: 'Deal of the day with countdown timer',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'deals-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'deals-product', elementType: 'product', label: 'Deal Card' },
      { dataType: 'deals-timer',   elementType: 'countdown', label: 'Countdown Timer' },
    ],
    defaultData: {
      title: 'DEAL OF THE DAY',
      viewMoreText: 'VIEW MORE', viewMoreLink: '#',
      selectedProducts: [], columns: 4,
      cardStyle: {
        backgroundColor: '#ffffff', textColor: '#1f2937',
        descriptionColor: '#6b7280', priceColor: '#1f2937',
        borderRadius: 8, showBorder: true, borderColor: '#e5e7eb',
        imageBackgroundColor: '#f3f4f6',
        buttonBackgroundColor: '#F0CAE1', buttonTextColor: '#27491F', buttonBorderRadius: 6,
      },
    },
    Editor: DealsEditor as React.ComponentType<import('./types').EditorProps>,
  },

  collections: {
    type: 'collections',
    label: 'Collections',
    icon: 'collections',
    description: 'Product collection grid with overlays',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'collections-title',      elementType: 'title', label: 'Title' },
      { dataType: 'collections-collection', elementType: 'card',  label: 'Collection Card' },
    ],
    defaultData: {
      title: 'Shop by Collection',
      subtitle: 'Browse our curated collections',
      layout: 'grid', columns: 4,
      selectedCollections: [],
      cardStyle: {
        backgroundColor: '#ffffff', textColor: '#1f2937',
        borderRadius: 16, showBorder: false, borderColor: '#e5e7eb',
        imageAspect: 'square', imageFit: 'cover',
        overlayColor: '#000000', overlayOpacity: 0.4,
        showName: true, showDescription: false, showProductCount: true,
        namePosition: 'overlay',
        showButton: false, buttonText: 'Shop Now',
        buttonBackgroundColor: '#27491F', buttonTextColor: '#ffffff',
        buttonBorderRadius: 6,
        buttonHoverBackgroundColor: '#1a3013', buttonHoverTextColor: '#ffffff',
        buttonHoverEffect: 'none',
      },
    },
    Editor: CollectionsEditor as React.ComponentType<import('./types').EditorProps>,
  },

  pricing: {
    type: 'pricing',
    label: 'Pricing',
    icon: 'price_change',
    description: 'Pricing plans comparison table',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'pricing-title', elementType: 'title',       label: 'Title' },
      { dataType: 'pricing-plan',  elementType: 'pricingPlan', label: 'Pricing Plan' },
    ],
    defaultData: {
      title: 'Pricing Plans',
      subtitle: 'Choose the perfect plan for you',
      currency: '$', billingPeriod: '/month',
      plans: [],
    },
    Editor: PricingEditor as React.ComponentType<import('./types').EditorProps>,
  },

  /* ── ENGAGEMENT ──────────────────────────────────────────────────────── */
  cta: {
    type: 'cta',
    label: 'Call to Action',
    icon: 'campaign',
    description: 'Full-width CTA with button',
    category: 'Engagement',
    editableElements: [
      { dataType: 'cta-title',    elementType: 'title',    label: 'Title' },
      { dataType: 'cta-subtitle', elementType: 'subtitle', label: 'Subtitle' },
      { dataType: 'cta-button',   elementType: 'button',   label: 'Button' },
      { dataType: 'cta-bg',       elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      title: 'Ready to Get Started?',
      subtitle: 'Join thousands of satisfied customers',
      buttonText: 'Get Started', buttonLink: '#',
      backgroundColor: '#27491F',
      buttonBackgroundColor: '#ffffff', buttonTextColor: '#27491F',
    },
    Editor: CTAEditor as React.ComponentType<import('./types').EditorProps>,
  },

  countdown: {
    type: 'countdown',
    label: 'Countdown Timer',
    icon: 'timer',
    description: 'Count down to a launch date or event',
    category: 'Engagement',
    editableElements: [
      { dataType: 'countdown-title', elementType: 'title',     label: 'Title' },
      { dataType: 'countdown-timer', elementType: 'countdown', label: 'Timer' },
    ],
    defaultData: {
      title: 'Coming Soon',
      subtitle: 'Something amazing is on its way',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true, showHours: true, showMinutes: true, showSeconds: true,
      expiredMessage: 'The wait is over!',
      backgroundColor: '#27491F', textColor: '#ffffff',
    },
    Editor: CountdownEditor as React.ComponentType<import('./types').EditorProps>,
  },

  banner: {
    type: 'banner',
    label: 'Announcement Bar',
    icon: 'notifications',
    description: 'Dismissable banner for promotions',
    category: 'Engagement',
    editableElements: [
      { dataType: 'banner-text',   elementType: 'description', label: 'Message' },
      { dataType: 'banner-button', elementType: 'button',      label: 'Action Link' },
    ],
    defaultData: {
      text: '🎉 Free shipping on orders over $50! Limited time offer.',
      link: '#', linkText: 'Shop Now',
      backgroundColor: '#27491F', textColor: '#ffffff',
      dismissible: true, enableMarquee: false, marqueeSpeed: 15,
    },
    Editor: BannerEditor as React.ComponentType<import('./types').EditorProps>,
  },

  newsletter: {
    type: 'newsletter',
    label: 'Newsletter',
    icon: 'email',
    description: 'Email subscription signup',
    category: 'Engagement',
    editableElements: [
      { dataType: 'newsletter-title',  elementType: 'title',   label: 'Title' },
      { dataType: 'newsletter-button', elementType: 'button',  label: 'Subscribe Button' },
      { dataType: 'newsletter-input',  elementType: 'input',   label: 'Email Input' },
    ],
    defaultData: {
      title: 'Stay Updated',
      subtitle: 'Subscribe for exclusive offers and new arrivals',
      placeholder: 'Enter your email address',
      buttonText: 'Subscribe',
      backgroundColor: '#f9fafb',
      successMessage: 'Thank you for subscribing!',
    },
    Editor: NewsletterEditor as React.ComponentType<import('./types').EditorProps>,
  },

  services: {
    type: 'services',
    label: 'Services',
    icon: 'build',
    description: 'Service cards with icons',
    category: 'Engagement',
    editableElements: [
      { dataType: 'services-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'services-service', elementType: 'service', label: 'Service Card' },
    ],
    defaultData: {
      title: 'Our Services',
      subtitle: 'What we offer',
      services: [
        { icon: '🚀', title: 'Fast Delivery',  description: 'Delivered in 24-48 hours', price: 'Free' },
        { icon: '🛡️', title: 'Secure Payment', description: 'Multiple secure options', price: '' },
        { icon: '🔄', title: 'Easy Returns',   description: '30-day hassle-free returns', price: '' },
      ],
      layout: 'grid',
    },
    Editor: ServicesEditor as React.ComponentType<import('./types').EditorProps>,
  },

  /* ── SOCIAL PROOF ────────────────────────────────────────────────────── */
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    icon: 'format_quote',
    description: 'Customer reviews and ratings',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'testimonials-title', elementType: 'title',       label: 'Section Title' },
      { dataType: 'testimonials-item',  elementType: 'testimonial', label: 'Review Card' },
    ],
    defaultData: {
      title: 'What Our Customers Say',
      items: [
        { name: 'Sarah M.',  role: 'Verified Buyer', text: 'Amazing quality and fast shipping!', rating: 5 },
        { name: 'Ahmed K.',  role: 'Customer',       text: 'Great products, will buy again.', rating: 5 },
      ],
    },
    Editor: TestimonialsEditor as React.ComponentType<import('./types').EditorProps>,
  },

  faq: {
    type: 'faq',
    label: 'FAQ',
    icon: 'help_outline',
    description: 'Accordion FAQ section',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'faq-title', elementType: 'title',   label: 'Title' },
      { dataType: 'faq-item',  elementType: 'faqItem', label: 'FAQ Item' },
    ],
    defaultData: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'What is your return policy?', answer: 'We offer 30-day hassle-free returns.' },
        { question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days.' },
      ],
    },
    Editor: FAQEditor as React.ComponentType<import('./types').EditorProps>,
  },

  partners: {
    type: 'partners',
    label: 'Partners / Brands',
    icon: 'business',
    description: 'Logo wall of trusted brands',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'partners-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'partners-partner', elementType: 'partner', label: 'Partner Logo' },
    ],
    defaultData: {
      title: 'Trusted By',
      subtitle: 'Leading brands that work with us',
      partners: [
        { name: 'Brand 1', logo: '', link: '#' },
        { name: 'Brand 2', logo: '', link: '#' },
        { name: 'Brand 3', logo: '', link: '#' },
      ],
      grayscale: true, autoScroll: false,
    },
    Editor: PartnersEditor as React.ComponentType<import('./types').EditorProps>,
  },

  footer: {
    type: 'footer',
    label: 'Footer',
    icon: 'web_asset',
    description: 'Site footer with links and newsletter',
    category: 'Layout',
    editableElements: [
      { dataType: 'footer-logo',       elementType: 'logo',       label: 'Logo' },
      { dataType: 'footer-link',       elementType: 'link',       label: 'Footer Link' },
      { dataType: 'footer-social',     elementType: 'socialIcon', label: 'Social Icon' },
      { dataType: 'footer-newsletter', elementType: 'input',      label: 'Newsletter Input' },
    ],
    defaultData: {
      layout: 'classic',
      logoText: 'BRAND', logo: '',
      tagline: 'Sign up for exclusive offers and be the first to know about new arrivals.',
      copyrightText: `© ${new Date().getFullYear()} Brand. All rights reserved.`,
      columns: [
        { title: 'Company', links: [{ label: 'About Us', link: '#' }, { label: 'Contact', link: '#' }] },
        { title: 'Support',  links: [{ label: 'Help Center', link: '#' }, { label: 'Returns', link: '#' }] },
      ],
      policyLinks: [
        { label: 'Privacy Policy', link: '#' },
        { label: 'Terms of Service', link: '#' },
      ],
      socialLinks: [
        { platform: 'Instagram', icon: 'camera_alt', link: '#' },
        { platform: 'Facebook',  icon: 'facebook',   link: '#' },
      ],
      showNewsletter: true,
      newsletterText: 'Subscribe to get special offers and updates.',
      newsletterPlaceholder: 'Your email',
    },
    Editor: FooterEditor as React.ComponentType<import('./types').EditorProps>,
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   Helpers — used by BuilderCanvas, BuilderSidebar, BuilderPage
────────────────────────────────────────────────────────────────────────── */
import type { ElementType } from '../types/elementEditor';
import type React from 'react';

/**
 * Replaces the 200-line getElementTypeFromTarget() DOM class scanner.
 * Called by BuilderCanvas when a DOM element with data-edit-type is clicked.
 */
export function getElementTypeFromRegistry(
  sectionType: SectionType,
  dataEditType: string,
): ElementType | null {
  const entry = SECTION_REGISTRY[sectionType];
  if (!entry) return null;
  return entry.editableElements.find(e => e.dataType === dataEditType)?.elementType ?? null;
}

/**
 * Replaces the getDefaultSectionData() switch in BuilderPage.tsx.
 */
export function getDefaultData(type: SectionType): Record<string, unknown> {
  return { ...(SECTION_REGISTRY[type]?.defaultData ?? {}) };
}

/**
 * Returns all entries grouped by category — used by BuilderSidebar.
 */
export function getRegistryByCategory(): Record<string, SectionRegistryEntry[]> {
  const grouped: Record<string, SectionRegistryEntry[]> = {};
  for (const entry of Object.values(SECTION_REGISTRY)) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }
  return grouped;
}

/** Ordered list for BuilderSidebar to render consistently */
export const CATEGORY_ORDER = ['Layout', 'E-commerce', 'Content', 'Engagement', 'Social Proof'] as const;
