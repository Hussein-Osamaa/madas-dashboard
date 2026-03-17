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
}
