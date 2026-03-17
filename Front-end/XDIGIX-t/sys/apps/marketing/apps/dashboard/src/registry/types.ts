import type { ComponentType } from 'react';
import type { Section, SectionType } from '../types/builder';
import type { ElementType } from '../types/elementEditor';

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

  /** The sidebar editor component rendered when this section is selected */
  Editor: ComponentType<EditorProps>;

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
   */
  analyticsEvents?: AnalyticsEvents;
}
