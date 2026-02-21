export type SectionType =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'products'
  | 'deals'
  | 'collections'
  | 'testimonials'
  | 'cta'
  | 'about'
  | 'contact'
  | 'gallery'
  | 'pricing'
  | 'faq'
  | 'footer'
  | 'stats'
  | 'team'
  | 'services'
  | 'video'
  | 'countdown'
  | 'banner'
  | 'partners'
  | 'newsletter'
  | 'divider'
  | 'imageComparison';

export interface Section {
  id: string;
  type: SectionType;
  order: number;
  data: Record<string, any>;
  style?: {
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    paddingTop?: number;
    paddingBottom?: number;
    paddingX?: number;
    margin?: { top?: number; bottom?: number; left?: number; right?: number };
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: 'cover' | 'contain' | 'auto' | string;
    backgroundPosition?: string;
    color?: string;
    textColor?: string;
    borderRadius?: number;
    shadow?: boolean;
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
    animation?: 'none' | 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
  };
}

export interface HeroSectionData {
  layout?: 'default' | 'minimal';
  isCarousel?: boolean;
  slides?: Array<{
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundColor: string;
    textColor: string;
    textStyle?: {
      titleFontSize?: number;
      titleFontWeight?: string;
      titleAlignment?: 'left' | 'center' | 'right';
      subtitleFontSize?: number;
      subtitleFontWeight?: string;
      subtitleAlignment?: 'left' | 'center' | 'right';
      buttonStyle?: {
        backgroundColor?: string;
        textColor?: string;
        borderRadius?: number;
        fontSize?: number;
        fontWeight?: string;
        padding?: string;
        variant?: 'filled' | 'outlined' | 'ghost';
      };
    };
  }>;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundColor: string;
  textColor: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  textStyle?: {
    titleFontSize?: number;
    titleFontWeight?: string;
    titleAlignment?: 'left' | 'center' | 'right';
    subtitleFontSize?: number;
    subtitleFontWeight?: string;
    subtitleAlignment?: 'left' | 'center' | 'right';
    buttonStyle?: {
      backgroundColor?: string;
      textColor?: string;
      borderRadius?: number;
      fontSize?: number;
      fontWeight?: string;
      padding?: string;
      variant?: 'filled' | 'outlined' | 'ghost';
    };
  };
}

export interface FeaturesSectionData {
  title: string;
  subtitle: string;
  items: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface SelectedProduct {
  id: string;
  name: string;
  price: number;
  sellingPrice?: number;
  image?: string;
  description?: string;
  // Sale pricing fields
  onSale?: boolean;
  salePrice?: number;
  compareAtPrice?: number;
}

export interface ProductCardStyle {
  backgroundColor: string;
  textColor: string;
  priceColor: string;
  borderRadius: number;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  imageAspect: 'square' | 'portrait' | 'landscape';
  imageFit: 'contain' | 'cover' | 'fill' | 'none';
  imageBackgroundColor: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
  buttonBorderRadius: number;
  buttonFullWidth: boolean;
  buttonHoverEffect?: 'none' | 'fill' | 'scale' | 'glow';
  buttonHoverBackgroundColor?: string;
  buttonHoverTextColor?: string;
  showBorder: boolean;
  borderColor: string;
}

export interface TextStyle {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface ProductsSectionData {
  title: string;
  subtitle: string;
  layout: 'grid' | 'list' | 'carousel';
  columns?: 2 | 3 | 4;
  selectedProducts: SelectedProduct[];
  showPrice?: boolean;
  showAddToCart?: boolean;
  cardStyle?: ProductCardStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export interface DealsSectionData {
  title: string;
  viewMoreText?: string;
  viewMoreLink?: string;
  selectedProducts: SelectedProduct[];
  columns?: 2 | 3 | 4;
  // Countdown timer options
  showCountdown?: boolean;
  countdownEndDate?: string; // ISO date string
  countdownStyle?: {
    backgroundColor: string;
    textColor: string;
    labelColor: string;
    borderRadius: number;
  };
  cardStyle?: {
    backgroundColor: string;
    textColor: string;
    descriptionColor: string;
    priceColor: string;
    borderRadius: number;
    showBorder: boolean;
    borderColor: string;
    imageBackgroundColor: string;
    buttonBackgroundColor: string;
    buttonTextColor: string;
    buttonBorderRadius: number;
  };
}

export interface SelectedCollection {
  id: string;
  name: string;
  image?: string;
  description?: string;
  productCount?: number;
}

export interface CollectionsSectionData {
  title: string;
  subtitle?: string;
  layout?: 'grid' | 'carousel' | 'featured';
  columns?: 2 | 3 | 4 | 5 | 6;
  selectedCollections: SelectedCollection[];
  cardStyle?: {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    showBorder: boolean;
    borderColor: string;
    imageAspect: 'square' | 'portrait' | 'landscape' | 'wide';
    imageFit: 'cover' | 'contain';
    overlayColor: string;
    overlayOpacity: number;
    showName: boolean;
    showDescription: boolean;
    showProductCount: boolean;
    namePosition: 'below' | 'overlay';
    // Button styling
    showButton: boolean;
    buttonText: string;
    buttonBackgroundColor: string;
    buttonTextColor: string;
    buttonBorderRadius: number;
    buttonHoverBackgroundColor: string;
    buttonHoverTextColor: string;
    buttonHoverEffect: 'none' | 'fill' | 'scale' | 'glow';
  };
  titleStyle?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
  subtitleStyle?: {
    fontSize?: string;
    color?: string;
  };
}

export interface TestimonialsSectionData {
  title: string;
  items: Array<{
    name: string;
    role: string;
    text: string;
    rating: number;
    image?: string;
  }>;
}

export interface CTASectionData {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
}

export interface AboutSectionData {
  title: string;
  content: string;
  image?: string;
}

export interface ContactSectionData {
  title: string;
  subtitle: string;
  email: string;
  phone: string;
  address: string;
}

export interface GallerySectionData {
  title: string;
  subtitle?: string;
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: 2 | 3 | 4;
  images: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
}

export interface PricingSectionData {
  title: string;
  subtitle: string;
  currency?: string;
  billingPeriod?: string;
  plans: Array<{
    name: string;
    price: number;
    features: string[];
    highlighted?: boolean;
    buttonText?: string;
  }>;
}

export interface FAQSectionData {
  title: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export interface NavbarMenuItem {
  label: string;
  link: string;
  badge?: string;
  type?: 'link' | 'collection' | 'dropdown';
  collectionId?: string;
  collectionName?: string;
  linkType?: 'collection' | 'custom';
  dropdownItems?: Array<{
    label: string;
    link: string;
    linkType?: 'collection' | 'custom';
    collectionId?: string;
    collectionName?: string;
  }>;
}

export interface NavbarSectionData {
  logo?: string;
  logoText?: string;
  menuItems: NavbarMenuItem[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  showCart?: boolean;
  cartCount?: number;
  cartUrl?: string;
  showWishlist?: boolean;
  wishlistCount?: number;
  wishlistUrl?: string;
  showUserIcon?: boolean;
  userIconUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  sticky?: boolean;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverEffect?: string;
}

export interface FooterSectionData {
  layout?: 'classic' | 'minimal';
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  logoText?: string;
  logo?: string;
  tagline?: string;
  copyrightText?: string;
  columns?: Array<{
    title: string;
    links: Array<{
      label: string;
      link: string;
    }>;
  }>;
  // Policy links for minimal layout
  policyLinks?: Array<{
    label: string;
    link: string;
    linkType?: string;
  }>;
  socialLinks?: Array<{
    platform: string;
    icon: string;
    link: string;
  }>;
  socialIconBackgroundColor?: string;
  socialIconHoverBackgroundColor?: string;
  showNewsletter?: boolean;
  newsletterText?: string;
  newsletterPlaceholder?: string;
}

export interface StatsSectionData {
  title?: string;
  subtitle?: string;
  stats: Array<{
    value: string;
    label: string;
    prefix?: string;
    suffix?: string;
    icon?: string;
  }>;
  layout?: 'row' | 'grid';
  animated?: boolean;
}

export interface TeamSectionData {
  title: string;
  subtitle?: string;
  members: Array<{
    name: string;
    role: string;
    image?: string;
    bio?: string;
    socialLinks?: Array<{
      platform: string;
      link: string;
    }>;
  }>;
  layout?: 'grid' | 'carousel';
}

export interface ServicesSectionData {
  title: string;
  subtitle?: string;
  services: Array<{
    icon: string;
    title: string;
    description: string;
    link?: string;
    price?: string;
  }>;
  layout?: 'grid' | 'list' | 'cards';
}

export interface VideoSectionData {
  title?: string;
  subtitle?: string;
  videoUrl: string;
  videoType?: 'youtube' | 'vimeo' | 'custom';
  thumbnailUrl?: string;
  autoplay?: boolean;
  showControls?: boolean;
}

export interface CountdownSectionData {
  title: string;
  subtitle?: string;
  targetDate: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  expiredMessage?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface BannerSectionData {
  text: string;
  link?: string;
  linkText?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: string;
  dismissible?: boolean;
  position?: 'top' | 'bottom';
  enableMarquee?: boolean;
  marqueeSpeed?: number;
}

export interface PartnersSectionData {
  title?: string;
  subtitle?: string;
  partners: Array<{
    name: string;
    logo: string;
    link?: string;
  }>;
  grayscale?: boolean;
  autoScroll?: boolean;
}

export interface NewsletterSectionData {
  title: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  backgroundColor?: string;
  successMessage?: string;
}

export interface DividerSectionData {
  style?: 'line' | 'dotted' | 'dashed' | 'gradient' | 'wave' | 'zigzag';
  color?: string;
  height?: number;
  width?: string;
  spacing?: number;
}

export interface ImageComparisonSectionData {
  title?: string;
  subtitle?: string;
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  sliderPosition?: number;
  sliderColor?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

