// Element types that can be selected for editing
export type ElementType = 
  | 'background'
  | 'title'
  | 'subtitle'
  | 'description'
  | 'button'
  | 'card'
  | 'image'
  | 'icon'
  | 'link'
  | 'input'
  | 'label'
  | 'price'
  | 'badge'
  | 'divider'
  | 'container'
  | 'countdown'
  | 'video'
  | 'logo'
  | 'menuItem'
  | 'socialIcon'
  | 'stat'
  | 'testimonial'
  | 'faqItem'
  | 'feature'
  | 'service'
  | 'teamMember'
  | 'product'
  | 'galleryItem'
  | 'pricingPlan'
  | 'partner';

// Selected element info
export interface SelectedElement {
  type: ElementType;
  sectionId: string;
  index?: number; // For arrays like cards, items, etc.
  subIndex?: number; // For nested arrays
  path?: string; // JSON path to the element data
}

// Element-specific editing options
export interface ElementEditingOptions {
  // Text options
  text?: {
    content?: boolean;
    fontSize?: boolean;
    fontWeight?: boolean;
    fontFamily?: boolean;
    color?: boolean;
    alignment?: boolean;
    lineHeight?: boolean;
    letterSpacing?: boolean;
    textTransform?: boolean;
    textDecoration?: boolean;
  };
  // Background options
  background?: {
    color?: boolean;
    gradient?: boolean;
    image?: boolean;
    opacity?: boolean;
    blur?: boolean;
    overlay?: boolean;
  };
  // Spacing options
  spacing?: {
    padding?: boolean;
    margin?: boolean;
    gap?: boolean;
  };
  // Border options
  border?: {
    width?: boolean;
    color?: boolean;
    radius?: boolean;
    style?: boolean;
  };
  // Shadow options
  shadow?: {
    enabled?: boolean;
    color?: boolean;
    blur?: boolean;
    spread?: boolean;
    offset?: boolean;
  };
  // Layout options
  layout?: {
    width?: boolean;
    height?: boolean;
    maxWidth?: boolean;
    display?: boolean;
    flexDirection?: boolean;
    justifyContent?: boolean;
    alignItems?: boolean;
    position?: boolean;
  };
  // Image options
  image?: {
    src?: boolean;
    alt?: boolean;
    objectFit?: boolean;
    aspectRatio?: boolean;
  };
  // Link options
  link?: {
    url?: boolean;
    target?: boolean;
  };
  // Icon options
  icon?: {
    name?: boolean;
    size?: boolean;
    color?: boolean;
  };
}

// Define what options each element type has
export const elementOptions: Record<ElementType, ElementEditingOptions> = {
  background: {
    background: { color: true, gradient: true, image: true, opacity: true, overlay: true },
    spacing: { padding: true },
  },
  title: {
    text: { content: true, fontSize: true, fontWeight: true, color: true, alignment: true, textTransform: true },
    spacing: { margin: true },
  },
  subtitle: {
    text: { content: true, fontSize: true, fontWeight: true, color: true, alignment: true },
    spacing: { margin: true },
  },
  description: {
    text: { content: true, fontSize: true, color: true, alignment: true, lineHeight: true },
    spacing: { margin: true },
  },
  button: {
    text: { content: true, fontSize: true, fontWeight: true, color: true },
    background: { color: true, gradient: true },
    border: { radius: true, width: true, color: true },
    spacing: { padding: true },
    shadow: { enabled: true },
    link: { url: true, target: true },
  },
  card: {
    background: { color: true },
    border: { radius: true, width: true, color: true },
    shadow: { enabled: true, blur: true },
    spacing: { padding: true, gap: true },
  },
  image: {
    image: { src: true, alt: true, objectFit: true, aspectRatio: true },
    border: { radius: true },
    shadow: { enabled: true },
  },
  icon: {
    icon: { name: true, size: true, color: true },
    background: { color: true },
    border: { radius: true },
  },
  link: {
    text: { content: true, fontSize: true, color: true, textDecoration: true },
    link: { url: true, target: true },
  },
  input: {
    text: { fontSize: true, color: true },
    background: { color: true },
    border: { radius: true, width: true, color: true },
    spacing: { padding: true },
  },
  label: {
    text: { content: true, fontSize: true, fontWeight: true, color: true },
  },
  price: {
    text: { content: true, fontSize: true, fontWeight: true, color: true },
  },
  badge: {
    text: { content: true, fontSize: true, color: true },
    background: { color: true },
    border: { radius: true },
    spacing: { padding: true },
  },
  divider: {
    background: { color: true },
    layout: { width: true, height: true },
    spacing: { margin: true },
  },
  container: {
    background: { color: true },
    border: { radius: true },
    spacing: { padding: true, margin: true, gap: true },
    layout: { maxWidth: true, display: true, flexDirection: true, justifyContent: true, alignItems: true },
  },
  countdown: {
    text: { fontSize: true, fontWeight: true, color: true },
    background: { color: true },
    border: { radius: true },
    spacing: { padding: true, gap: true },
  },
  video: {
    image: { src: true },
    border: { radius: true },
    shadow: { enabled: true },
    layout: { width: true, height: true },
  },
  logo: {
    image: { src: true },
    layout: { width: true, height: true },
  },
  menuItem: {
    text: { content: true, fontSize: true, color: true },
    link: { url: true },
  },
  socialIcon: {
    icon: { name: true, color: true, size: true },
    link: { url: true },
    background: { color: true },
  },
  stat: {
    text: { fontSize: true, fontWeight: true, color: true },
  },
  testimonial: {
    text: { content: true, fontSize: true, color: true },
    background: { color: true },
    border: { radius: true },
    shadow: { enabled: true },
  },
  faqItem: {
    text: { content: true, fontSize: true, color: true },
    background: { color: true },
  },
  feature: {
    text: { content: true, fontSize: true, color: true },
    icon: { name: true, color: true },
    background: { color: true },
    border: { radius: true },
  },
  service: {
    text: { content: true, fontSize: true, color: true },
    icon: { name: true, color: true },
    background: { color: true },
    border: { radius: true },
  },
  teamMember: {
    text: { content: true, fontSize: true, color: true },
    image: { src: true },
    background: { color: true },
    border: { radius: true },
  },
  product: {
    text: { fontSize: true, color: true },
    image: { objectFit: true, aspectRatio: true },
    background: { color: true },
    border: { radius: true },
    shadow: { enabled: true },
  },
  galleryItem: {
    image: { src: true, alt: true, objectFit: true },
    border: { radius: true },
  },
  pricingPlan: {
    text: { fontSize: true, color: true },
    background: { color: true },
    border: { radius: true, color: true, width: true },
    shadow: { enabled: true },
  },
  partner: {
    image: { src: true, alt: true },
    background: { color: true },
    border: { radius: true },
  },
};

// Labels for element types
export const elementLabels: Record<ElementType, string> = {
  background: 'Background',
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  button: 'Button',
  card: 'Card',
  image: 'Image',
  icon: 'Icon',
  link: 'Link',
  input: 'Input Field',
  label: 'Label',
  price: 'Price',
  badge: 'Badge',
  divider: 'Divider',
  container: 'Container',
  countdown: 'Countdown',
  video: 'Video',
  logo: 'Logo',
  menuItem: 'Menu Item',
  socialIcon: 'Social Icon',
  stat: 'Statistic',
  testimonial: 'Testimonial',
  faqItem: 'FAQ Item',
  feature: 'Feature',
  service: 'Service',
  teamMember: 'Team Member',
  product: 'Product Card',
  galleryItem: 'Gallery Item',
  pricingPlan: 'Pricing Plan',
  partner: 'Partner Logo',
};
