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