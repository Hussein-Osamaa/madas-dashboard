/**
 * sectionDefaults.ts
 * ──────────────────
 * Canonical default data for every section type the React builder can create.
 *
 * PURPOSE
 *  • SectionRenderer merges these defaults BEFORE passing `data` to section
 *    components, so no component ever receives undefined / null / empty-object
 *    data — eliminating the "Cannot read properties of undefined" crash family.
 *  • When a user adds a fresh section, the registry can use these values to
 *    pre-populate the editor with sensible content.
 *
 * RULE: every key that a section component destructures with a default MUST
 * appear here with that same default.  This is the single source of truth.
 */

import type { SectionType } from '../../../types/builder';

export type SectionDefaults = Record<string, unknown>;

const HERO: SectionDefaults = {
  layout:           'default',         // 'default' | 'minimal' | 'split' | 'compact'
  isCarousel:       false,
  slides:           [],
  title:            'Welcome to Our Store',
  subtitle:         'Discover amazing products crafted for you.',
  buttonText:       'Shop Now',
  buttonLink:       '#',
  secondaryButtonText: '',
  secondaryButtonLink: '#',
  backgroundImage:  '',
  backgroundSize:   'cover',
  backgroundPosition: 'center',
  backgroundColor:  'linear-gradient(135deg, #27491F 0%, #3a6b2e 100%)',
  textColor:        '#FFFFFF',
  overlayColor:     'rgba(0,0,0,0.35)',
  overlayEnabled:   false,
  autoplay:         false,
  autoplayInterval: 5000,
  showNavigation:   true,
  showIndicators:   true,
  textStyle:        {},
  imageUrl:         '',                // used by split layout
  imagePosition:    'right',           // split layout: 'left' | 'right'
  height:           'large',           // 'compact' | 'medium' | 'large' | 'full'
};

const NAVBAR: SectionDefaults = {
  logo:                     '',
  logoText:                 'My Store',
  menuItems:                [],
  showSearch:               true,
  searchPlaceholder:        'Search…',
  showCart:                 true,
  cartCount:                0,
  cartUrl:                  '#',
  showWishlist:             false,
  wishlistCount:            0,
  wishlistUrl:              '#',
  showUserIcon:             false,
  userIconUrl:              '#',
  backgroundColor:          '#ffffff',
  textColor:                '#171817',
  sticky:                   true,
  hoverBackgroundColor:     '',
  hoverColor:               '#27491F',
  hoverEffect:              'underline',
};

const FEATURES: SectionDefaults = {
  title:    'Why Choose Us',
  subtitle: 'Everything you need, all in one place.',
  layout:   'grid',       // 'grid' | 'list' | 'cards'
  columns:  3,
  items: [
    { icon: 'local_shipping', title: 'Fast Delivery', description: 'Get your order delivered to your door in record time.' },
    { icon: 'verified',       title: 'Trusted Quality', description: 'Every product is rigorously tested before it reaches you.' },
    { icon: 'support_agent',  title: '24/7 Support',   description: 'Our team is always here to help whenever you need us.' },
  ],
};

const PRODUCTS: SectionDefaults = {
  title:            'Featured Products',
  subtitle:         'Hand-picked just for you.',
  layout:           'grid',
  columns:          3,
  selectedProducts: [],
  showPrice:        true,
  showAddToCart:    true,
  cardStyle: {
    backgroundColor:        '#ffffff',
    textColor:              '#171817',
    priceColor:             '#27491F',
    borderRadius:           12,
    shadow:                 'md',
    imageAspect:            'square',
    imageFit:               'cover',
    imageBackgroundColor:   '#f5f5f5',
    buttonBackgroundColor:  '#27491F',
    buttonTextColor:        '#ffffff',
    buttonBorderRadius:     8,
    buttonFullWidth:        true,
    buttonHoverEffect:      'fill',
    showBorder:             false,
    borderColor:            '#e5e7eb',
  },
};

const DEALS: SectionDefaults = {
  title:            'Hot Deals',
  viewMoreText:     'View All Deals',
  viewMoreLink:     '#',
  selectedProducts: [],
  columns:          3,
  showCountdown:    false,
  countdownEndDate: '',
  countdownStyle: {
    backgroundColor: '#27491F',
    textColor:       '#ffffff',
    labelColor:      'rgba(255,255,255,0.7)',
    borderRadius:    8,
  },
  cardStyle: {
    backgroundColor:      '#ffffff',
    textColor:            '#171817',
    descriptionColor:     '#6b7280',
    priceColor:           '#27491F',
    borderRadius:         12,
    showBorder:           false,
    borderColor:          '#e5e7eb',
    imageBackgroundColor: '#f5f5f5',
    buttonBackgroundColor:'#27491F',
    buttonTextColor:      '#ffffff',
    buttonBorderRadius:   8,
  },
};

const COLLECTIONS: SectionDefaults = {
  title:                'Shop by Collection',
  subtitle:             'Explore our curated collections.',
  layout:               'grid',
  columns:              3,
  selectedCollections:  [],
  cardStyle: {
    backgroundColor:          '#ffffff',
    textColor:                '#ffffff',
    borderRadius:             12,
    showBorder:               false,
    borderColor:              '#e5e7eb',
    imageAspect:              'square',
    imageFit:                 'cover',
    overlayColor:             'rgba(0,0,0,0.4)',
    overlayOpacity:           0.4,
    showName:                 true,
    showDescription:          false,
    showProductCount:         true,
    namePosition:             'overlay',
    showButton:               true,
    buttonText:               'Shop Now',
    buttonBackgroundColor:    '#ffffff',
    buttonTextColor:          '#171817',
    buttonBorderRadius:       8,
    buttonHoverBackgroundColor:'#27491F',
    buttonHoverTextColor:     '#ffffff',
    buttonHoverEffect:        'fill',
  },
};

const TESTIMONIALS: SectionDefaults = {
  title:  'What Our Customers Say',
  layout: 'grid',      // 'grid' | 'carousel'
  items: [
    { name: 'Sarah M.',  role: 'Verified Buyer', text: 'Absolutely love the quality! Will definitely order again.',   rating: 5, image: '' },
    { name: 'Ahmed K.',  role: 'Verified Buyer', text: 'Fast shipping and exactly as described. Very happy.',          rating: 5, image: '' },
    { name: 'Layla R.',  role: 'Verified Buyer', text: 'Great customer service and beautiful products. 10/10!',       rating: 5, image: '' },
  ],
};

const CTA: SectionDefaults = {
  title:                "Ready to Get Started?",
  subtitle:             "Join thousands of happy customers today.",
  buttonText:           'Shop Now',
  buttonLink:           '#',
  secondaryButtonText:  '',
  secondaryButtonLink:  '#',
  backgroundColor:      '#27491F',
  textColor:            '#ffffff',
  buttonBackgroundColor:'#FFD300',
  buttonTextColor:      '#171817',
  layout:               'centered',    // 'centered' | 'split'
};

const ABOUT: SectionDefaults = {
  title:         'Our Story',
  content:       'We started with a simple mission: to bring you the best products at the best prices. Every item in our store is carefully selected for quality and value.',
  image:         '',
  imageAlt:      '',
  imagePosition: 'right',   // 'left' | 'right'
  buttonText:    'Learn More',
  buttonLink:    '#',
};

const CONTACT: SectionDefaults = {
  title:       'Get in Touch',
  subtitle:    "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
  email:       '',
  phone:       '',
  address:     '',
  showMap:     false,
  mapEmbedUrl: '',
  showPhone:   true,
  showEmail:   true,
  buttonText:  'Send Message',
  placeholder: 'How can we help you?',
};

const GALLERY: SectionDefaults = {
  title:    'Our Gallery',
  subtitle: '',
  layout:   'grid',     // 'grid' | 'masonry' | 'carousel'
  columns:  3,
  images:   [],
};

const PRICING: SectionDefaults = {
  title:         'Simple, Transparent Pricing',
  subtitle:      'Choose the plan that works best for you.',
  currency:      'SAR',
  billingPeriod: 'month',
  plans: [
    { name: 'Basic',    price: 49,  features: ['5 Products', 'Basic Analytics', 'Email Support'],              highlighted: false, buttonText: 'Get Started' },
    { name: 'Pro',      price: 99,  features: ['Unlimited Products', 'Advanced Analytics', 'Priority Support', 'Custom Domain'], highlighted: true,  buttonText: 'Get Started' },
    { name: 'Business', price: 199, features: ['Everything in Pro', 'Dedicated Manager', 'API Access', 'White Label'], highlighted: false, buttonText: 'Contact Us' },
  ],
};

const FAQ: SectionDefaults = {
  title: 'Frequently Asked Questions',
  items: [
    { question: 'How long does shipping take?',       answer: 'Standard shipping takes 3-5 business days. Express options are also available at checkout.' },
    { question: 'What is your return policy?',        answer: 'We offer a 30-day hassle-free return policy on all items in their original condition.' },
    { question: 'Do you ship internationally?',       answer: 'Yes, we ship to over 50 countries worldwide. Shipping rates and times vary by location.' },
    { question: 'How can I track my order?',          answer: 'Once your order ships, you will receive a tracking number via email to monitor your delivery.' },
  ],
};

const FOOTER: SectionDefaults = {
  layout:                      'classic',   // 'classic' | 'minimal'
  backgroundColor:             '#1a1a1a',
  textColor:                   '#ffffff',
  borderColor:                 'rgba(255,255,255,0.1)',
  logoText:                    'My Store',
  logo:                        '',
  tagline:                     'Quality products delivered to your door.',
  copyrightText:               `© ${new Date().getFullYear()} My Store. All rights reserved.`,
  columns:                     [],
  policyLinks:                 [],
  socialLinks:                 [],
  socialIconBackgroundColor:   'rgba(255,255,255,0.1)',
  socialIconHoverBackgroundColor: '#27491F',
  showNewsletter:              false,
  newsletterText:              'Subscribe to get updates and exclusive offers.',
  newsletterPlaceholder:       'Enter your email',
};

const STATS: SectionDefaults = {
  title:    '',
  subtitle: '',
  layout:   'row',      // 'row' | 'grid'
  animated: true,
  stats: [
    { value: '10K+', label: 'Happy Customers', prefix: '', suffix: '', icon: 'people' },
    { value: '500+', label: 'Products',         prefix: '', suffix: '', icon: 'inventory_2' },
    { value: '50+',  label: 'Countries Served', prefix: '', suffix: '', icon: 'public' },
    { value: '99',   label: 'Satisfaction Rate',prefix: '', suffix: '%', icon: 'star' },
  ],
};

const TEAM: SectionDefaults = {
  title:    'Meet the Team',
  subtitle: 'The people behind the magic.',
  layout:   'grid',     // 'grid' | 'carousel'
  members:  [],
};

const SERVICES: SectionDefaults = {
  title:    'Our Services',
  subtitle: 'Everything we offer to make your experience exceptional.',
  layout:   'cards',    // 'grid' | 'list' | 'cards'
  services: [
    { icon: 'local_shipping', title: 'Fast Delivery',    description: 'Same-day dispatch on all orders placed before 2pm.', link: '#', price: '' },
    { icon: 'autorenew',      title: 'Easy Returns',     description: '30-day hassle-free returns on every item.',          link: '#', price: '' },
    { icon: 'support_agent',  title: 'Customer Support', description: 'Live chat and phone support 7 days a week.',         link: '#', price: '' },
  ],
};

const VIDEO: SectionDefaults = {
  title:        '',
  subtitle:     '',
  videoUrl:     '',
  videoType:    'youtube',   // 'youtube' | 'vimeo' | 'custom'
  thumbnailUrl: '',
  autoplay:     false,
  showControls: true,
  aspectRatio:  '16/9',
};

const COUNTDOWN: SectionDefaults = {
  title:          'Sale Ends In',
  subtitle:       "Don't miss out on these exclusive deals.",
  targetDate:     new Date(Date.now() + 7 * 86_400_000).toISOString(),
  showDays:       true,
  showHours:      true,
  showMinutes:    true,
  showSeconds:    true,
  expiredMessage: 'Sale has ended.',
  backgroundColor:'#27491F',
  textColor:      '#ffffff',
};

const BANNER: SectionDefaults = {
  text:           'Free shipping on all orders over 200 SAR! 🎉',
  link:           '#',
  linkText:       'Shop Now',
  backgroundColor:'#27491F',
  textColor:      '#ffffff',
  icon:           '',
  dismissible:    true,
  position:       'top',
  enableMarquee:  false,
  marqueeSpeed:   40,
};

const PARTNERS: SectionDefaults = {
  title:      'Trusted by Leading Brands',
  subtitle:   '',
  partners:   [],
  grayscale:  true,
  autoScroll: true,
};

const NEWSLETTER: SectionDefaults = {
  title:           'Stay in the Loop',
  subtitle:        'Subscribe for exclusive deals, new arrivals, and more.',
  placeholder:     'Enter your email address',
  buttonText:      'Subscribe',
  backgroundColor: '#27491F',
  textColor:       '#ffffff',
  successMessage:  "You're subscribed! 🎉",
};

const DIVIDER: SectionDefaults = {
  style:   'line',     // 'line' | 'dotted' | 'dashed' | 'gradient' | 'wave' | 'zigzag'
  color:   '#e5e7eb',
  height:  1,
  width:   '100%',
  spacing: 48,
};

const IMAGE_COMPARISON: SectionDefaults = {
  title:          '',
  subtitle:       '',
  beforeImage:    '',
  afterImage:     '',
  beforeLabel:    'Before',
  afterLabel:     'After',
  sliderPosition: 50,
  sliderColor:    '#27491F',
  showLabels:     true,
  orientation:    'horizontal',
};

/**
 * Map from SectionType to its default data object.
 * SectionRenderer merges these with the stored section data before rendering.
 */
export const SECTION_DEFAULTS: Record<SectionType, SectionDefaults> = {
  hero:            HERO,
  navbar:          NAVBAR,
  features:        FEATURES,
  products:        PRODUCTS,
  deals:           DEALS,
  collections:     COLLECTIONS,
  testimonials:    TESTIMONIALS,
  cta:             CTA,
  about:           ABOUT,
  contact:         CONTACT,
  gallery:         GALLERY,
  pricing:         PRICING,
  faq:             FAQ,
  footer:          FOOTER,
  stats:           STATS,
  team:            TEAM,
  services:        SERVICES,
  video:           VIDEO,
  countdown:       COUNTDOWN,
  banner:          BANNER,
  partners:        PARTNERS,
  newsletter:      NEWSLETTER,
  divider:         DIVIDER,
  imageComparison: IMAGE_COMPARISON,
};

/**
 * Merge stored section data with canonical defaults.
 * The stored value always wins over the default — this is a one-level-deep
 * merge only (nested objects like `cardStyle` are replaced wholesale if
 * present in the stored data, to avoid partial override surprises).
 */
export function mergeSectionData(
  type: SectionType,
  storedData: unknown,
): Record<string, unknown> {
  const defaults = SECTION_DEFAULTS[type] ?? {};

  // If storedData is a non-null, non-empty object, overlay it on defaults
  if (storedData && typeof storedData === 'object' && !Array.isArray(storedData)) {
    const stored = storedData as Record<string, unknown>;
    // Only overlay keys that are actually present in stored data (not undefined)
    const overlay: Record<string, unknown> = {};
    for (const key of Object.keys(stored)) {
      if (stored[key] !== undefined) overlay[key] = stored[key];
    }
    return { ...defaults, ...overlay };
  }

  return { ...defaults };
}
