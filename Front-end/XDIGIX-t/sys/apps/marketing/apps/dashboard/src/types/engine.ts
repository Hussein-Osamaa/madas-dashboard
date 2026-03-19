// src/types/engine.ts

/* ──────────────────────────────────────────────────────────────────────────
   FieldSchema — describes one editable field in a section's settings or block
──────────────────────────────────────────────────────────────────────────── */
export type FieldType =
  | 'text'          // Single-line text   → TextField
  | 'textarea'      // Multi-line text    → TextField multiline
  | 'richtext'      // HTML rich text     → RichTextEditor
  | 'color'         // Solid color picker → ColorField
  | 'color-gradient'// Color + gradient   → ColorField allowGradient
  | 'image'         // Image upload       → ImageField
  | 'url'           // URL input          → TextField (url mode)
  | 'number'        // Numeric input      → NumberField
  | 'range'         // Slider             → NumberField showSlider
  | 'select'        // Dropdown           → SelectField
  | 'toggle'        // Boolean switch     → ToggleField
  | 'date'          // Date picker        → <input type="date">
  | 'icon';         // Material icon glyph→ TextField + live preview

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FieldSchema {
  type: FieldType;
  label: string;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  /** For 'select' */
  options?: SelectOption[];
  /** For 'number' | 'range' */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;      // e.g. 'px', '%'
  /** For 'text' | 'textarea' */
  maxLength?: number;
  /** For 'image' */
  accept?: string;
  /** Show this field only when another field has a specific value */
  showWhen?: { field: string; equals: unknown };
  /** For 'color-gradient' — show gradient option */
  allowGradient?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
   BlockSchema — describes a repeating content item (testimonials, features…)
──────────────────────────────────────────────────────────────────────────── */
export interface BlockSchema {
  /** Unique type identifier, e.g. 'feature', 'testimonial', 'faq_item' */
  type: string;
  /** Display name for the block, e.g. 'Feature' */
  label: string;
  /** Used for "Add {singularLabel}" button, e.g. 'Feature' */
  singularLabel: string;
  /** material-icons glyph for the block item row icon */
  icon?: string;
  /** Key in section.data that holds the array of these blocks */
  dataKey: string;
  /** Schema for each block's fields */
  fields: Record<string, FieldSchema>;
  /** Factory for a new empty block (must match fields) */
  createDefault: () => Record<string, unknown>;
  maxItems?: number;
  minItems?: number;
}

/* ──────────────────────────────────────────────────────────────────────────
   DataBinding — how the storefront runtime fetches live data
──────────────────────────────────────────────────────────────────────────── */
export type DataBinding =
  | { type: 'static' }
  | {
      type: 'api';
      endpoint: string;
      method?: 'GET' | 'POST';
      paramsFromData?: string[];
      cacheTtlMs?: number;
      paginates?: boolean;
    };

/* ──────────────────────────────────────────────────────────────────────────
   Action — bindable interactions for buttons / interactive blocks
──────────────────────────────────────────────────────────────────────────── */
export interface Action {
  type: 'link' | 'add_to_cart' | 'open_modal' | 'submit_form' | 'scroll_to';
  label: string;
  /** Field key in section.data that stores this action's config */
  fieldBinding?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionRendererProps — standard props for all *Section.tsx renderer wrappers
──────────────────────────────────────────────────────────────────────────── */
export interface SectionRendererProps {
  data: Record<string, unknown>;
  style?: React.CSSProperties;
  siteId?: string;
  previewMode?: 'desktop' | 'tablet' | 'mobile';
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTRAINT 1 — Strict Manifest Schema
   Runtime relies ONLY on this manifest, never on DOM guessing.
   Injected as <script id="xd-manifest" type="application/json"> in published HTML.
══════════════════════════════════════════════════════════════════════════ */

/** One section entry in the published site manifest */
export interface ManifestSection {
  /** Unique section instance id (matches DOM id) */
  id: string;
  /** Registered section type — must exist in SECTION_REGISTRY */
  type: string;
  /** Data source declaration — runtime fetches from this, never infers */
  dataSource: DataBinding;
  /** Analytics events to auto-wire — runtime reads this, not DOM attrs */
  analytics: ManifestAnalytics | null;
  /** Snapshot of section data at publish time (graceful fallback) */
  initialData: Record<string, unknown>;
}

export interface ManifestAnalytics {
  onSectionView?: string;
  onItemView?: string;
  onItemClick?: string;
  onCtaClick?: string;
  onFormSubmit?: string;
  /** Field name in item data used as unique event identifier */
  itemIdField?: string;
  /** Constraint 6 — deduplication: prevent duplicate events per item per session */
  dedup: boolean;
}

/** Full site manifest embedded in published HTML */
export interface SiteManifest {
  tenantId: string;
  businessId: string;
  publicApiBase: string;
  theme: Record<string, string>;
  analytics: {
    ga4MeasurementId?: string;
    metaPixelId?: string;
    tiktokPixelId?: string;
  };
  /** Constraint 4 — cart session config */
  cart: {
    /** Primary: cookie-based session id */
    sessionStrategy: 'cookie' | 'storage';
    /** Fallback when cookies blocked */
    storageFallback: 'sessionStorage' | 'localStorage';
    sessionTtlMs: number;
  };
  sections: ManifestSection[];
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTRAINT 7 — Section Lifecycle Hooks
   Declared per section type; storefront runtime invokes them.
══════════════════════════════════════════════════════════════════════════ */
export interface SectionLifecycle {
  /** Called when section DOM is first mounted / hydrated */
  onLoad?: string;
  /** Called when section enters viewport (IntersectionObserver) */
  onVisible?: string;
  /** Called when section leaves DOM (page navigation / removal) */
  onUnload?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTRAINT 3 — Storefront Runtime Module Interfaces
   Runtime is split into three independent modules.
══════════════════════════════════════════════════════════════════════════ */
export interface RuntimeModuleConfig {
  /** core-runtime: reads manifest, fetches live data, hydrates sections */
  core: { enabled: true };
  /** analytics: auto-wires events from manifest.sections[].analytics */
  analytics: { enabled: boolean; dedupStrategy: 'session' | 'pageview' };
  /** cart: manages cart state, session tokens, add-to-cart actions */
  cart: { enabled: boolean; sessionStrategy: 'cookie' | 'storage' };
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTRAINT 5 — AI Validation Types
   Only registered section types are accepted. Raw HTML is rejected.
══════════════════════════════════════════════════════════════════════════ */
export interface AiLayoutSection {
  /** Must be a registered SectionType — validated at runtime via Zod */
  type: string;
  /** Override data merged with SECTION_DEFAULTS — no raw HTML allowed */
  data?: Record<string, unknown>;
  /** Style overrides */
  style?: Record<string, unknown>;
}

export interface AiLayout {
  theme?: {
    colorPrimary?: string;
    colorSecondary?: string;
    colorAccent?: string;
    fontHeading?: string;
    fontBody?: string;
    borderRadius?: 'sharp' | 'rounded' | 'pill';
  };
  pages: Array<{
    slug: string;
    name: string;
    sections: AiLayoutSection[];
  }>;
}