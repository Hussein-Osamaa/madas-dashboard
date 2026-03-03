export interface Website {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  template?: string;
  customDomain?: string;
  settings: WebsiteSettings;
  content: WebsiteContent;
  seo: WebsiteSEO;
  analytics: WebsiteAnalytics;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface WebsiteSettings {
  theme: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    header: boolean;
    footer: boolean;
    sidebar: boolean;
  };
  customCSS?: string;
  customJS?: string;
}

export interface WebsiteContent {
  pages: WebsitePage[];
  navigation: NavigationItem[];
  footer?: FooterContent;
}

export interface WebsitePage {
  id: string;
  title: string;
  slug: string;
  content: PageContent;
  isHomePage: boolean;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageContent {
  blocks: ContentBlock[];
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'button' | 'form' | 'gallery' | 'custom';
  content: any;
  styles: Record<string, any>;
  order: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  order: number;
  children?: NavigationItem[];
}

export interface FooterContent {
  text?: string;
  links: FooterLink[];
  socialLinks: SocialLink[];
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface WebsiteSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  robots?: string;
}

export interface WebsiteAnalytics {
  views: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: AnalyticsPage[];
  trafficSources: TrafficSource[];
  lastUpdated: Date;
}

export interface AnalyticsPage {
  url: string;
  title: string;
  views: number;
  uniqueVisitors: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  percentage: number;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: string;
  thumbnail: string;
  isPremium: boolean;
  content: WebsiteContent;
  settings: WebsiteSettings;
  createdAt: Date;
  updatedAt: Date;
}
