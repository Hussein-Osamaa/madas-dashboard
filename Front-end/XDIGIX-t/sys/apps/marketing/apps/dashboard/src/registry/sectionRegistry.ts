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
import type { SectionRegistryEntry, ApiBinding, AnalyticsEvents } from './types';

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
    settings: {
      logoText: { type: 'text', label: 'Logo Text', placeholder: 'My Store' },
      logoImage: { type: 'image', label: 'Logo Image' },
      logoUrl: { type: 'url', label: 'Logo Link', placeholder: '/', defaultValue: '/' },
      sticky: { type: 'toggle', label: 'Sticky Navigation', helpText: 'Fix navbar to top of screen when scrolling', defaultValue: true },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
      textColor: { type: 'color', label: 'Text / Link Color', defaultValue: '#1a1a1a' },
      ctaText: { type: 'text', label: 'CTA Button Text', placeholder: 'Shop Now' },
      ctaLink: { type: 'url', label: 'CTA Button Link', placeholder: '#products' },
      showSearch: { type: 'toggle', label: 'Show Search', defaultValue: true },
      showCart: { type: 'toggle', label: 'Show Cart Icon', defaultValue: true },
    },
    blocks: [
      {
        type: 'menu_item',
        label: 'Menu Items',
        singularLabel: 'Menu Item',
        icon: 'link',
        dataKey: 'menuItems',
        fields: {
          label: { type: 'text', label: 'Label', placeholder: 'Home' },
          url: { type: 'url', label: 'URL', placeholder: '/' },
          isExternal: { type: 'toggle', label: 'Open in new tab', defaultValue: false },
        },
        createDefault: () => ({ label: 'New Link', url: '/', isExternal: false }),
        maxItems: 10,
      },
    ],
    apiBinding: {
      endpoint: '/api/public/{tenantId}/cart',
      method: 'GET',
      cacheTtlMs: 0,  // always live — cart must be fresh
    } as ApiBinding,
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
    settings: {
      layout: {
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'minimal', label: 'Minimal (text only)' },
        ],
        defaultValue: 'default',
      },
      title: {
        type: 'text',
        label: 'Headline',
        placeholder: 'Welcome to Our Store',
        maxLength: 100,
      },
      subtitle: {
        type: 'textarea',
        label: 'Subheading',
        placeholder: 'Discover amazing products and services',
        maxLength: 200,
      },
      buttonText: { type: 'text', label: 'Primary Button Text', placeholder: 'Shop Now' },
      buttonLink: { type: 'url', label: 'Primary Button Link', placeholder: 'https://' },
      secondaryButtonText: { type: 'text', label: 'Secondary Button Text', placeholder: '' },
      secondaryButtonLink: { type: 'url', label: 'Secondary Button Link', placeholder: 'https://' },
      backgroundColor: { type: 'color-gradient', label: 'Background Color' },
      backgroundImage: { type: 'image', label: 'Background Image' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#FFFFFF' },
      textAlignment: {
        type: 'select',
        label: 'Text Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      height: {
        type: 'select',
        label: 'Section Height',
        options: [
          { value: 'full', label: 'Full viewport' },
          { value: 'large', label: 'Large (80vh)' },
          { value: 'medium', label: 'Medium (60vh)' },
          { value: 'small', label: 'Small (40vh)' },
        ],
        defaultValue: 'large',
      },
      isCarousel: {
        type: 'toggle',
        label: 'Carousel Mode',
        helpText: 'Show multiple slides with navigation',
        defaultValue: false,
      },
      overlayEnabled: {
        type: 'toggle',
        label: 'Overlay',
        helpText: 'Darken background image for better text contrast',
        defaultValue: false,
      },
      overlayColor: {
        type: 'color',
        label: 'Overlay Color',
        defaultValue: 'rgba(0,0,0,0.4)',
        showWhen: { field: 'overlayEnabled', equals: true },
      },
    },
    blocks: [],
    variants: [
      { variantId: 'default', label: 'Default Hero',  initialData: { layout: 'default' } },
      { variantId: 'minimal', label: 'Minimal Hero',  initialData: { layout: 'minimal', buttonText: 'Explore' } },
      { variantId: 'carousel',label: 'Hero Carousel', initialData: { isCarousel: true, slides: [] } },
    ],
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Why Choose Us' },
      subtitle: { type: 'textarea', label: 'Section Subtitle', placeholder: 'Explore our key advantages' },
      columns: {
        type: 'select',
        label: 'Columns',
        options: [
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ],
        defaultValue: '3',
      },
    },
    blocks: [
      {
        type: 'feature',
        label: 'Feature Cards',
        singularLabel: 'Feature',
        icon: 'star',
        dataKey: 'items',
        fields: {
          icon: { type: 'icon', label: 'Icon', placeholder: 'star', helpText: 'Material Icons name or emoji' },
          title: { type: 'text', label: 'Title', placeholder: 'Fast Delivery' },
          description: { type: 'textarea', label: 'Description', placeholder: 'Describe this feature' },
          link: { type: 'url', label: 'Link URL (optional)' },
          linkText: { type: 'text', label: 'Link Text (optional)', placeholder: 'Learn more' },
        },
        createDefault: () => ({ icon: 'star', title: 'New Feature', description: 'Feature description', link: '', linkText: '' }),
        maxItems: 12,
      },
    ],
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'About Us' },
      subtitle: { type: 'text', label: 'Subtitle', placeholder: 'Our story' },
      content: { type: 'richtext', label: 'Content', placeholder: 'Tell your story here...' },
      image: { type: 'image', label: 'Main Image' },
      imagePosition: {
        type: 'select',
        label: 'Image Position',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'right',
      },
      buttonText: { type: 'text', label: 'CTA Button Text', placeholder: 'Learn More' },
      buttonLink: { type: 'url', label: 'CTA Button Link', placeholder: 'https://' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
    },
    blocks: [],
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'Get In Touch' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: "We'd love to hear from you" },
      submitButtonText: { type: 'text', label: 'Submit Button Text', placeholder: 'Send Message', defaultValue: 'Send Message' },
      successMessage: { type: 'text', label: 'Success Message', placeholder: "Thanks! We'll be in touch soon.", defaultValue: "Thanks! We'll be in touch soon." },
      showEmail: { type: 'toggle', label: 'Show Email Field', defaultValue: true },
      showPhone: { type: 'toggle', label: 'Show Phone Field', defaultValue: false },
      showMessage: { type: 'toggle', label: 'Show Message Field', defaultValue: true },
      email: { type: 'text', label: 'Your Email Address', placeholder: 'hello@mystore.com' },
      phone: { type: 'text', label: 'Your Phone Number', placeholder: '+1 (555) 000-0000' },
      address: { type: 'textarea', label: 'Address', placeholder: '123 Main St, City, Country' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f9fafb' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
    },
    blocks: [],
    apiBinding: {
      endpoint: '/api/public/{tenantId}/contact',
      method:   'POST',
    } as ApiBinding,
    analyticsEvents: {
      onFormSubmit: 'contact_submit',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Gallery Title', placeholder: 'Our Gallery' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collection' },
      columns: {
        type: 'select',
        label: 'Columns',
        options: [
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ],
        defaultValue: '3',
      },
      aspectRatio: {
        type: 'select',
        label: 'Aspect Ratio',
        options: [
          { value: 'square', label: 'Square (1:1)' },
          { value: 'landscape', label: 'Landscape (16:9)' },
          { value: 'portrait', label: 'Portrait (3:4)' },
        ],
        defaultValue: 'square',
      },
      enableLightbox: { type: 'toggle', label: 'Enable Lightbox', helpText: 'Click images to view full size', defaultValue: true },
    },
    blocks: [
      {
        type: 'gallery_item',
        label: 'Gallery Images',
        singularLabel: 'Image',
        icon: 'image',
        dataKey: 'images',
        fields: {
          image: { type: 'image', label: 'Image', required: true },
          caption: { type: 'text', label: 'Caption', placeholder: 'Image caption' },
          altText: { type: 'text', label: 'Alt Text', placeholder: 'Describe the image', helpText: 'For accessibility and SEO' },
          link: { type: 'url', label: 'Link URL (optional)' },
        },
        createDefault: () => ({ image: '', caption: '', altText: '', link: '' }),
        maxItems: 24,
      },
    ],
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'Watch Our Story' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Learn more about us' },
      videoUrl: { type: 'url', label: 'Video URL', placeholder: 'https://youtube.com/watch?v=...', helpText: 'YouTube, Vimeo, or direct MP4 URL' },
      poster: { type: 'image', label: 'Poster Image (thumbnail)' },
      aspectRatio: {
        type: 'select',
        label: 'Aspect Ratio',
        options: [
          { value: '16:9', label: 'Widescreen (16:9)' },
          { value: '4:3', label: 'Standard (4:3)' },
          { value: '1:1', label: 'Square (1:1)' },
        ],
        defaultValue: '16:9',
      },
      autoplay: { type: 'toggle', label: 'Autoplay', helpText: 'Requires muted to be enabled', defaultValue: false },
      muted: { type: 'toggle', label: 'Muted', defaultValue: false },
      loop: { type: 'toggle', label: 'Loop', defaultValue: false },
      controls: { type: 'toggle', label: 'Show Controls', defaultValue: true },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#000000' },
    },
    blocks: [],
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Our Numbers' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'The results speak for themselves' },
      layout: {
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'row', label: 'Single Row' },
        ],
        defaultValue: 'grid',
      },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f0fdf4' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
    },
    blocks: [
      {
        type: 'stat',
        label: 'Stats',
        singularLabel: 'Stat',
        icon: 'bar_chart',
        dataKey: 'stats',
        fields: {
          value: { type: 'text', label: 'Value', placeholder: '10,000+', helpText: 'The big number or metric' },
          label: { type: 'text', label: 'Label', placeholder: 'Happy Customers' },
          icon: { type: 'icon', label: 'Icon (optional)', placeholder: 'people' },
          prefix: { type: 'text', label: 'Prefix (optional)', placeholder: '$', helpText: 'e.g. $ or #' },
          suffix: { type: 'text', label: 'Suffix (optional)', placeholder: '+', helpText: 'e.g. + or %' },
        },
        createDefault: () => ({ value: '0', label: 'New Stat', icon: '', prefix: '', suffix: '' }),
        maxItems: 8,
      },
    ],
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Meet Our Team' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'The people behind the brand' },
      columns: {
        type: 'select',
        label: 'Columns',
        options: [
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ],
        defaultValue: '3',
      },
      showSocial: { type: 'toggle', label: 'Show Social Links', defaultValue: false },
    },
    blocks: [
      {
        type: 'team_member',
        label: 'Team Members',
        singularLabel: 'Member',
        icon: 'person',
        dataKey: 'members',
        fields: {
          name: { type: 'text', label: 'Full Name', placeholder: 'Jane Smith' },
          role: { type: 'text', label: 'Role / Title', placeholder: 'CEO & Founder' },
          bio: { type: 'textarea', label: 'Short Bio', placeholder: 'Tell us about this team member' },
          image: { type: 'image', label: 'Profile Photo' },
          linkedinUrl: { type: 'url', label: 'LinkedIn URL' },
          twitterUrl: { type: 'url', label: 'Twitter / X URL' },
        },
        createDefault: () => ({ name: 'Team Member', role: 'Role', bio: '', image: '', linkedinUrl: '', twitterUrl: '' }),
        maxItems: 12,
      },
    ],
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
    settings: {
      style: {
        type: 'select',
        label: 'Divider Style',
        options: [
          { value: 'line', label: 'Solid Line' },
          { value: 'dashed', label: 'Dashed Line' },
          { value: 'dots', label: 'Dots' },
          { value: 'space', label: 'Blank Space' },
          { value: 'wave', label: 'Wave' },
        ],
        defaultValue: 'line',
      },
      height: { type: 'number', label: 'Height (px)', defaultValue: 2, min: 1, max: 200, unit: 'px' },
      color: { type: 'color', label: 'Divider Color', defaultValue: '#e5e7eb' },
      width: {
        type: 'select',
        label: 'Width',
        options: [
          { value: 'full', label: 'Full Width' },
          { value: 'container', label: 'Container Width' },
        ],
        defaultValue: 'full',
      },
      spacing: { type: 'number', label: 'Vertical Spacing (px)', defaultValue: 40, min: 0, max: 200, unit: 'px' },
    },
    blocks: [],
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'See the Difference' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Before and after comparison' },
      beforeImage: { type: 'image', label: 'Before Image', required: true },
      afterImage: { type: 'image', label: 'After Image', required: true },
      beforeLabel: { type: 'text', label: 'Before Label', placeholder: 'Before', defaultValue: 'Before' },
      afterLabel: { type: 'text', label: 'After Label', placeholder: 'After', defaultValue: 'After' },
      startPosition: {
        type: 'range',
        label: 'Start Position',
        min: 10,
        max: 90,
        step: 5,
        defaultValue: 50,
        unit: '%',
        helpText: 'Initial divider position (10–90%)',
      },
    },
    blocks: [],
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Our Products' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collection' },
      columns: { type: 'select', label: 'Columns', options: [{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' }], defaultValue: '3' },
      limit: { type: 'number', label: 'Products to Show', defaultValue: 8, min: 1, max: 50 },
      showPrice: { type: 'toggle', label: 'Show Price', defaultValue: true },
      showAddToCart: { type: 'toggle', label: 'Show "Add to Cart" Button', defaultValue: true },
      showDiscount: { type: 'toggle', label: 'Show Discount Badge', defaultValue: true },
      sortBy: { type: 'select', label: 'Sort By', options: [{ value: 'newest', label: 'Newest First' }, { value: 'price_asc', label: 'Price: Low to High' }, { value: 'price_desc', label: 'Price: High to Low' }, { value: 'popular', label: 'Most Popular' }], defaultValue: 'newest' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
    },
    blocks: [],
    apiBinding: {
      endpoint:       '/api/public/{tenantId}/products',
      paramsFromData: ['collection', 'limit', 'sort'],
      cacheTtlMs:     60_000,
      paginates:      true,
    } as ApiBinding,
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'product_view',
      onItemClick:   'product_click',
      onCtaClick:    'add_to_cart',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Deals & Offers' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Limited-time offers you cannot miss' },
      columns: { type: 'select', label: 'Columns', options: [{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' }], defaultValue: '2' },
      limit: { type: 'number', label: 'Deals to Show', defaultValue: 6, min: 1, max: 50 },
      showTimer: { type: 'toggle', label: 'Show Deal Timer', defaultValue: true },
      showOriginalPrice: { type: 'toggle', label: 'Show Original Price', defaultValue: true },
      showDiscount: { type: 'toggle', label: 'Show Discount Percentage', defaultValue: true },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#fff7ed' },
    },
    blocks: [],
    apiBinding: {
      endpoint:       '/api/public/{tenantId}/products',
      paramsFromData: ['limit'],
      cacheTtlMs:     60_000,
      paginates:      true,
    } as ApiBinding,
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'product_view',
      onItemClick:   'product_click',
      onCtaClick:    'add_to_cart',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Shop by Category' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collections' },
      columns: { type: 'select', label: 'Columns', options: [{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' }], defaultValue: '3' },
      displayStyle: { type: 'select', label: 'Display Style', options: [{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }], defaultValue: 'grid' },
      showCount: { type: 'toggle', label: 'Show Product Count', defaultValue: true },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f9fafb' },
    },
    blocks: [],
    apiBinding: {
      endpoint:   '/api/public/{tenantId}/collections',
      cacheTtlMs: 120_000,
    } as ApiBinding,
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'collection_view',
      onItemClick:   'collection_click',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Simple, Transparent Pricing' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Choose the plan that works for you' },
      currency: { type: 'text', label: 'Currency Symbol', placeholder: '$', defaultValue: '$' },
      showToggle: { type: 'toggle', label: 'Show Monthly/Annual Toggle', defaultValue: false },
      billingPeriod: { type: 'select', label: 'Billing Period Label', options: [{ value: '/month', label: 'Per Month' }, { value: '/year', label: 'Per Year' }, { value: '/user', label: 'Per User' }, { value: '', label: 'No Period Label' }], defaultValue: '/month' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
    },
    blocks: [
      {
        type: 'pricing_plan', label: 'Pricing Plans', singularLabel: 'Plan', icon: 'sell', dataKey: 'plans',
        fields: {
          name: { type: 'text', label: 'Plan Name', placeholder: 'Pro' },
          price: { type: 'number', label: 'Price', min: 0, defaultValue: 0 },
          description: { type: 'textarea', label: 'Description', placeholder: 'Everything in Basic, plus...' },
          featured: { type: 'toggle', label: 'Featured Plan', helpText: 'Highlight this plan as recommended', defaultValue: false },
          ctaText: { type: 'text', label: 'CTA Button Text', placeholder: 'Get Started', defaultValue: 'Get Started' },
          ctaLink: { type: 'url', label: 'CTA Button Link', placeholder: 'https://' },
          features: { type: 'textarea', label: 'Features (one per line)', placeholder: 'Unlimited products\nPriority support\nCustom domain', helpText: 'One feature per line' },
        },
        createDefault: () => ({ name: 'New Plan', price: 0, description: '', featured: false, ctaText: 'Get Started', ctaLink: '', features: '' }),
        maxItems: 5,
      },
    ],
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'Ready to Get Started?' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Join thousands of happy customers' },
      buttonText: { type: 'text', label: 'Primary Button Text', placeholder: 'Shop Now', defaultValue: 'Shop Now' },
      buttonLink: { type: 'url', label: 'Primary Button Link', placeholder: 'https://' },
      secondaryButtonText: { type: 'text', label: 'Secondary Button Text', placeholder: 'Learn More' },
      secondaryButtonLink: { type: 'url', label: 'Secondary Button Link', placeholder: 'https://' },
      backgroundImage: { type: 'image', label: 'Background Image' },
      backgroundColor: { type: 'color-gradient', label: 'Background Color' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
      align: { type: 'select', label: 'Content Alignment', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], defaultValue: 'center' },
    },
    blocks: [],
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'Limited Time Offer' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: "Don't miss out!" },
      targetDate: { type: 'date', label: 'Target Date', helpText: 'The date the countdown reaches zero' },
      targetTime: { type: 'text', label: 'Target Time (HH:MM)', placeholder: '23:59', helpText: 'Time in 24-hour format' },
      expiredMessage: { type: 'text', label: 'Expired Message', placeholder: 'Offer has ended!', defaultValue: 'Offer has ended!' },
      daysLabel: { type: 'text', label: 'Days Label', placeholder: 'Days', defaultValue: 'Days' },
      hoursLabel: { type: 'text', label: 'Hours Label', placeholder: 'Hours', defaultValue: 'Hours' },
      minutesLabel: { type: 'text', label: 'Minutes Label', placeholder: 'Minutes', defaultValue: 'Minutes' },
      secondsLabel: { type: 'text', label: 'Seconds Label', placeholder: 'Seconds', defaultValue: 'Seconds' },
      showSeconds: { type: 'toggle', label: 'Show Seconds', defaultValue: true },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#1a1a1a' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
      accentColor: { type: 'color', label: 'Accent / Timer Color', defaultValue: '#27491F' },
    },
    blocks: [],
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
    settings: {
      text: { type: 'textarea', label: 'Banner Text', placeholder: 'Free shipping on orders over $50!', maxLength: 200 },
      linkText: { type: 'text', label: 'Link Text', placeholder: 'Shop Now' },
      link: { type: 'url', label: 'Link URL', placeholder: 'https://' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#27491F' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
      closeable: { type: 'toggle', label: 'Allow Dismiss', helpText: 'Show an × button to close the banner', defaultValue: true },
      position: { type: 'select', label: 'Position', options: [{ value: 'top', label: 'Top of page' }, { value: 'bottom', label: 'Bottom of page' }], defaultValue: 'top' },
      marquee: { type: 'toggle', label: 'Scrolling Marquee', helpText: 'Animate the banner text horizontally', defaultValue: false },
      marqueeSpeed: { type: 'number', label: 'Marquee Speed (seconds)', min: 5, max: 60, defaultValue: 20, unit: 's', showWhen: { field: 'marquee', equals: true } },
    },
    blocks: [],
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
    settings: {
      title: { type: 'text', label: 'Title', placeholder: 'Stay in the Loop' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Get exclusive deals and updates' },
      placeholder: { type: 'text', label: 'Email Input Placeholder', placeholder: 'Enter your email', defaultValue: 'Enter your email' },
      buttonText: { type: 'text', label: 'Subscribe Button Text', placeholder: 'Subscribe', defaultValue: 'Subscribe' },
      successMessage: { type: 'text', label: 'Success Message', placeholder: "You're subscribed! 🎉", defaultValue: "You're subscribed! 🎉" },
      privacyText: { type: 'text', label: 'Privacy Note', placeholder: 'No spam. Unsubscribe anytime.' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f0fdf4' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
      buttonColor: { type: 'color', label: 'Button Color', defaultValue: '#27491F' },
    },
    blocks: [],
    apiBinding: {
      endpoint: '/api/public/{tenantId}/newsletter/subscribe',
      method:   'POST',
    } as ApiBinding,
    analyticsEvents: {
      onFormSubmit: 'newsletter_subscribe',
    } as AnalyticsEvents,
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
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'Our Services' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'What we offer' },
      layout: { type: 'select', label: 'Layout Style', options: [{ value: 'grid', label: 'Grid Cards' }, { value: 'list', label: 'List with Image' }, { value: 'alternating', label: 'Alternating (image left/right)' }], defaultValue: 'grid' },
      columns: { type: 'select', label: 'Grid Columns', options: [{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }], defaultValue: '3', showWhen: { field: 'layout', equals: 'grid' } },
    },
    blocks: [
      {
        type: 'service', label: 'Services', singularLabel: 'Service', icon: 'build', dataKey: 'services',
        fields: {
          icon: { type: 'icon', label: 'Icon', placeholder: 'build' },
          title: { type: 'text', label: 'Service Name', placeholder: 'Custom Design' },
          description: { type: 'richtext', label: 'Description', placeholder: 'Describe this service' },
          image: { type: 'image', label: 'Service Image' },
          link: { type: 'url', label: 'Learn More Link' },
          linkText: { type: 'text', label: 'Link Text', placeholder: 'Learn more' },
        },
        createDefault: () => ({ icon: 'build', title: 'New Service', description: '', image: '', link: '', linkText: 'Learn more' }),
        maxItems: 12,
      },
    ],
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
    settings: {
      companyName: { type: 'text', label: 'Company Name', placeholder: 'My Store' },
      companyLogo: { type: 'image', label: 'Company Logo' },
      tagline: { type: 'textarea', label: 'Tagline / About', placeholder: 'Your trusted store', maxLength: 200 },
      copyright: { type: 'text', label: 'Copyright Text', placeholder: '© 2025 My Store. All rights reserved.' },
      backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#1a1a1a' },
      textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
      showSocial: { type: 'toggle', label: 'Show Social Links', defaultValue: true },
      facebookUrl: { type: 'url', label: 'Facebook URL', showWhen: { field: 'showSocial', equals: true } },
      instagramUrl: { type: 'url', label: 'Instagram URL', showWhen: { field: 'showSocial', equals: true } },
      twitterUrl: { type: 'url', label: 'Twitter / X URL', showWhen: { field: 'showSocial', equals: true } },
      linkedinUrl: { type: 'url', label: 'LinkedIn URL', showWhen: { field: 'showSocial', equals: true } },
      youtubeUrl: { type: 'url', label: 'YouTube URL', showWhen: { field: 'showSocial', equals: true } },
    },
    blocks: [
      {
        type: 'footer_link',
        label: 'Quick Links',
        singularLabel: 'Link',
        icon: 'link',
        dataKey: 'links',
        fields: {
          label: { type: 'text', label: 'Label', placeholder: 'Privacy Policy' },
          url: { type: 'url', label: 'URL', placeholder: '/privacy' },
        },
        createDefault: () => ({ label: 'New Link', url: '/' }),
        maxItems: 20,
      },
    ],
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
