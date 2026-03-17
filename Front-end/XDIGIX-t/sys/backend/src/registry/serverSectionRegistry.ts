/**
 * Server-Side Section Registry
 * ─────────────────────────────
 * Mirror of the frontend sectionRegistry.ts — contains the API binding
 * and analytics event declarations for every section type.
 *
 * Used by site-renderer.service.ts to embed the manifest JSON into the
 * published storefront HTML so the Storefront Runtime can auto-fetch live
 * data and auto-wire analytics events.
 *
 * RULE: Keep in sync with the frontend registry (sectionRegistry.ts).
 */

export type SectionType =
  | 'hero' | 'navbar' | 'footer' | 'features' | 'products' | 'deals'
  | 'collections' | 'testimonials' | 'cta' | 'about' | 'contact'
  | 'gallery' | 'pricing' | 'faq' | 'stats' | 'team' | 'services'
  | 'video' | 'countdown' | 'banner' | 'partners' | 'newsletter'
  | 'divider' | 'imageComparison';

export interface ApiBinding {
  endpoint:        string;     // e.g. '/api/public/{tenantId}/products'
  method?:         'GET' | 'POST';
  paramsFromData?: string[];   // section data keys forwarded as query params
  cacheTtlMs?:     number;     // browser-side cache TTL
  paginates?:      boolean;    // true = supports ?page=&limit=
}

export interface AnalyticsEvents {
  onSectionView?: string;   // fired when section enters viewport
  onItemView?:    string;   // fired per item card (data-item-id) in viewport
  onItemClick?:   string;   // fired on item card click
  onCtaClick?:    string;   // fired on [data-cta] button click
  onFormSubmit?:  string;   // fired on form submission
  itemIdField?:   string;   // field in item data used as event id
}

export interface SectionManifestEntry {
  type:             SectionType;
  apiBinding?:      ApiBinding;
  analyticsEvents?: AnalyticsEvents;
}

/** Full registry — every registered section type. */
export const SERVER_SECTION_REGISTRY: Record<SectionType, SectionManifestEntry> = {

  // ── Layout sections (no API, minimal analytics) ──────────────────────────
  navbar: {
    type: 'navbar',
    apiBinding: {
      endpoint:    '/api/public/{tenantId}/cart',
      method:      'GET',
      cacheTtlMs:  0,          // always live (cart count must be fresh)
    },
  },

  hero: {
    type: 'hero',
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    },
  },

  footer: { type: 'footer' },
  divider: { type: 'divider' },
  banner: {
    type: 'banner',
    analyticsEvents: { onCtaClick: 'cta_click' },
  },

  // ── E-commerce sections ───────────────────────────────────────────────────
  products: {
    type: 'products',
    apiBinding: {
      endpoint:        '/api/public/{tenantId}/products',
      paramsFromData:  ['collection', 'limit', 'sort', 'order'],
      cacheTtlMs:      60_000,
      paginates:       true,
    },
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'product_view',
      onItemClick:   'product_click',
      onCtaClick:    'add_to_cart',
      itemIdField:   'id',
    },
  },

  deals: {
    type: 'deals',
    apiBinding: {
      endpoint:        '/api/public/{tenantId}/products',
      paramsFromData:  ['limit'],
      cacheTtlMs:      60_000,
      paginates:       true,
    },
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'product_view',
      onItemClick:   'product_click',
      onCtaClick:    'add_to_cart',
      itemIdField:   'id',
    },
  },

  collections: {
    type: 'collections',
    apiBinding: {
      endpoint:    '/api/public/{tenantId}/collections',
      cacheTtlMs:  120_000,
    },
    analyticsEvents: {
      onSectionView: 'section_view',
      onItemView:    'collection_view',
      onItemClick:   'collection_click',
      itemIdField:   'id',
    },
  },

  // ── Content sections ──────────────────────────────────────────────────────
  cta: {
    type: 'cta',
    analyticsEvents: {
      onSectionView: 'section_view',
      onCtaClick:    'cta_click',
    },
  },

  newsletter: {
    type: 'newsletter',
    apiBinding: {
      endpoint: '/api/public/{tenantId}/newsletter/subscribe',
      method:   'POST',
    },
    analyticsEvents: {
      onFormSubmit: 'newsletter_subscribe',
    },
  },

  contact: {
    type: 'contact',
    apiBinding: {
      endpoint: '/api/public/{tenantId}/contact',
      method:   'POST',
    },
    analyticsEvents: {
      onFormSubmit: 'contact_submit',
    },
  },

  // ── Static / informational sections ──────────────────────────────────────
  features: {
    type: 'features',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  testimonials: {
    type: 'testimonials',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  about: {
    type: 'about',
    analyticsEvents: { onSectionView: 'section_view', onCtaClick: 'cta_click' },
  },
  gallery: {
    type: 'gallery',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  pricing: {
    type: 'pricing',
    analyticsEvents: { onSectionView: 'section_view', onCtaClick: 'cta_click' },
  },
  faq: {
    type: 'faq',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  stats: {
    type: 'stats',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  team: {
    type: 'team',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  services: {
    type: 'services',
    analyticsEvents: { onSectionView: 'section_view', onCtaClick: 'cta_click' },
  },
  video: {
    type: 'video',
    analyticsEvents: { onSectionView: 'section_view', onCtaClick: 'video_play' },
  },
  countdown: {
    type: 'countdown',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  partners: {
    type: 'partners',
    analyticsEvents: { onSectionView: 'section_view' },
  },
  imageComparison: {
    type: 'imageComparison',
    analyticsEvents: { onSectionView: 'section_view' },
  },
};

/**
 * Build the per-section manifest entries for the rendered HTML.
 * Returns null for section types not in the registry.
 */
export function buildSectionManifestEntry(
  sectionId:   string,
  sectionType: string,
): SectionManifestEntry & { id: string } | null {
  const entry = SERVER_SECTION_REGISTRY[sectionType as SectionType];
  if (!entry) return null;
  return { id: sectionId, ...entry };
}
