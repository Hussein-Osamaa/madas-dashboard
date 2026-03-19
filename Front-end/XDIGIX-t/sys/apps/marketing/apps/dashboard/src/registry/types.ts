import type { ComponentType } from 'react';
import type { Section, SectionType } from '../types/builder';
import type { ElementType } from '../types/elementEditor';
import type { FieldSchema, BlockSchema, SectionRendererProps, Action, SectionLifecycle } from '../types/engine';

/* ──────────────────────────────────────────────────────────────────────────
   EditorProps — standard interface every *Editor component must accept
────────────────────────────────────────────────────────────────────────── */
export interface EditorProps {
  section: Section;
  /** Called with the new `data` object whenever a field changes */
  onUpdate: (data: Record<string, unknown>) => void;
  onClose: () => void;
  businessId?: string;
  siteId?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   EditableElement — maps a data-edit-type DOM attribute value to an
   ElementType understood by ContextualEditor, replacing DOM class scanning.
────────────────────────────────────────────────────────────────────────── */
export interface EditableElement {
  /** Value emitted in the `data-edit-type` attribute on the DOM element */
  dataType: string;
  elementType: ElementType;
  label: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionVariant — optional layout presets shown in the section library
────────────────────────────────────────────────────────────────────────── */
export interface SectionVariant {
  variantId: string;
  label: string;
  initialData: Record<string, unknown>;
}

/* ──────────────────────────────────────────────────────────────────────────
   API Binding — describes how the storefront runtime fetches live data
────────────────────────────────────────────────────────────────────────── */
export interface ApiBinding {
  /** e.g. '/api/public/{tenantId}/products' */
  endpoint: string;
  method?: 'GET' | 'POST';
  /** Section data keys forwarded as query params when fetching */
  paramsFromData?: string[];
  /** Browser-side cache TTL in ms (0 = always live) */
  cacheTtlMs?: number;
  /** True when endpoint supports ?page=&limit= pagination */
  paginates?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
   Analytics Events — auto-wired by storefront runtime via IntersectionObserver
   Constraint 6: dedup prevents duplicate events per item per session.
────────────────────────────────────────────────────────────────────────── */
export interface AnalyticsEvents {
  /** Fired when the section enters viewport */
  onSectionView?: string;
  /** Fired per card element with [data-item-id] in viewport */
  onItemView?: string;
  /** Fired when a card element with [data-item-id] is clicked */
  onItemClick?: string;
  /** Fired when a [data-cta] button is clicked */
  onCtaClick?: string;
  /** Fired on successful form submission */
  onFormSubmit?: string;
  /** Field in item data used as unique event id (default: 'id') */
  itemIdField?: string;
  /**
   * Constraint 6 — Analytics deduplication.
   * When true, runtime tracks fired events in sessionStorage and skips
   * duplicates for the same item within a single session.
   * @default true
   */
  dedup?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionRegistryEntry — one entry per SectionType
────────────────────────────────────────────────────────────────────────── */
export interface SectionRegistryEntry {
  type: SectionType;
  label: string;
  /** material-icons glyph name */
  icon: string;
  description: string;
  category: 'Layout' | 'Content' | 'E-commerce' | 'Engagement' | 'Social Proof';

  /**
   * Declarative element map — replaces the 200-line DOM class scanner.
   * Section renderer components must add `data-edit-type="<dataType>"`
   * to each editable DOM element.
   */
  editableElements: EditableElement[];

  /** Default data for new section instances (replaces getDefaultSectionData switch) */
  defaultData: Record<string, unknown>;

  /**
   * @deprecated Use SectionEnginePanel instead. Will be removed after engine migration.
   */
  Editor: ComponentType<EditorProps>;

  /**
   * Schema-driven settings — rendered by SectionEnginePanel / SchemaForm.
   * Replaces the custom *Editor component for each section.
   */
  settings: Record<string, FieldSchema>;

  /**
   * Repeating content blocks (features[], testimonials[], etc.).
   * Empty array for sections with no repeating items (hero, video, etc.).
   */
  blocks: BlockSchema[];

  /**
   * Visual renderer component (the *Section.tsx component wrapped for SectionRendererProps).
   * Registered in src/registry/sectionRenderers.tsx.
   * Used by SectionRenderer.tsx instead of the manual switch.
   */
  Renderer?: ComponentType<SectionRendererProps>;

  actions?: Action[];

  /** Optional layout variants shown as sub-options in the section library */
  variants?: SectionVariant[];

  /**
   * Describes how the storefront runtime fetches live data for this section.
   * Undefined for purely static sections.
   */
  apiBinding?: ApiBinding;

  /**
   * Analytics events auto-wired by IntersectionObserver in the storefront runtime.
   * Keys map to GA4 / Meta Pixel event names.
   * Constraint 6: dedup flag prevents duplicate events per item per session.
   */
  analyticsEvents?: AnalyticsEvents;

  /**
   * Constraint 7 — Section Lifecycle Hooks.
   * Runtime invokes these at section mount, viewport entry, and removal.
   * Values are hook names dispatched to the storefront runtime event bus.
   */
  lifecycle?: SectionLifecycle;
}
