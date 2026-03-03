export interface Website {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  url?: string;
  customDomain?: string;
  status: 'draft' | 'published' | 'archived';
  template: {
    id: string;
    name: string;
    category: string;
    preview: string;
  };
  content: WebsiteContent;
  settings: WebsiteSettings;
  analytics: WebsiteAnalytics;
  seo: WebsiteSEO;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastPublishedAt?: Date;
}

export interface WebsiteContent {
  pages: WebsitePage[];
  globalStyles: GlobalStyles;
  assets: WebsiteAsset[];
  components: WebsiteComponent[];
}

export interface WebsitePage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  content: PageContent;
  isHomePage: boolean;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageContent {
  sections: PageSection[];
  layout: {
    header: boolean;
    footer: boolean;
    sidebar: boolean;
  };
}

export interface PageSection {
  id: string;
  type: string;
  props: Record<string, any>;
  styles: Record<string, any>;
  order: number;
}

export interface WebsiteComponent {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  styles: Record<string, any>;
  children?: WebsiteComponent[];
}

export interface GlobalStyles {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      base: string;
      sm: string;
      lg: string;
      xl: string;
    };
  };
  spacing: {
    section: string;
    element: string;
  };
}

export interface WebsiteAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'other';
  url: string;
  size: number;
  mimeType: string;
  alt?: string;
  uploadedAt: Date;
}

export interface WebsiteSettings {
  general: {
    language: string;
    timezone: string;
    maintenanceMode: boolean;
  };
  social: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  integrations: {
    googleAnalytics?: string;
    facebookPixel?: string;
    customCode?: string;
  };
}

export interface WebsiteAnalytics {
  views: number;
  uniqueVisitors: number;
  bounceRate: number;
  averageSessionDuration: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
  }>;
  lastUpdated: Date;
}

export interface WebsiteSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  canonicalUrl?: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  sitemap: boolean;
}

export interface CreateWebsiteRequest {
  name: string;
  description?: string;
  templateId: string;
  customDomain?: string;
}

export interface UpdateWebsiteRequest {
  name?: string;
  description?: string;
  content?: Partial<WebsiteContent>;
  settings?: Partial<WebsiteSettings>;
  seo?: Partial<WebsiteSEO>;
}

export interface PublishWebsiteRequest {
  websiteId: string;
  customDomain?: string;
  sslEnabled?: boolean;
}

export interface WebsiteStats {
  totalWebsites: number;
  publishedWebsites: number;
  draftWebsites: number;
  archivedWebsites: number;
  websitesByTemplate: Record<string, number>;
  websitesByStatus: Record<string, number>;
  totalViews: number;
  averageViewsPerWebsite: number;
}

export interface PublishingLog {
  id: string;
  websiteId: string;
  userId: string;
  action: 'publish' | 'unpublish' | 'update';
  status: 'success' | 'error' | 'pending';
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}
