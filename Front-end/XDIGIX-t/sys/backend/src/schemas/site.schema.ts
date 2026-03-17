import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISection {
  id: string;
  type: string;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
  hidden?: boolean;
  order?: number;
}

export interface ISitePageSeo {
  title?:       string;
  description?: string;
  ogImage?:     string;
  canonical?:   string;
}

export interface ISitePage {
  id: string;
  slug: string;
  name: string;
  sections: ISection[];
  order?: number;
  seo?: ISitePageSeo;
}

export interface ISiteSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    backgroundColor: string;
    textColor: string;
    fontFamily?: string;
    borderRadius?: string; // 'sharp' | 'rounded' | 'pill'
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
  announcements?: {
    enabled: boolean;
    text: string;
    link?: string;
    dismissible?: boolean;
  };
  analytics?: {
    ga4MeasurementId?: string;   // G-XXXXXXXXXX
    metaPixelId?: string;         // numeric string
    snapchatPixelId?: string;
    tiktokPixelId?: string;
    googleAdsId?: string;         // AW-XXXXXXXXXX
  };
  customDomain?: string;
  favicon?: string;
  customCss?: string;              // Merchant-added CSS (sanitised server-side)
  customJs?: string;               // Merchant-added JS  (sanitised server-side)
}

export interface ISite extends Document {
  tenantId: string;
  businessId: string;
  name: string;
  description?: string;
  status: 'draft' | 'published';
  sections: ISection[];         // legacy flat list (home page)
  pages: ISitePage[];           // multi-page support
  settings: ISiteSettings;
  url?: string;
  publicUrl?: string;
  customDomain?: string;
  publishedAt?: Date;
  unpublishedAt?: Date;
  isActive?: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    id:      { type: String, required: true },
    type:    { type: String, required: true },
    content: { type: Schema.Types.Mixed, default: {} },
    style:   { type: Schema.Types.Mixed, default: {} },
    hidden:  { type: Boolean, default: false },
    order:   { type: Number, default: 0 },
  },
  { _id: false }
);

const SitePageSeoSchema = new Schema<ISitePageSeo>(
  {
    title:       { type: String, default: '' },
    description: { type: String, default: '' },
    ogImage:     { type: String, default: '' },
    canonical:   { type: String, default: '' },
  },
  { _id: false }
);

const SitePageSchema = new Schema<ISitePage>(
  {
    id:       { type: String, required: true },
    slug:     { type: String, required: true },
    name:     { type: String, required: true },
    sections: { type: [SectionSchema], default: [] },
    order:    { type: Number, default: 0 },
    seo:      { type: SitePageSeoSchema, default: () => ({}) },
  },
  { _id: false }
);

const SiteSchema = new Schema<ISite>(
  {
    tenantId:     { type: String, required: true, index: true },
    businessId:   { type: String, required: true, index: true },
    name:         { type: String, required: true },
    description:  { type: String, default: '' },
    status:       { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    sections:     { type: [SectionSchema], default: [] },
    pages:        { type: [SitePageSchema], default: [] },
    settings: {
      theme: {
        primaryColor:   { type: String, default: '#27491F' },
        secondaryColor: { type: String, default: '#F0CAE1' },
        accentColor:    { type: String, default: '#f59e0b' },
        backgroundColor:{ type: String, default: '#FFFFFF' },
        textColor:      { type: String, default: '#171817' },
        fontFamily:     { type: String, default: 'Inter' },
        borderRadius:   { type: String, default: 'rounded' },
      },
      seo: {
        title:       { type: String, default: '' },
        description: { type: String, default: '' },
        keywords:    { type: [String], default: [] },
        ogImage:     { type: String, default: '' },
      },
      announcements: {
        enabled:     { type: Boolean, default: false },
        text:        { type: String, default: '' },
        link:        { type: String, default: '' },
        dismissible: { type: Boolean, default: true },
      },
      analytics: {
        ga4MeasurementId: { type: String, default: '' },
        metaPixelId:      { type: String, default: '' },
        snapchatPixelId:  { type: String, default: '' },
        tiktokPixelId:    { type: String, default: '' },
        googleAdsId:      { type: String, default: '' },
      },
      favicon:   { type: String, default: '' },
      customCss: { type: String, default: '' },
      customJs:  { type: String, default: '' },
    },
    url:           { type: String },
    publicUrl:     { type: String },
    customDomain:  { type: String },
    publishedAt:   { type: Date },
    unpublishedAt: { type: Date },
    isActive:      { type: Boolean, default: false },
    createdBy:     { type: String, required: true },
  },
  { timestamps: true }
);

SiteSchema.index({ tenantId: 1, businessId: 1 });
SiteSchema.index({ tenantId: 1, status: 1 });

export const Site: Model<ISite> = mongoose.model<ISite>('Site', SiteSchema);
