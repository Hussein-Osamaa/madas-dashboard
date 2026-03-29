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
 *
 * Dawn theme-inspired schemas — fully customizable settings, blocks, and defaults.
 */
import type { SectionType } from '../types/builder';
import type { SectionRegistryEntry, ApiBinding, AnalyticsEvents } from './types';

/* ──────────────────────────────────────────────────────────────────────────
   Shared option sets (Dawn-inspired)
────────────────────────────────────────────────────────────────────────── */
const HEADING_SIZE_OPTIONS = [
  { value: 'h2', label: 'Small' },
  { value: 'h1', label: 'Medium' },
  { value: 'h0', label: 'Large' },
  { value: 'hxl', label: 'Extra Large' },
];

const IMAGE_RATIO_OPTIONS = [
  { value: 'adapt', label: 'Adapt to image' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

const COLOR_SCHEME_OPTIONS = [
  { value: 'scheme-1', label: 'Scheme 1' },
  { value: 'scheme-2', label: 'Scheme 2' },
  { value: 'scheme-3', label: 'Scheme 3' },
  { value: 'scheme-4', label: 'Scheme 4' },
  { value: 'scheme-5', label: 'Scheme 5' },
];

const PADDING_TOP = {
  type: 'range' as const,
  label: 'Top padding',
  min: 0,
  max: 100,
  step: 4,
  defaultValue: 36,
  unit: 'px',
};

const PADDING_BOTTOM = {
  type: 'range' as const,
  label: 'Bottom padding',
  min: 0,
  max: 100,
  step: 4,
  defaultValue: 36,
  unit: 'px',
};

/* ──────────────────────────────────────────────────────────────────────────
   Master registry
────────────────────────────────────────────────────────────────────────── */
export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {

  /* ── LAYOUT ─────────────────────────────────────────────────────────── */

  banner: {
    type: 'banner',
    label: 'Announcement Bar',
    icon: 'notifications',
    description: 'Dismissible announcement banner with optional marquee',
    category: 'Layout',
    editableElements: [
      { dataType: 'banner-text',   elementType: 'description', label: 'Message' },
      { dataType: 'banner-button', elementType: 'button',      label: 'Action Link' },
    ],
    defaultData: {
      text: 'Welcome to our store',
      link: '', linkText: '',
      dismissible: true, enableMarquee: false, marqueeSpeed: 15,
      items: [
        { text: 'Welcome to our store', link: '' },
      ],
      color_scheme: 'scheme-4',
      padding_top: 0,
      padding_bottom: 0,
    },
    settings: {
      text: { type: 'textarea', label: 'Banner Text', placeholder: 'Welcome to our store', helpText: 'Shown when there is only one announcement' },
      link: { type: 'url', label: 'Link URL', placeholder: 'https://' },
      dismissible: { type: 'toggle', label: 'Allow Dismiss', helpText: 'Show a close button on the banner', defaultValue: true },
      enableMarquee: { type: 'toggle', label: 'Enable Marquee', helpText: 'Scroll announcements horizontally', defaultValue: false },
      marqueeSpeed: { type: 'range', label: 'Marquee Speed', min: 5, max: 60, step: 1, defaultValue: 15, unit: 's', showWhen: { field: 'enableMarquee', equals: true } },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-4' },
      padding_top: { ...PADDING_TOP, defaultValue: 0 },
      padding_bottom: { ...PADDING_BOTTOM, defaultValue: 0 },
    },
    blocks: [
      {
        type: 'announcement',
        label: 'Announcements',
        singularLabel: 'Announcement',
        icon: 'campaign',
        dataKey: 'items',
        fields: {
          text: { type: 'text', label: 'Text', placeholder: 'Welcome to our store' },
          link: { type: 'url', label: 'Link', placeholder: 'https://' },
        },
        createDefault: () => ({ text: 'New announcement', link: '' }),
        maxItems: 12,
      },
    ],
  },

  navbar: {
    type: 'navbar',
    label: 'Header',
    icon: 'menu',
    description: 'Site header with logo, navigation, cart, and search',
    category: 'Layout',
    editableElements: [
      { dataType: 'navbar-logo',    elementType: 'logo',     label: 'Logo' },
      { dataType: 'navbar-item',    elementType: 'menuItem', label: 'Menu Item' },
      { dataType: 'navbar-bg',      elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      logo: '', logoText: 'BRAND',
      logoPosition: 'middle-left',
      mobileLogoPosition: 'center',
      menuType: 'dropdown',
      menuItems: [
        { label: 'Home', url: '/', isExternal: false },
        { label: 'Catalog', url: '/collections', isExternal: false },
        { label: 'Contact', url: '/contact', isExternal: false },
      ],
      stickyMode: 'on-scroll-up',
      separatorLine: false,
      showSearch: true, showCart: true,
      showWishlist: true, showUserIcon: true,
      colorScheme: 'scheme-1',
      color_scheme: 'scheme-1',
      sticky: true,
      padding_top: 20,
      padding_bottom: 20,
      bottomMargin: 0,
    },
    settings: {
      // Logo
      logoText: { type: 'text', label: 'Logo Text', placeholder: 'My Store' },
      logoPosition: {
        type: 'select', label: 'Logo position', defaultValue: 'middle-left',
        options: [
          { value: 'top-left', label: 'Top left' },
          { value: 'top-center', label: 'Top center' },
          { value: 'middle-left', label: 'Middle left' },
          { value: 'middle-center', label: 'Middle center' },
        ],
      },
      mobileLogoPosition: {
        type: 'select', label: 'Mobile logo position', defaultValue: 'center',
        options: [
          { value: 'center', label: 'Center' },
          { value: 'left', label: 'Left' },
        ],
      },
      // Menu
      menuType: {
        type: 'select', label: 'Menu type', defaultValue: 'dropdown',
        options: [
          { value: 'dropdown', label: 'Dropdown' },
          { value: 'mega', label: 'Mega menu' },
          { value: 'drawer', label: 'Drawer' },
        ],
      },
      // Sticky
      stickyMode: {
        type: 'select', label: 'Sticky header', defaultValue: 'on-scroll-up',
        options: [
          { value: 'none', label: 'None' },
          { value: 'always', label: 'Always' },
          { value: 'on-scroll-up', label: 'On scroll up' },
          { value: 'reduce-logo', label: 'Always, reduce logo size' },
        ],
      },
      separatorLine: { type: 'toggle', label: 'Separator line', defaultValue: false },
      // Utilities
      showSearch: { type: 'toggle', label: 'Show Search', defaultValue: true },
      showCart: { type: 'toggle', label: 'Show Cart Icon', defaultValue: true },
      showWishlist: { type: 'toggle', label: 'Show Wishlist', defaultValue: true },
      showUserIcon: { type: 'toggle', label: 'Show User Icon', defaultValue: true },
      // Spacing
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      bottomMargin: { type: 'range', label: 'Bottom margin', min: 0, max: 100, unit: 'px', defaultValue: 0 },
      padding_top: { ...PADDING_TOP, defaultValue: 20 },
      padding_bottom: { ...PADDING_BOTTOM, defaultValue: 20 },
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
      cacheTtlMs: 0,
    } as ApiBinding,
  },

  footer: {
    type: 'footer',
    label: 'Footer',
    icon: 'web_asset',
    description: 'Site footer with link columns, newsletter, and social',
    category: 'Layout',
    editableElements: [
      { dataType: 'footer-logo',       elementType: 'logo',       label: 'Logo' },
      { dataType: 'footer-link',       elementType: 'link',       label: 'Footer Link' },
      { dataType: 'footer-social',     elementType: 'socialIcon', label: 'Social Icon' },
      { dataType: 'footer-newsletter', elementType: 'input',      label: 'Newsletter Input' },
    ],
    defaultData: {
      logoText: 'BRAND', logo: '',
      tagline: 'Sign up for exclusive offers and be the first to know about new arrivals.',
      copyrightText: `\u00A9 ${new Date().getFullYear()} Brand. All rights reserved.`,
      columns: [
        { heading: 'Company', links: [{ label: 'About Us', link: '#' }, { label: 'Contact', link: '#' }] },
        { heading: 'Support', links: [{ label: 'Help Center', link: '#' }, { label: 'Returns', link: '#' }] },
      ],
      policyLinks: [
        { label: 'Privacy Policy', link: '#' },
        { label: 'Terms of Service', link: '#' },
      ],
      socialLinks: [
        { platform: 'Instagram', icon: 'camera_alt', link: '#' },
        { platform: 'Facebook',  icon: 'facebook',   link: '#' },
      ],
      newsletter_enable: true,
      show_social: true,
      payment_enable: false,
      show_policy: true,
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      newsletter_enable: { type: 'toggle', label: 'Enable Newsletter', helpText: 'Show email signup form in the footer', defaultValue: true },
      show_social: { type: 'toggle', label: 'Show Social Icons', defaultValue: true },
      payment_enable: { type: 'toggle', label: 'Show Payment Icons', helpText: 'Display accepted payment method icons', defaultValue: false },
      show_policy: { type: 'toggle', label: 'Show Policy Links', defaultValue: true },
      color_scheme: { type: 'select', label: 'Color Scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      companyName: { type: 'text', label: 'Company Name', placeholder: 'My Store' },
      companyLogo: { type: 'image', label: 'Company Logo' },
      tagline: { type: 'textarea', label: 'Tagline', placeholder: 'Your trusted store' },
      copyright: { type: 'text', label: 'Copyright Text', placeholder: '\u00A9 2026 My Store. All rights reserved.' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'link_list',
        label: 'Link Columns',
        singularLabel: 'Link Column',
        icon: 'list',
        dataKey: 'columns',
        fields: {
          heading: { type: 'text', label: 'Column Heading', placeholder: 'Quick Links' },
          menu: { type: 'textarea', label: 'Links (one per line: Label | URL)', placeholder: 'About Us | /about\nContact | /contact', helpText: 'Format: Label | URL, one per line' },
        },
        createDefault: () => ({ heading: 'Links', menu: 'Link | #' }),
        maxItems: 6,
      },
      {
        type: 'text_block',
        label: 'Text Blocks',
        singularLabel: 'Text Block',
        icon: 'notes',
        dataKey: 'textBlocks',
        fields: {
          heading: { type: 'text', label: 'Heading', placeholder: 'About us' },
          content: { type: 'richtext', label: 'Content', placeholder: 'Tell your story...' },
        },
        createDefault: () => ({ heading: 'About', content: '' }),
        maxItems: 3,
      },
      {
        type: 'image_block',
        label: 'Image Blocks',
        singularLabel: 'Image',
        icon: 'image',
        dataKey: 'imageBlocks',
        fields: {
          image: { type: 'image', label: 'Image' },
          width: { type: 'range', label: 'Width', min: 50, max: 400, step: 10, defaultValue: 200, unit: 'px' },
        },
        createDefault: () => ({ image: '', width: 200 }),
        maxItems: 3,
      },
    ],
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    icon: 'horizontal_rule',
    description: 'Visual separator between sections',
    category: 'Layout',
    editableElements: [
      { dataType: 'divider-line', elementType: 'divider', label: 'Divider' },
    ],
    defaultData: {
      style: 'line', color: '#e5e7eb', height: 1, width: '100%', spacing: 40,
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      style: {
        type: 'select',
        label: 'Divider Style',
        options: [
          { value: 'line', label: 'Solid Line' },
          { value: 'dotted', label: 'Dotted Line' },
          { value: 'dashed', label: 'Dashed Line' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'wave', label: 'Wave' },
        ],
        defaultValue: 'line',
      },
      color: { type: 'color', label: 'Divider Color', defaultValue: '#e5e7eb' },
      height: { type: 'range', label: 'Height', min: 1, max: 20, step: 1, defaultValue: 1, unit: 'px' },
      width: {
        type: 'select',
        label: 'Width',
        options: [
          { value: '25%', label: '25%' },
          { value: '50%', label: '50%' },
          { value: '75%', label: '75%' },
          { value: '100%', label: 'Full Width' },
        ],
        defaultValue: '100%',
      },
      spacing: { type: 'range', label: 'Vertical Spacing', min: 0, max: 200, step: 4, defaultValue: 40, unit: 'px' },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [],
  },

  /* ── CONTENT ─────────────────────────────────────────────────────────── */

  hero: {
    type: 'hero',
    label: 'Image banner',
    icon: 'image',
    description: 'Full-width image banner with heading, text, and buttons',
    category: 'Content',
    editableElements: [
      { dataType: 'hero-title',      elementType: 'title',      label: 'Heading' },
      { dataType: 'hero-subtitle',   elementType: 'subtitle',   label: 'Subheading' },
      { dataType: 'hero-button',     elementType: 'button',     label: 'CTA Button' },
      { dataType: 'hero-background', elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      image: '',
      image_2: '',
      image_overlay_opacity: 40,
      image_height: 'large',
      animation: 'none',
      desktop_content_position: 'bottom-center',
      desktop_content_alignment: 'center',
      show_text_box: false,
      color_scheme: 'scheme-3',
      // Mobile layout
      mobile_stack_images: false,
      mobile_content_alignment: 'center',
      mobile_show_container: false,
      // Blocks
      blocks: [
        { type: 'heading', text: 'Browse our latest products', heading_size: 'h1' },
        { type: 'text', text: 'Discover amazing products at unbeatable prices' },
        { type: 'buttons', button_label_1: 'Shop all', button_link_1: '#', button_style_1: 'solid', button_label_2: '', button_link_2: '', button_style_2: 'outline' },
      ],
    },
    settings: {
      // ── Images ──
      image: { type: 'image', label: 'Image 1', helpText: 'Recommended: 1920 x 700px .jpg' },
      image_2: { type: 'image', label: 'Image 2', helpText: 'Optional second image for split layout' },
      image_overlay_opacity: {
        type: 'range',
        label: 'Overlay opacity',
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 40,
        unit: '%',
      },
      image_height: {
        type: 'select',
        label: 'Height',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'full', label: 'Full screen' },
        ],
        defaultValue: 'large',
      },
      animation: {
        type: 'select',
        label: 'Animation',
        options: [
          { value: 'none', label: 'None' },
          { value: 'fade-in', label: 'Fade in' },
          { value: 'slide-up', label: 'Slide up' },
          { value: 'zoom-in', label: 'Zoom in' },
          { value: 'parallax', label: 'Parallax' },
        ],
        defaultValue: 'none',
      },
      // ── Content section header ──
      _content_header: { type: 'header' as any, label: 'Content' },
      desktop_content_position: {
        type: 'select',
        label: 'Position',
        options: [
          { value: 'top-left', label: 'Top Left' },
          { value: 'top-center', label: 'Top Center' },
          { value: 'top-right', label: 'Top Right' },
          { value: 'middle-left', label: 'Middle Left' },
          { value: 'middle-center', label: 'Middle Center' },
          { value: 'middle-right', label: 'Middle Right' },
          { value: 'bottom-left', label: 'Bottom Left' },
          { value: 'bottom-center', label: 'Bottom Center' },
          { value: 'bottom-right', label: 'Bottom Right' },
        ],
        defaultValue: 'bottom-center',
      },
      desktop_content_alignment: {
        type: 'button-group' as any,
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      show_text_box: { type: 'toggle', label: 'Container', helpText: 'Add a semi-transparent container behind the text', defaultValue: false },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-3' },
      // ── Mobile layout section header ──
      _mobile_header: { type: 'header' as any, label: 'Mobile layout' },
      mobile_stack_images: { type: 'toggle', label: 'Stack images', helpText: 'Stack images vertically on mobile', defaultValue: false },
      mobile_content_alignment: {
        type: 'button-group' as any,
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      mobile_show_container: { type: 'toggle', label: 'Container', helpText: 'Show container on mobile', defaultValue: false },
    },
    blocks: [
      {
        type: 'heading',
        label: 'Headings',
        singularLabel: 'Heading',
        icon: 'title',
        dataKey: 'blocks',
        fields: {
          text: { type: 'text', label: 'Heading', placeholder: 'Image banner' },
          heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
        },
        createDefault: () => ({ type: 'heading', text: 'Image banner', heading_size: 'h1' }),
      },
      {
        type: 'text',
        label: 'Text Blocks',
        singularLabel: 'Text',
        icon: 'notes',
        dataKey: 'blocks',
        fields: {
          text: { type: 'richtext', label: 'Text', placeholder: 'Talk about your brand' },
        },
        createDefault: () => ({ type: 'text', text: 'Talk about your brand' }),
      },
      {
        type: 'buttons',
        label: 'Buttons',
        singularLabel: 'Button Pair',
        icon: 'smart_button',
        dataKey: 'blocks',
        fields: {
          button_label_1: { type: 'text', label: 'Button 1 label', placeholder: 'Shop Now' },
          button_link_1: { type: 'url', label: 'Button 1 link', placeholder: '/' },
          button_style_1: { type: 'select', label: 'Button 1 style', options: [{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }], defaultValue: 'solid' },
          button_label_2: { type: 'text', label: 'Button 2 label', placeholder: 'Learn more' },
          button_link_2: { type: 'url', label: 'Button 2 link', placeholder: '/' },
          button_style_2: { type: 'select', label: 'Button 2 style', options: [{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }], defaultValue: 'outline' },
        },
        createDefault: () => ({ type: 'buttons', button_label_1: 'Shop Now', button_link_1: '#', button_style_1: 'solid', button_label_2: '', button_link_2: '', button_style_2: 'outline' }),
      },
      {
        type: 'email_signup',
        label: 'Email Signup',
        singularLabel: 'Email Signup',
        icon: 'mail',
        dataKey: 'blocks',
        fields: {
          placeholder: { type: 'text', label: 'Placeholder', placeholder: 'Email' },
          button_label: { type: 'text', label: 'Button label', placeholder: 'Subscribe' },
        },
        createDefault: () => ({ type: 'email_signup', placeholder: 'Email', button_label: 'Subscribe' }),
        maxItems: 1,
      },
    ],
    variants: [
      { variantId: 'default', label: 'Default Banner',   initialData: { image_height: 'medium' } },
      { variantId: 'full',    label: 'Full Screen Hero',  initialData: { image_height: 'full' } },
      { variantId: 'small',   label: 'Compact Banner',    initialData: { image_height: 'small' } },
    ],
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    } as AnalyticsEvents,
  },

  features: {
    type: 'features',
    label: 'Multicolumn',
    icon: 'view_column',
    description: 'Multi-column layout with images, headings, and text',
    category: 'Content',
    editableElements: [
      { dataType: 'features-title',   elementType: 'title',   label: 'Section Title' },
      { dataType: 'features-feature', elementType: 'feature', label: 'Column Card' },
    ],
    defaultData: {
      title: 'Multicolumn',
      heading_size: 'h1',
      columns_desktop: 3,
      column_alignment: 'center',
      image_width: 'full',
      image_ratio: 'adapt',
      items: [
        { image: '', title: 'Free Shipping', text: 'Enjoy free shipping on all orders over $50. We deliver to your doorstep with care and speed.', link_label: '', link: '' },
        { image: '', title: '24/7 Support', text: 'Our dedicated support team is available around the clock to help you with any questions or concerns.', link_label: '', link: '' },
        { image: '', title: 'Easy Returns', text: 'Not satisfied? Return any item within 30 days for a full refund — no questions asked.', link_label: '', link: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Multicolumn' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      columns_desktop: {
        type: 'range',
        label: 'Number of columns on desktop',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
      },
      column_alignment: {
        type: 'select',
        label: 'Column alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
        ],
        defaultValue: 'center',
      },
      image_width: {
        type: 'select',
        label: 'Image width',
        options: [
          { value: 'third', label: 'One-third column width' },
          { value: 'half', label: 'Half column width' },
          { value: 'full', label: 'Full column width' },
        ],
        defaultValue: 'full',
      },
      image_ratio: {
        type: 'select',
        label: 'Image ratio',
        options: [
          { value: 'adapt', label: 'Adapt to image' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'square', label: 'Square' },
          { value: 'circle', label: 'Circle' },
        ],
        defaultValue: 'adapt',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'column',
        label: 'Columns',
        singularLabel: 'Column',
        icon: 'view_column',
        dataKey: 'items',
        fields: {
          image: { type: 'image', label: 'Image' },
          title: { type: 'text', label: 'Heading', placeholder: 'Column heading' },
          text: { type: 'richtext', label: 'Description', placeholder: 'Describe this column' },
          link_label: { type: 'text', label: 'Link label', placeholder: 'Learn more' },
          link: { type: 'url', label: 'Link', placeholder: '/' },
        },
        createDefault: () => ({ image: '', title: 'Column', text: 'Pair text with an image to focus on your chosen product, collection, or blog post.', link_label: '', link: '' }),
        maxItems: 12,
      },
    ],
  },

  about: {
    type: 'about',
    label: 'Image with Text',
    icon: 'art_track',
    description: 'Side-by-side image and text with customizable layout',
    category: 'Content',
    editableElements: [
      { dataType: 'about-title',   elementType: 'title',       label: 'Title' },
      { dataType: 'about-content', elementType: 'description', label: 'Content' },
      { dataType: 'about-image',   elementType: 'image',       label: 'Image' },
    ],
    defaultData: {
      image: '',
      height: 'adapt',
      desktop_image_width: 'medium',
      layout: 'image_first',
      content_position: 'middle',
      content_alignment: 'left',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
      blocks: [
        { type: 'caption', text: '' },
        { type: 'heading', text: 'Image with text', heading_size: 'h1' },
        { type: 'text', text: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.' },
        { type: 'button', label: 'Learn more', link: '#' },
      ],
    },
    settings: {
      image: { type: 'image', label: 'Image', helpText: 'Recommended: 700 x 700px' },
      height: {
        type: 'select',
        label: 'Image height',
        options: [
          { value: 'adapt', label: 'Adapt to image' },
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        defaultValue: 'adapt',
      },
      desktop_image_width: {
        type: 'select',
        label: 'Desktop image width',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        defaultValue: 'medium',
      },
      layout: {
        type: 'select',
        label: 'Desktop layout',
        options: [
          { value: 'image_first', label: 'Image first' },
          { value: 'text_first', label: 'Text first' },
        ],
        defaultValue: 'image_first',
      },
      content_position: {
        type: 'select',
        label: 'Desktop content position',
        options: [
          { value: 'top', label: 'Top' },
          { value: 'middle', label: 'Middle' },
          { value: 'bottom', label: 'Bottom' },
        ],
        defaultValue: 'middle',
      },
      content_alignment: {
        type: 'select',
        label: 'Content alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'left',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'heading',
        label: 'Headings',
        singularLabel: 'Heading',
        icon: 'title',
        dataKey: 'blocks',
        fields: {
          text: { type: 'text', label: 'Heading', placeholder: 'Image with text' },
          heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
        },
        createDefault: () => ({ type: 'heading', text: 'Image with text', heading_size: 'h1' }),
        maxItems: 1,
      },
      {
        type: 'caption',
        label: 'Captions',
        singularLabel: 'Caption',
        icon: 'short_text',
        dataKey: 'blocks',
        fields: {
          text: { type: 'text', label: 'Caption', placeholder: 'Add a tagline' },
        },
        createDefault: () => ({ type: 'caption', text: '' }),
        maxItems: 1,
      },
      {
        type: 'text',
        label: 'Text Blocks',
        singularLabel: 'Text',
        icon: 'notes',
        dataKey: 'blocks',
        fields: {
          text: { type: 'richtext', label: 'Text', placeholder: 'Pair text with an image...' },
        },
        createDefault: () => ({ type: 'text', text: '' }),
        maxItems: 1,
      },
      {
        type: 'button',
        label: 'Buttons',
        singularLabel: 'Button',
        icon: 'smart_button',
        dataKey: 'blocks',
        fields: {
          label: { type: 'text', label: 'Button label', placeholder: 'Learn more' },
          link: { type: 'url', label: 'Button link', placeholder: '/' },
        },
        createDefault: () => ({ type: 'button', label: 'Learn more', link: '#' }),
        maxItems: 1,
      },
    ],
  },

  contact: {
    type: 'contact',
    label: 'Contact Form',
    icon: 'contact_mail',
    description: 'Built-in contact form with heading',
    category: 'Content',
    editableElements: [
      { dataType: 'contact-title',    elementType: 'title',    label: 'Title' },
      { dataType: 'contact-subtitle', elementType: 'subtitle', label: 'Subtitle' },
    ],
    defaultData: {
      heading: 'Contact form',
      heading_size: 'h1',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      heading: { type: 'text', label: 'Heading', placeholder: 'Contact form' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [],
    apiBinding: {
      endpoint: '/api/public/{tenantId}/contact',
      method: 'POST',
    } as ApiBinding,
    analyticsEvents: {
      onFormSubmit: 'contact_submit',
    } as AnalyticsEvents,
  },

  gallery: {
    type: 'gallery',
    label: 'Collage',
    icon: 'photo_library',
    description: 'Image collage with configurable layout',
    category: 'Content',
    editableElements: [
      { dataType: 'gallery-title', elementType: 'title',       label: 'Title' },
      { dataType: 'gallery-image', elementType: 'galleryItem', label: 'Image' },
    ],
    defaultData: {
      heading: 'Collage',
      heading_size: 'h1',
      desktop_layout: 'left',
      mobile_layout: 'collage',
      card_styles: 'product',
      images: [
        { image: '' },
        { image: '' },
        { image: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      heading: { type: 'text', label: 'Heading', placeholder: 'Collage' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      desktop_layout: {
        type: 'select',
        label: 'Desktop layout',
        options: [
          { value: 'left', label: 'Large image first (left)' },
          { value: 'right', label: 'Large image last (right)' },
        ],
        defaultValue: 'left',
      },
      mobile_layout: {
        type: 'select',
        label: 'Mobile layout',
        options: [
          { value: 'collage', label: 'Collage' },
          { value: 'column', label: 'Column' },
        ],
        defaultValue: 'collage',
      },
      card_styles: {
        type: 'select',
        label: 'Card style',
        options: [
          { value: 'product', label: 'Product card' },
          { value: 'outline', label: 'Outline card' },
          { value: 'none', label: 'No card' },
        ],
        defaultValue: 'product',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'image',
        label: 'Images',
        singularLabel: 'Image',
        icon: 'image',
        dataKey: 'images',
        fields: {
          image: { type: 'image', label: 'Image' },
        },
        createDefault: () => ({ image: '' }),
        maxItems: 3,
      },
    ],
  },

  video: {
    type: 'video',
    label: 'Video',
    icon: 'play_circle',
    description: 'Embedded or hosted video section',
    category: 'Content',
    editableElements: [
      { dataType: 'video-title', elementType: 'title', label: 'Title' },
      { dataType: 'video-embed', elementType: 'video', label: 'Video Embed' },
    ],
    defaultData: {
      heading: 'Video',
      heading_size: 'h1',
      video_url: '',
      cover_image: '',
      enable_looping: false,
      full_width: false,
      description: 'Watch our story and discover what makes our brand unique.',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      heading: { type: 'text', label: 'Heading', placeholder: 'Video' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      video_url: { type: 'url', label: 'Video URL', placeholder: 'https://www.youtube.com/watch?v=...', helpText: 'YouTube, Vimeo, or direct MP4 URL' },
      cover_image: { type: 'image', label: 'Cover image', helpText: 'Poster image shown before the video plays' },
      enable_looping: { type: 'toggle', label: 'Enable video looping', defaultValue: false },
      full_width: { type: 'toggle', label: 'Full width', helpText: 'Make the video span the full page width', defaultValue: false },
      description: { type: 'richtext', label: 'Description', placeholder: 'Add a brief video description...' },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [],
  },

  stats: {
    type: 'stats',
    label: 'Stats',
    icon: 'bar_chart',
    description: 'Key metrics and numbers with optional animation',
    category: 'Content',
    editableElements: [
      { dataType: 'stats-title', elementType: 'title', label: 'Title' },
      { dataType: 'stats-stat',  elementType: 'stat',  label: 'Stat Item' },
    ],
    defaultData: {
      title: 'Our Impact',
      subtitle: 'Numbers that speak for themselves',
      layout: 'row',
      animated: true,
      stats: [
        { value: '10K+', label: 'Happy Customers', prefix: '', suffix: '', icon: '' },
        { value: '500+', label: 'Products',         prefix: '', suffix: '', icon: '' },
        { value: '99%',  label: 'Satisfaction',     prefix: '', suffix: '', icon: '' },
        { value: '24/7', label: 'Support',          prefix: '', suffix: '', icon: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Our Impact' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Numbers that speak for themselves' },
      layout: {
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'row', label: 'Single Row' },
          { value: 'grid', label: 'Grid' },
        ],
        defaultValue: 'row',
      },
      animated: { type: 'toggle', label: 'Animate on scroll', helpText: 'Count up numbers when the section enters view', defaultValue: true },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
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
          prefix: { type: 'text', label: 'Prefix', placeholder: '$', helpText: 'Text before the value (e.g. $, #)' },
          suffix: { type: 'text', label: 'Suffix', placeholder: '+', helpText: 'Text after the value (e.g. +, %)' },
          icon: { type: 'icon', label: 'Icon', placeholder: 'people' },
        },
        createDefault: () => ({ value: '0', label: 'New Stat', prefix: '', suffix: '', icon: '' }),
        maxItems: 8,
      },
    ],
  },

  team: {
    type: 'team',
    label: 'Team',
    icon: 'group',
    description: 'Meet the team section with photos and bios',
    category: 'Content',
    editableElements: [
      { dataType: 'team-title',  elementType: 'title',      label: 'Title' },
      { dataType: 'team-member', elementType: 'teamMember', label: 'Team Member' },
    ],
    defaultData: {
      title: 'Meet Our Team',
      subtitle: 'The people behind our success',
      layout: 'grid',
      columns: 3,
      members: [
        { name: 'Jane Smith', role: 'CEO', image: '', bio: 'Visionary leader with 10+ years of experience.' },
        { name: 'John Doe',   role: 'CTO', image: '', bio: 'Tech innovator and systems architect.' },
        { name: 'Sarah Johnson', role: 'Design Lead', image: '', bio: 'Creative mind shaping our brand identity.' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Meet Our Team' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'The people behind the brand' },
      layout: {
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ],
        defaultValue: 'grid',
      },
      columns: {
        type: 'range',
        label: 'Columns',
        min: 2,
        max: 4,
        step: 1,
        defaultValue: 3,
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
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
          image: { type: 'image', label: 'Profile Photo' },
          bio: { type: 'textarea', label: 'Short Bio', placeholder: 'Tell us about this team member' },
        },
        createDefault: () => ({ name: 'Team Member', role: 'Role', image: '', bio: '' }),
        maxItems: 12,
      },
    ],
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
      title: 'See the Difference', subtitle: 'Drag the slider to compare before and after',
      beforeImage: '', afterImage: '',
      beforeLabel: 'Before', afterLabel: 'After',
      sliderPosition: 50, sliderColor: '#FFFFFF',
      orientation: 'horizontal',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Section Title', placeholder: 'See the Difference' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Before and after comparison' },
      beforeImage: { type: 'image', label: 'Before Image' },
      afterImage: { type: 'image', label: 'After Image' },
      beforeLabel: { type: 'text', label: 'Before Label', placeholder: 'Before', defaultValue: 'Before' },
      afterLabel: { type: 'text', label: 'After Label', placeholder: 'After', defaultValue: 'After' },
      sliderPosition: {
        type: 'range',
        label: 'Slider Start Position',
        min: 10,
        max: 90,
        step: 5,
        defaultValue: 50,
        unit: '%',
      },
      sliderColor: { type: 'color', label: 'Slider Color', defaultValue: '#FFFFFF' },
      orientation: {
        type: 'select',
        label: 'Orientation',
        options: [
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' },
        ],
        defaultValue: 'horizontal',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [],
  },

  slideshow: {
    type: 'slideshow',
    label: 'Slideshow',
    icon: 'slideshow',
    description: 'Full-width image slideshow with text overlays',
    category: 'Layout',
    editableElements: [
      { dataType: 'slideshow-slide', elementType: 'card', label: 'Slide' },
    ],
    defaultData: {
      slides: [
        { image: '', heading: 'Welcome to our store', subheading: 'Discover amazing products crafted just for you.', button_label: 'Shop Now', button_link: '#', button_style: 'solid', content_position: 'middle-center', text_alignment: 'center', overlay_opacity: 40 },
        { image: '', heading: 'New Arrivals', subheading: 'Check out the latest additions to our collection.', button_label: 'Explore', button_link: '#', button_style: 'solid', content_position: 'middle-left', text_alignment: 'left', overlay_opacity: 40 },
        { image: '', heading: 'Special Offers', subheading: "Limited time deals you don't want to miss.", button_label: 'View Deals', button_link: '#', button_style: 'outline', content_position: 'bottom-center', text_alignment: 'center', overlay_opacity: 40 },
      ],
      slide_height: 'large',
      autoplay: true,
      autoplay_speed: 5,
      show_arrows: true,
      show_dots: true,
      transition: 'slide',
      color_scheme: 'scheme-1',
      padding_top: 0,
      padding_bottom: 0,
    },
    settings: {
      slide_height: {
        type: 'select',
        label: 'Slide height',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'full', label: 'Full screen' },
        ],
        defaultValue: 'large',
      },
      transition: {
        type: 'select',
        label: 'Transition',
        options: [
          { value: 'slide', label: 'Slide' },
          { value: 'fade', label: 'Fade' },
        ],
        defaultValue: 'slide',
      },
      autoplay: { type: 'toggle', label: 'Auto-rotate slides', defaultValue: true },
      autoplay_speed: {
        type: 'range',
        label: 'Change slides every',
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 5,
        unit: 's',
      },
      show_arrows: { type: 'toggle', label: 'Show arrows', defaultValue: true },
      show_dots: { type: 'toggle', label: 'Show dots', defaultValue: true },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'slide',
        label: 'Slides',
        singularLabel: 'Slide',
        icon: 'image',
        dataKey: 'slides',
        fields: {
          image: { type: 'image', label: 'Image' },
          heading: { type: 'text', label: 'Heading', placeholder: 'Slide heading' },
          subheading: { type: 'textarea', label: 'Subheading', placeholder: 'Slide description' },
          button_label: { type: 'text', label: 'Button label', placeholder: 'Shop Now' },
          button_link: { type: 'url', label: 'Button link', placeholder: '/collections/all' },
          button_style: {
            type: 'select',
            label: 'Button style',
            options: [
              { value: 'solid', label: 'Solid' },
              { value: 'outline', label: 'Outline' },
            ],
            defaultValue: 'solid',
          },
          content_position: {
            type: 'select',
            label: 'Content position',
            options: [
              { value: 'top-left', label: 'Top left' },
              { value: 'top-center', label: 'Top center' },
              { value: 'top-right', label: 'Top right' },
              { value: 'middle-left', label: 'Middle left' },
              { value: 'middle-center', label: 'Middle center' },
              { value: 'middle-right', label: 'Middle right' },
              { value: 'bottom-left', label: 'Bottom left' },
              { value: 'bottom-center', label: 'Bottom center' },
              { value: 'bottom-right', label: 'Bottom right' },
            ],
            defaultValue: 'middle-center',
          },
          text_alignment: {
            type: 'select',
            label: 'Text alignment',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ],
            defaultValue: 'center',
          },
          overlay_opacity: {
            type: 'range',
            label: 'Overlay opacity',
            min: 0,
            max: 100,
            step: 5,
            defaultValue: 40,
            unit: '%',
          },
        },
        createDefault: () => ({
          image: '',
          heading: 'New Slide',
          subheading: 'Add your description here.',
          button_label: 'Learn More',
          button_link: '#',
          button_style: 'solid',
          content_position: 'middle-center',
          text_alignment: 'center',
          overlay_opacity: 40,
        }),
        maxItems: 10,
      },
    ],
  },

  /* ── E-COMMERCE ──────────────────────────────────────────────────────── */

  products: {
    type: 'products',
    label: 'Featured Collection',
    icon: 'inventory_2',
    description: 'Product grid from a selected collection',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'products-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'products-product', elementType: 'product', label: 'Product Card' },
    ],
    defaultData: {
      title: 'Featured Products',
      collection: '',
      heading_size: 'h1',
      columns_desktop: 4,
      show_view_all: true,
      image_ratio: 'adapt',
      show_vendor: false,
      show_rating: false,
      quick_add: 'none',
      selectedProducts: [
        { id: 'demo-1', name: 'Classic Leather Bag', price: 89.99, image: '' },
        { id: 'demo-2', name: 'Minimalist Watch', price: 149.99, image: '' },
        { id: 'demo-3', name: 'Wireless Headphones', price: 59.99, image: '' },
        { id: 'demo-4', name: 'Designer Sunglasses', price: 124.99, image: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 80,
      padding_bottom: 80,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Featured collection' },
      collection: { type: 'text', label: 'Collection', placeholder: 'e.g. New Arrivals, Best Sellers, Summer Sale' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      columns_desktop: {
        type: 'range',
        label: 'Desktop columns',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 4,
      },
      show_view_all: { type: 'toggle', label: 'Enable "View all"', helpText: 'Show a link to the full collection', defaultValue: true },
      image_ratio: {
        type: 'select',
        label: 'Image ratio',
        options: [
          ...IMAGE_RATIO_OPTIONS,
        ],
        defaultValue: 'adapt',
      },
      show_vendor: { type: 'toggle', label: 'Show vendor', defaultValue: false },
      show_rating: { type: 'toggle', label: 'Show product rating', defaultValue: false },
      quick_add: {
        type: 'select',
        label: 'Quick add button',
        options: [
          { value: 'none', label: 'None' },
          { value: 'standard', label: 'Standard' },
          { value: 'bulk', label: 'Bulk' },
        ],
        defaultValue: 'none',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
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
  },

  deals: {
    type: 'deals',
    label: 'Featured Product',
    icon: 'local_offer',
    description: 'Showcase a single product with media and buy buttons',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'deals-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'deals-product', elementType: 'product', label: 'Product' },
      { dataType: 'deals-timer',   elementType: 'countdown', label: 'Countdown Timer' },
    ],
    defaultData: {
      product: '',
      media_position: 'left',
      image_zoom: true,
      color_scheme: 'scheme-1',
      selectedProducts: [
        { id: 'demo-featured', name: 'Premium Leather Jacket', price: 249.99, image: '', description: 'Crafted from genuine full-grain leather, this timeless jacket features a modern slim fit with classic details. Perfect for any season and built to last a lifetime.' },
      ],
      blocks: [
        { type: 'title' },
        { type: 'price' },
        { type: 'description' },
        { type: 'buy_buttons' },
      ],
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      product: { type: 'text', label: 'Product', placeholder: 'Select a product', helpText: 'Enter a product handle or ID' },
      media_position: {
        type: 'select',
        label: 'Desktop media position',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'left',
      },
      image_zoom: { type: 'toggle', label: 'Enable image zoom', helpText: 'Allow zooming on product images', defaultValue: true },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'product_block',
        label: 'Product Information',
        singularLabel: 'Block',
        icon: 'widgets',
        dataKey: 'contentBlocks',
        fields: {
          block_type: {
            type: 'select',
            label: 'Block type',
            options: [
              { value: 'title', label: 'Title' },
              { value: 'price', label: 'Price' },
              { value: 'description', label: 'Description' },
              { value: 'quantity_selector', label: 'Quantity selector' },
              { value: 'buy_buttons', label: 'Buy buttons' },
              { value: 'share', label: 'Share' },
            ],
            defaultValue: 'title',
          },
        },
        createDefault: () => ({ block_type: 'title' }),
        maxItems: 8,
      },
    ],
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
  },

  collections: {
    type: 'collections',
    label: 'Collection List',
    icon: 'collections',
    description: 'Display a grid of product collections',
    category: 'E-commerce',
    editableElements: [
      { dataType: 'collections-title',      elementType: 'title', label: 'Title' },
      { dataType: 'collections-collection', elementType: 'card',  label: 'Collection Card' },
    ],
    defaultData: {
      title: 'Collections',
      heading_size: 'h1',
      image_ratio: 'square',
      columns_desktop: 3,
      show_view_all: false,
      items: [
        { collection: 'New Arrivals', image: '', link: '#' },
        { collection: 'Best Sellers', image: '', link: '#' },
        { collection: 'Sale', image: '', link: '#' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Collections' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      image_ratio: {
        type: 'select',
        label: 'Image ratio',
        options: [
          ...IMAGE_RATIO_OPTIONS,
        ],
        defaultValue: 'square',
      },
      columns_desktop: {
        type: 'range',
        label: 'Desktop columns',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
      },
      show_view_all: { type: 'toggle', label: 'Enable "View all"', defaultValue: false },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'collection',
        label: 'Collections',
        singularLabel: 'Collection',
        icon: 'collections',
        dataKey: 'items',
        fields: {
          collection: { type: 'text', label: 'Collection name', placeholder: 'Summer Collection' },
          image: { type: 'image', label: 'Image' },
          link: { type: 'url', label: 'Link', placeholder: '/collections/summer' },
        },
        createDefault: () => ({ collection: 'Collection', image: '', link: '#' }),
        maxItems: 15,
      },
    ],
    apiBinding: {
      endpoint:   '/api/public/{tenantId}/collections',
      cacheTtlMs: 120_000,
    } as ApiBinding,
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'collection_view',
      onItemClick:   'collection_click',
    } as AnalyticsEvents,
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
      currency: '$',
      billingPeriod: '/month',
      plans: [
        { name: 'Basic', price: 9, features: 'Up to 100 products\nBasic analytics\nEmail support\nCustom domain', highlighted: false, buttonText: 'Get Started', buttonLink: '#' },
        { name: 'Pro', price: 29, features: 'Unlimited products\nAdvanced analytics\nPriority support\nCustom domain\nAPI access', highlighted: true, buttonText: 'Get Started', buttonLink: '#' },
        { name: 'Enterprise', price: 99, features: 'Unlimited everything\nDedicated support\nCustom integrations\nSLA guarantee\nWhite-label', highlighted: false, buttonText: 'Contact Us', buttonLink: '#' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Simple, transparent pricing' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Choose the plan that works for you' },
      currency: { type: 'text', label: 'Currency symbol', placeholder: '$', defaultValue: '$' },
      billingPeriod: {
        type: 'select',
        label: 'Billing period label',
        options: [
          { value: '/month', label: 'Per month' },
          { value: '/year', label: 'Per year' },
          { value: '/user', label: 'Per user' },
          { value: '', label: 'No period label' },
        ],
        defaultValue: '/month',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'pricing_plan',
        label: 'Pricing Plans',
        singularLabel: 'Plan',
        icon: 'sell',
        dataKey: 'plans',
        fields: {
          name: { type: 'text', label: 'Plan Name', placeholder: 'Pro' },
          price: { type: 'number', label: 'Price', min: 0, defaultValue: 0 },
          features: { type: 'textarea', label: 'Features (one per line)', placeholder: 'Unlimited products\nPriority support\nCustom domain', helpText: 'One feature per line' },
          highlighted: { type: 'toggle', label: 'Highlighted', helpText: 'Mark this plan as recommended', defaultValue: false },
          buttonText: { type: 'text', label: 'Button Text', placeholder: 'Get Started', defaultValue: 'Get Started' },
          buttonLink: { type: 'url', label: 'Button Link', placeholder: 'https://' },
        },
        createDefault: () => ({ name: 'New Plan', price: 0, features: '', highlighted: false, buttonText: 'Get Started', buttonLink: '' }),
        maxItems: 5,
      },
    ],
  },

  /* ── ENGAGEMENT ──────────────────────────────────────────────────────── */

  cta: {
    type: 'cta',
    label: 'Rich Text',
    icon: 'campaign',
    description: 'Rich text content with heading, body, and buttons',
    category: 'Engagement',
    editableElements: [
      { dataType: 'cta-title',    elementType: 'title',    label: 'Title' },
      { dataType: 'cta-subtitle', elementType: 'subtitle', label: 'Subtitle' },
      { dataType: 'cta-button',   elementType: 'button',   label: 'Button' },
      { dataType: 'cta-bg',       elementType: 'background', label: 'Background' },
    ],
    defaultData: {
      desktop_content_position: 'center',
      content_alignment: 'center',
      full_width: false,
      heading: 'Talk about your brand',
      heading_size: 'h1',
      text: 'Share information about your brand with your customers. Describe a product, make announcements, or welcome customers to your store.',
      button_label: 'Shop Now',
      button_link: '#',
      button_secondary_style: false,
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      desktop_content_position: {
        type: 'select',
        label: 'Desktop content position',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      content_alignment: {
        type: 'select',
        label: 'Content alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      full_width: { type: 'toggle', label: 'Full width', helpText: 'Make content span the full page width', defaultValue: false },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'heading',
        label: 'Headings',
        singularLabel: 'Heading',
        icon: 'title',
        dataKey: 'blocks',
        fields: {
          text: { type: 'text', label: 'Heading', placeholder: 'Talk about your brand' },
          heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
        },
        createDefault: () => ({ type: 'heading', text: 'Talk about your brand', heading_size: 'h1' }),
        maxItems: 3,
      },
      {
        type: 'text',
        label: 'Text Blocks',
        singularLabel: 'Text',
        icon: 'notes',
        dataKey: 'blocks',
        fields: {
          text: { type: 'richtext', label: 'Text', placeholder: 'Share information about your brand...' },
        },
        createDefault: () => ({ type: 'text', text: '' }),
        maxItems: 3,
      },
      {
        type: 'button',
        label: 'Buttons',
        singularLabel: 'Button',
        icon: 'smart_button',
        dataKey: 'blocks',
        fields: {
          label: { type: 'text', label: 'Button label', placeholder: 'Shop Now' },
          link: { type: 'url', label: 'Button link', placeholder: '/' },
          secondary_style: { type: 'toggle', label: 'Use outline style', defaultValue: false },
        },
        createDefault: () => ({ type: 'button', label: 'Button', link: '#', secondary_style: false }),
        maxItems: 2,
      },
    ],
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    } as AnalyticsEvents,
  },

  countdown: {
    type: 'countdown',
    label: 'Countdown Timer',
    icon: 'timer',
    description: 'Count down to a launch date, sale, or event',
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
      color_scheme: 'scheme-4',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Limited Time Offer' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: "Don't miss out!" },
      targetDate: { type: 'date', label: 'Target Date', helpText: 'The date the countdown reaches zero' },
      showDays: { type: 'toggle', label: 'Show Days', defaultValue: true },
      showHours: { type: 'toggle', label: 'Show Hours', defaultValue: true },
      showMinutes: { type: 'toggle', label: 'Show Minutes', defaultValue: true },
      showSeconds: { type: 'toggle', label: 'Show Seconds', defaultValue: true },
      expiredMessage: { type: 'text', label: 'Expired Message', placeholder: 'Offer has ended!', defaultValue: 'The wait is over!' },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-4' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [],
  },

  newsletter: {
    type: 'newsletter',
    label: 'Newsletter',
    icon: 'email',
    description: 'Email subscription signup section',
    category: 'Engagement',
    editableElements: [
      { dataType: 'newsletter-title',  elementType: 'title',   label: 'Title' },
      { dataType: 'newsletter-button', elementType: 'button',  label: 'Subscribe Button' },
      { dataType: 'newsletter-input',  elementType: 'input',   label: 'Email Input' },
    ],
    defaultData: {
      full_width: false,
      heading: 'Subscribe to our emails',
      heading_size: 'h1',
      paragraph: 'Be the first to know about new collections and exclusive offers.',
      placeholder: 'Email',
      buttonText: 'Subscribe',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      full_width: { type: 'toggle', label: 'Full width', defaultValue: false },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'heading',
        label: 'Headings',
        singularLabel: 'Heading',
        icon: 'title',
        dataKey: 'headingBlocks',
        fields: {
          text: { type: 'text', label: 'Heading', placeholder: 'Subscribe to our emails' },
          heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
        },
        createDefault: () => ({ text: 'Subscribe to our emails', heading_size: 'h1' }),
        maxItems: 1,
      },
      {
        type: 'paragraph',
        label: 'Paragraphs',
        singularLabel: 'Paragraph',
        icon: 'notes',
        dataKey: 'paragraphBlocks',
        fields: {
          text: { type: 'richtext', label: 'Text', placeholder: 'Be the first to know about new collections and exclusive offers.' },
        },
        createDefault: () => ({ text: 'Be the first to know about new collections and exclusive offers.' }),
        maxItems: 1,
      },
      {
        type: 'email_form',
        label: 'Email Form',
        singularLabel: 'Email Form',
        icon: 'email',
        dataKey: 'emailFormBlocks',
        fields: {
          placeholder: { type: 'text', label: 'Placeholder', placeholder: 'Email', defaultValue: 'Email' },
          buttonText: { type: 'text', label: 'Button text', placeholder: 'Subscribe', defaultValue: 'Subscribe' },
        },
        createDefault: () => ({ placeholder: 'Email', buttonText: 'Subscribe' }),
        maxItems: 1,
      },
    ],
    apiBinding: {
      endpoint: '/api/public/{tenantId}/newsletter/subscribe',
      method:   'POST',
    } as ApiBinding,
    analyticsEvents: {
      onFormSubmit: 'newsletter_subscribe',
    } as AnalyticsEvents,
  },

  services: {
    type: 'services',
    label: 'Multirow',
    icon: 'view_agenda',
    description: 'Alternating image and text rows for services or features',
    category: 'Engagement',
    editableElements: [
      { dataType: 'services-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'services-service', elementType: 'service', label: 'Row' },
    ],
    defaultData: {
      image_layout: 'alternate-left',
      heading_size: 'h1',
      desktop_content_position: 'middle',
      content_alignment: 'left',
      services: [
        { image: '', caption: 'Step 1', heading: 'Browse Our Collection', text: 'Explore our curated selection of premium products. Filter by category, price, or popularity to find exactly what you need.', button_label: 'Shop Now', button_link: '#' },
        { image: '', caption: 'Step 2', heading: 'Customize Your Order', text: 'Choose your preferred size, color, and quantity. Add special instructions or gift wrapping for that personal touch.', button_label: 'Learn More', button_link: '#' },
        { image: '', caption: 'Step 3', heading: 'Fast & Free Delivery', text: 'Enjoy complimentary shipping on all orders. Track your package in real-time from our warehouse to your doorstep.', button_label: 'Track Order', button_link: '#' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      image_layout: {
        type: 'select',
        label: 'Image layout',
        options: [
          { value: 'alternate-left', label: 'Alternating (start left)' },
          { value: 'alternate-right', label: 'Alternating (start right)' },
          { value: 'align-left', label: 'All images left' },
          { value: 'align-right', label: 'All images right' },
        ],
        defaultValue: 'alternate-left',
      },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      desktop_content_position: {
        type: 'select',
        label: 'Desktop content position',
        options: [
          { value: 'top', label: 'Top' },
          { value: 'middle', label: 'Middle' },
          { value: 'bottom', label: 'Bottom' },
        ],
        defaultValue: 'middle',
      },
      content_alignment: {
        type: 'select',
        label: 'Content alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'left',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'row',
        label: 'Rows',
        singularLabel: 'Row',
        icon: 'view_agenda',
        dataKey: 'services',
        fields: {
          image: { type: 'image', label: 'Image' },
          caption: { type: 'text', label: 'Caption', placeholder: 'Add a tagline' },
          heading: { type: 'text', label: 'Heading', placeholder: 'Row heading' },
          text: { type: 'richtext', label: 'Text', placeholder: 'Describe this row...' },
          button_label: { type: 'text', label: 'Button label', placeholder: 'Learn more' },
          button_link: { type: 'url', label: 'Button link', placeholder: '/' },
        },
        createDefault: () => ({ image: '', caption: '', heading: 'Row', text: 'Pair text with an image to focus on your chosen product, collection, or blog post.', button_label: '', button_link: '' }),
        maxItems: 10,
      },
    ],
  },

  /* ── SOCIAL PROOF ────────────────────────────────────────────────────── */

  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    icon: 'format_quote',
    description: 'Customer reviews and testimonials',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'testimonials-title', elementType: 'title',       label: 'Section Title' },
      { dataType: 'testimonials-item',  elementType: 'testimonial', label: 'Review Card' },
    ],
    defaultData: {
      title: 'What Our Customers Say',
      heading_size: 'h1',
      columns: 3,
      items: [
        { name: 'Sarah M.',  role: 'Verified Buyer', text: 'Amazing quality and fast shipping! The product arrived perfectly packaged and exactly as described.', rating: 5, image: '' },
        { name: 'Ahmed K.',  role: 'Customer',       text: 'Great products, will definitely buy again. Customer service was incredibly helpful and responsive.',   rating: 5, image: '' },
        { name: 'Emily R.',  role: 'Verified Buyer', text: 'Exceeded my expectations! The attention to detail is remarkable and the quality is outstanding.',         rating: 5, image: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'What Our Customers Say' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      columns: {
        type: 'range',
        label: 'Columns',
        min: 1,
        max: 4,
        step: 1,
        defaultValue: 3,
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'testimonial',
        label: 'Testimonials',
        singularLabel: 'Testimonial',
        icon: 'format_quote',
        dataKey: 'items',
        fields: {
          name: { type: 'text', label: 'Customer Name', placeholder: 'Jane Smith' },
          role: { type: 'text', label: 'Role / Title', placeholder: 'Verified Buyer' },
          text: { type: 'textarea', label: 'Review Text', placeholder: 'This product changed my life!' },
          rating: { type: 'range', label: 'Star Rating', min: 1, max: 5, step: 1, defaultValue: 5 },
          image: { type: 'image', label: 'Profile Photo' },
        },
        createDefault: () => ({ name: 'Customer Name', role: 'Verified Buyer', text: 'Amazing product!', rating: 5, image: '' }),
        maxItems: 12,
      },
    ],
  },

  faq: {
    type: 'faq',
    label: 'Collapsible Content',
    icon: 'help_outline',
    description: 'Accordion FAQ with optional image and custom layout',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'faq-title', elementType: 'title',   label: 'Title' },
      { dataType: 'faq-item',  elementType: 'faqItem', label: 'FAQ Item' },
    ],
    defaultData: {
      caption: '',
      heading: 'Frequently Asked Questions',
      heading_size: 'h1',
      heading_alignment: 'center',
      layout: 'none',
      open_first: true,
      image: '',
      faqs: [
        { heading: 'What is your return policy?', content: 'We offer 30-day hassle-free returns on all items. Simply contact our support team and we will arrange a return label for you.', icon: '' },
        { heading: 'How long does shipping take?', content: 'Standard shipping takes 3-5 business days. Express shipping is available for 1-2 business day delivery.', icon: '' },
        { heading: 'Do you ship internationally?', content: 'Yes! We ship to over 50 countries worldwide. International shipping typically takes 7-14 business days.', icon: '' },
        { heading: 'How can I track my order?', content: 'Once your order ships, you will receive a tracking number via email. You can track your package in real-time through our website.', icon: '' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      caption: { type: 'text', label: 'Caption', placeholder: 'FAQ' },
      heading: { type: 'text', label: 'Heading', placeholder: 'Frequently Asked Questions' },
      heading_size: { type: 'select', label: 'Heading size', options: HEADING_SIZE_OPTIONS, defaultValue: 'h1' },
      heading_alignment: {
        type: 'select',
        label: 'Heading alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
      },
      layout: {
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'none', label: 'No container' },
          { value: 'row', label: 'Row layout' },
          { value: 'section', label: 'Section layout' },
        ],
        defaultValue: 'none',
      },
      open_first: { type: 'toggle', label: 'Open first row', helpText: 'Expand the first collapsible row by default', defaultValue: true },
      image: { type: 'image', label: 'Image', helpText: 'Optional image displayed alongside the content' },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'collapsible_row',
        label: 'Collapsible Rows',
        singularLabel: 'Row',
        icon: 'unfold_more',
        dataKey: 'faqs',
        fields: {
          heading: { type: 'text', label: 'Heading', placeholder: 'How do I place an order?' },
          content: { type: 'richtext', label: 'Content', placeholder: 'Provide the answer here...' },
          icon: { type: 'icon', label: 'Icon', placeholder: 'help_outline', helpText: 'Material icon shown next to the heading' },
        },
        createDefault: () => ({ heading: 'New Question', content: 'Answer here', icon: '' }),
        maxItems: 20,
      },
    ],
  },

  partners: {
    type: 'partners',
    label: 'Partners / Brands',
    icon: 'business',
    description: 'Logo wall of trusted brands and partners',
    category: 'Social Proof',
    editableElements: [
      { dataType: 'partners-title',   elementType: 'title',   label: 'Title' },
      { dataType: 'partners-partner', elementType: 'partner', label: 'Partner Logo' },
    ],
    defaultData: {
      title: 'Trusted By',
      subtitle: 'Leading brands that work with us',
      grayscale: true,
      autoScroll: false,
      partners: [
        { name: 'Apple', logo: '', link: '#' },
        { name: 'Google', logo: '', link: '#' },
        { name: 'Samsung', logo: '', link: '#' },
        { name: 'Nike', logo: '', link: '#' },
        { name: 'Adidas', logo: '', link: '#' },
      ],
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Trusted By' },
      subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Brands that trust us' },
      grayscale: { type: 'toggle', label: 'Grayscale logos', helpText: 'Display partner logos in grayscale', defaultValue: true },
      autoScroll: { type: 'toggle', label: 'Auto-scroll', helpText: 'Automatically scroll logos horizontally', defaultValue: false },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'partner',
        label: 'Partners',
        singularLabel: 'Partner',
        icon: 'business',
        dataKey: 'partners',
        fields: {
          name: { type: 'text', label: 'Partner Name', placeholder: 'Acme Corp' },
          logo: { type: 'image', label: 'Logo' },
          link: { type: 'url', label: 'Website URL', placeholder: 'https://acme.com' },
        },
        createDefault: () => ({ name: 'Partner', logo: '', link: '' }),
        maxItems: 20,
      },
    ],
  },

  /* ── Product Information — single product detail page ────────────────── */
  productInfo: {
    type: 'productInfo',
    label: 'Product Information',
    icon: 'inventory_2',
    description: 'Product detail section with customizable blocks',
    category: 'E-commerce',
    editableElements: [],
    defaultData: {
      product_name: 'Sample Product',
      product_vendor: 'Vendor',
      product_price: 99.99,
      product_compare_price: 0,
      product_description: 'This is a sample product description. Add details about materials, care instructions, sizing, and other important information.',
      product_images: [],
      product_available: true,
      product_sku: 'SKU-001',
      product_inventory: 25,
      media_width: 'medium',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
      blocks: [
        { type: 'vendor' },
        { type: 'title' },
        { type: 'price' },
        { type: 'quantity_selector' },
        { type: 'buy_buttons' },
        { type: 'description' },
        { type: 'share' },
      ],
    },
    settings: {
      media_width: {
        type: 'select',
        label: 'Desktop media width',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        defaultValue: 'medium',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
    blocks: [
      {
        type: 'title',
        label: 'Title',
        singularLabel: 'Title',
        icon: 'title',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'title' }),
        maxItems: 1,
      },
      {
        type: 'price',
        label: 'Price',
        singularLabel: 'Price',
        icon: 'sell',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'price' }),
        maxItems: 1,
      },
      {
        type: 'vendor',
        label: 'Vendor',
        singularLabel: 'Vendor',
        icon: 'storefront',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'vendor' }),
        maxItems: 1,
      },
      {
        type: 'description',
        label: 'Description',
        singularLabel: 'Description',
        icon: 'subject',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'description' }),
        maxItems: 1,
      },
      {
        type: 'variant_picker',
        label: 'Variant Picker',
        singularLabel: 'Variant Picker',
        icon: 'tune',
        dataKey: 'blocks',
        fields: {
          picker_type: {
            type: 'select',
            label: 'Picker type',
            options: [
              { value: 'dropdown', label: 'Dropdown' },
              { value: 'pills', label: 'Pills' },
              { value: 'color_swatches', label: 'Color swatches' },
            ],
            defaultValue: 'dropdown',
          },
        },
        createDefault: () => ({ type: 'variant_picker', picker_type: 'dropdown' }),
        maxItems: 1,
      },
      {
        type: 'quantity_selector',
        label: 'Quantity Selector',
        singularLabel: 'Quantity Selector',
        icon: 'exposure',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'quantity_selector' }),
        maxItems: 1,
      },
      {
        type: 'buy_buttons',
        label: 'Buy Buttons',
        singularLabel: 'Buy Buttons',
        icon: 'shopping_cart',
        dataKey: 'blocks',
        fields: {
          show_dynamic_checkout: { type: 'toggle', label: 'Show dynamic checkout button', defaultValue: true },
        },
        createDefault: () => ({ type: 'buy_buttons', show_dynamic_checkout: true }),
        maxItems: 1,
      },
      {
        type: 'sku',
        label: 'SKU',
        singularLabel: 'SKU',
        icon: 'qr_code',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'sku' }),
        maxItems: 1,
      },
      {
        type: 'inventory_status',
        label: 'Inventory Status',
        singularLabel: 'Inventory Status',
        icon: 'warehouse',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'inventory_status' }),
        maxItems: 1,
      },
      {
        type: 'share',
        label: 'Share',
        singularLabel: 'Share',
        icon: 'share',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'share' }),
        maxItems: 1,
      },
      {
        type: 'rating',
        label: 'Product Rating',
        singularLabel: 'Rating',
        icon: 'star',
        dataKey: 'blocks',
        fields: {},
        createDefault: () => ({ type: 'rating' }),
        maxItems: 1,
      },
      {
        type: 'collapsible_tab',
        label: 'Collapsible Row',
        singularLabel: 'Collapsible Row',
        icon: 'expand_more',
        dataKey: 'blocks',
        fields: {
          heading: { type: 'text', label: 'Heading', placeholder: 'Shipping & Returns' },
          content: { type: 'richtext', label: 'Content', placeholder: 'Add details...' },
        },
        createDefault: () => ({ type: 'collapsible_tab', heading: 'Details', content: '' }),
        maxItems: 10,
      },
      {
        type: 'custom_text',
        label: 'Custom Text',
        singularLabel: 'Text',
        icon: 'notes',
        dataKey: 'blocks',
        fields: {
          text: { type: 'richtext', label: 'Text', placeholder: 'Add custom text...' },
        },
        createDefault: () => ({ type: 'custom_text', text: '' }),
        maxItems: 5,
      },
    ],
  },

  /* ── Cart — shopping cart page section ───────────────────────────────── */
  cart: {
    type: 'cart',
    label: 'Cart',
    icon: 'shopping_bag',
    description: 'Shopping cart with items, quantities, and checkout',
    category: 'E-commerce',
    editableElements: [],
    defaultData: {
      title: 'Your cart',
      empty_message: 'Your cart is empty',
      empty_button_text: 'Continue shopping',
      empty_button_link: '/',
      show_notes: true,
      show_shipping: true,
      preview_mode: 'with_items',
      color_scheme: 'scheme-1',
      padding_top: 36,
      padding_bottom: 36,
    },
    settings: {
      title: { type: 'text', label: 'Heading', placeholder: 'Your cart' },
      empty_message: { type: 'text', label: 'Empty cart message', placeholder: 'Your cart is empty' },
      empty_button_text: { type: 'text', label: 'Empty button text', placeholder: 'Continue shopping' },
      show_notes: { type: 'toggle', label: 'Enable cart notes', defaultValue: true },
      show_shipping: { type: 'toggle', label: 'Show shipping estimate notice', defaultValue: true },
      preview_mode: {
        type: 'select',
        label: 'Preview mode',
        options: [
          { value: 'with_items', label: 'With sample items' },
          { value: 'empty', label: 'Empty cart' },
        ],
        defaultValue: 'with_items',
      },
      color_scheme: { type: 'select', label: 'Color scheme', options: COLOR_SCHEME_OPTIONS, defaultValue: 'scheme-1' },
      padding_top: PADDING_TOP,
      padding_bottom: PADDING_BOTTOM,
    },
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   Helpers — used by BuilderCanvas, BuilderSidebar, BuilderPage
────────────────────────────────────────────────────────────────────────── */
import type { ElementType } from '../types/elementEditor';

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

/* ──────────────────────────────────────────────────────────────────────────
   Category helpers (used by BuilderSidebar — deprecated, kept for compat)
────────────────────────────────────────────────────────────────────────── */
export const CATEGORY_ORDER: string[] = ['Layout', 'Content', 'E-commerce', 'Engagement', 'Social Proof'];

export function getRegistryByCategory(): Record<string, SectionRegistryEntry[]> {
  const map: Record<string, SectionRegistryEntry[]> = {};
  for (const entry of Object.values(SECTION_REGISTRY)) {
    const cat = entry.category;
    if (!map[cat]) map[cat] = [];
    map[cat].push(entry);
  }
  return map;
}
