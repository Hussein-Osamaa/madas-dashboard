# Section Engine Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 24 custom `*Editor.tsx` components and `SectionRenderer.tsx`'s manual switch with a single schema-driven `SectionEngine` — every section declares its `settings: Record<string, FieldSchema>` and `blocks: BlockSchema[]`; a generic `SectionEnginePanel` renders the editor from that schema; a `sectionRenderers` map drives `SectionRenderer.tsx`.

**Architecture:** Three layers: (1) **Types** — `src/types/engine.ts` defines `FieldSchema`, `BlockSchema`, `DataBinding`, `Action`; (2) **Engine UI** — `src/components/builder/engine/` contains `SchemaFormField`, `SchemaForm`, `BlockEditor`, `BlockListEditor`, `SectionEnginePanel`; (3) **Registry** — `src/registry/sectionRegistry.ts` adds `settings` and `blocks` to all 24 entries and drops `Editor`; `src/registry/sectionRenderers.tsx` maps types → visual renderer components, replacing `SectionRenderer.tsx`'s switch. All existing visual section renderers (`HeroSection.tsx` etc.) are kept unchanged. All existing shared editor primitives (`TextField`, `ColorField`, etc.) are reused.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, existing shared primitives (TextField/ColorField/ImageField/SelectField/ToggleField/NumberField/ArrayEditor/StylePanel), @dnd-kit (already installed)

> **CWD for all commands:** `/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/apps/marketing/apps/dashboard`

---

## File Map

### Files to CREATE

| File | Responsibility |
|---|---|
| `src/types/engine.ts` | `FieldSchema`, `BlockSchema`, `DataBinding`, `Action`, `SectionRendererProps` |
| `src/components/builder/engine/SchemaFormField.tsx` | Routes one `FieldSchema` to the correct shared primitive |
| `src/components/builder/engine/SchemaForm.tsx` | Renders all section-level settings from `Record<string, FieldSchema>` |
| `src/components/builder/engine/BlockEditor.tsx` | Renders editable fields for one block instance |
| `src/components/builder/engine/BlockListEditor.tsx` | Add / remove / reorder blocks, renders `BlockEditor` per item |
| `src/components/builder/engine/SectionEnginePanel.tsx` | Top-level editor: `SchemaForm` + `BlockListEditor` + `StylePanel` |
| `src/registry/sectionRenderers.tsx` | `SECTION_RENDERERS` map: `SectionType` → visual renderer wrapper |

### Files to MODIFY

| File | Change |
|---|---|
| `src/registry/types.ts` | Add `settings`, `blocks` to `SectionRegistryEntry`; mark `Editor` `@deprecated` |
| `src/registry/sectionRegistry.ts` | Add `settings` + `blocks` to all 24 entries; remove `Editor` imports/fields |
| `src/components/builder/SectionEditor.tsx` | Use `SectionEnginePanel` instead of lazy `entry.Editor` |
| `src/components/builder/SectionRenderer.tsx` | Replace 24-case switch with `SECTION_RENDERERS[type]` lookup |
| `src/components/builder/BuilderLeftPanel.tsx` | Wire block-level nav: block settings view uses `BlockEditor` |

### Files to DELETE (after registry migration is complete)

All 24 custom editors — confirmed deleted only in Task 15 after TypeScript confirms zero breakage:

`src/components/builder/editors/HeroEditor.tsx`,
`NavbarEditor.tsx`, `FeaturesEditor.tsx`, `ProductsEditor.tsx`,
`DealsEditor.tsx`, `CollectionsEditor.tsx`, `TestimonialsEditor.tsx`,
`CTAEditor.tsx`, `AboutEditor.tsx`, `ContactEditor.tsx`,
`GalleryEditor.tsx`, `PricingEditor.tsx`, `FAQEditor.tsx`,
`FooterEditor.tsx`, `StatsEditor.tsx`, `TeamEditor.tsx`,
`ServicesEditor.tsx`, `VideoEditor.tsx`, `CountdownEditor.tsx`,
`BannerEditor.tsx`, `PartnersEditor.tsx`, `NewsletterEditor.tsx`,
`DividerEditor.tsx`, `ImageComparisonEditor.tsx`

### Files to KEEP UNCHANGED

- All 24 `src/components/builder/sections/*Section.tsx` — visual renderers
- `src/components/builder/editors/shared/TextField.tsx` — reused by engine
- `src/components/builder/editors/shared/ColorField.tsx` — reused
- `src/components/builder/editors/shared/ImageField.tsx` — reused
- `src/components/builder/editors/shared/SelectField.tsx` — reused
- `src/components/builder/editors/shared/ToggleField.tsx` — reused
- `src/components/builder/editors/shared/NumberField.tsx` — reused
- `src/components/builder/editors/shared/ArrayEditor.tsx` — reused by `BlockListEditor`
- `src/components/builder/editors/shared/StylePanel.tsx` — reused by `SectionEnginePanel`
- All `src/types/builder.ts`, `src/types/elementEditor.ts` — unchanged
- `src/components/builder/sections/sectionDefaults.ts` — unchanged (render-time data fallback)

---

## Task 1: Create `src/types/engine.ts`

**Files:**
- Create: `src/types/engine.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Verify compile**
```bash
npx tsc --noEmit 2>&1 | grep "engine.ts"
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/types/engine.ts
git commit -m "feat(engine): add engine type system — FieldSchema, BlockSchema, DataBinding, Action"
```

---

## Task 2: Extend `registry/types.ts` — add engine fields

**Files:**
- Modify: `src/registry/types.ts`

- [ ] **Step 1: Read the current file**

The current `SectionRegistryEntry` has: `type`, `label`, `icon`, `description`, `category`, `editableElements`, `defaultData`, `Editor`, `variants`, `apiBinding`, `analyticsEvents`.

- [ ] **Step 2: Edit the file — add `settings`, `blocks`; mark `Editor` deprecated**

Add import at the top:
```typescript
import type { FieldSchema, BlockSchema, SectionRendererProps } from '../types/engine';
import type { ComponentType } from 'react';
```

Replace the existing `SectionRegistryEntry` interface with:
```typescript
export interface SectionRegistryEntry {
  type: SectionType;
  label: string;
  /** material-icons glyph name */
  icon: string;
  description: string;
  category: 'Layout' | 'Content' | 'E-commerce' | 'Engagement' | 'Social Proof';

  /** Declarative element map for canvas hover/click detection */
  editableElements: EditableElement[];

  /** Default data for new section instances */
  defaultData: Record<string, unknown>;

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
  Renderer: ComponentType<SectionRendererProps>;

  /** Optional layout variants shown in the section library */
  variants?: SectionVariant[];

  /**
   * @deprecated Use dataBinding instead. Kept for runtime backward compat.
   */
  apiBinding?: ApiBinding;

  analyticsEvents?: AnalyticsEvents;

  actions?: import('../types/engine').Action[];
}
```

- [ ] **Step 3: TypeScript check — expect errors (sectionRegistry.ts hasn't been updated yet)**
```bash
npx tsc --noEmit 2>&1 | grep "registry" | head -20
```
Expected: errors about `settings`, `blocks`, `Renderer` missing from existing entries. This is expected — they'll be resolved in Tasks 6–11.

- [ ] **Step 4: Commit**
```bash
git add src/registry/types.ts
git commit -m "feat(engine): extend SectionRegistryEntry with settings, blocks, Renderer fields"
```

---

## Task 3: Create `SchemaFormField.tsx` and `SchemaForm.tsx`

**Files:**
- Create: `src/components/builder/engine/SchemaFormField.tsx`
- Create: `src/components/builder/engine/SchemaForm.tsx`

These are the engine's form rendering primitives. They route each `FieldSchema` to the correct existing shared primitive.

- [ ] **Step 1: Create `SchemaFormField.tsx`**

```tsx
// src/components/builder/engine/SchemaFormField.tsx
import React from 'react';
import type { FieldSchema } from '../../../types/engine';
import TextField from '../editors/shared/TextField';
import ColorField from '../editors/shared/ColorField';
import ImageField from '../editors/shared/ImageField';
import SelectField from '../editors/shared/SelectField';
import ToggleField from '../editors/shared/ToggleField';
import NumberField from '../editors/shared/NumberField';

interface Props {
  fieldKey: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  /** All field values in the current form — used for showWhen evaluation */
  allValues: Record<string, unknown>;
  /** Context for image uploads */
  siteId?: string;
  businessId?: string;
}

const SchemaFormField: React.FC<Props> = ({
  fieldKey,
  schema,
  value,
  onChange,
  allValues,
  siteId,
  businessId,
}) => {
  // Conditional display
  if (schema.showWhen) {
    const watchValue = allValues[schema.showWhen.field];
    if (watchValue !== schema.showWhen.equals) return null;
  }

  const strVal = (value ?? schema.defaultValue ?? '') as string;
  const numVal = (value ?? schema.defaultValue ?? 0) as number;
  const boolVal = (value ?? schema.defaultValue ?? false) as boolean;

  switch (schema.type) {
    case 'text':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
        />
      );

    case 'textarea':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
          multiline
          rows={3}
        />
      );

    case 'url':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          placeholder={schema.placeholder ?? 'https://'}
          helperText={schema.helpText}
        />
      );

    case 'icon':
      return (
        <div className="space-y-1">
          <TextField
            label={schema.label}
            value={strVal}
            onChange={onChange}
            placeholder={schema.placeholder ?? 'material-icons name'}
            helperText={schema.helpText}
          />
          {strVal && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="material-icons text-gray-600 text-lg">{strVal}</span>
              <span className="text-xs text-gray-500">{strVal}</span>
            </div>
          )}
        </div>
      );

    case 'richtext':
      // Fall back to textarea — RichTextEditor can be wired here if needed
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          placeholder={schema.placeholder}
          multiline
          rows={4}
          helperText={schema.helpText}
        />
      );

    case 'color':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={onChange}
        />
      );

    case 'color-gradient':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          allowGradient
        />
      );

    case 'image':
      return (
        <ImageField
          label={schema.label}
          value={strVal}
          onChange={onChange}
          accept={schema.accept}
        />
      );

    case 'number':
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={onChange}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          unit={schema.unit}
          helperText={schema.helpText}
        />
      );

    case 'range':
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={onChange}
          min={schema.min ?? 0}
          max={schema.max ?? 100}
          step={schema.step ?? 1}
          unit={schema.unit}
          showSlider
          helperText={schema.helpText}
        />
      );

    case 'select':
      return (
        <SelectField
          label={schema.label}
          value={String(value ?? schema.defaultValue ?? '')}
          onChange={onChange}
          options={(schema.options ?? []).map(o => ({ value: String(o.value), label: o.label }))}
          helperText={schema.helpText}
        />
      );

    case 'toggle':
      return (
        <ToggleField
          label={schema.label}
          value={boolVal}
          onChange={onChange}
          helperText={schema.helpText}
        />
      );

    case 'date':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{schema.label}</label>
          <input
            type="date"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {schema.helpText && <p className="text-xs text-gray-400">{schema.helpText}</p>}
        </div>
      );

    default:
      return (
        <div className="text-xs text-red-400 p-2 bg-red-50 rounded">
          Unknown field type: {(schema as { type: string }).type} ({fieldKey})
        </div>
      );
  }
};

export default React.memo(SchemaFormField);
```

- [ ] **Step 2: Create `SchemaForm.tsx`**

```tsx
// src/components/builder/engine/SchemaForm.tsx
import React from 'react';
import type { FieldSchema } from '../../../types/engine';
import SchemaFormField from './SchemaFormField';

interface Props {
  /** Section-level settings schema */
  settings: Record<string, FieldSchema>;
  /** Current section.data values */
  data: Record<string, unknown>;
  /** Called whenever a field changes — passes the full updated data object */
  onChange: (data: Record<string, unknown>) => void;
  siteId?: string;
  businessId?: string;
}

const SchemaForm: React.FC<Props> = ({ settings, data, onChange, siteId, businessId }) => {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  const entries = Object.entries(settings);
  if (entries.length === 0) return null;

  return (
    <div className="p-4 space-y-4">
      {entries.map(([key, schema]) => (
        <SchemaFormField
          key={key}
          fieldKey={key}
          schema={schema}
          value={data[key]}
          onChange={(v) => handleFieldChange(key, v)}
          allValues={data}
          siteId={siteId}
          businessId={businessId}
        />
      ))}
    </div>
  );
};

export default React.memo(SchemaForm);
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "engine/" | head -20
```
Expected: only errors about the registry (not yet updated) — not errors in the engine files themselves.

- [ ] **Step 4: Commit**
```bash
git add src/components/builder/engine/
git commit -m "feat(engine): add SchemaFormField and SchemaForm — schema-driven field rendering"
```

---

## Task 4: Create `BlockEditor.tsx` and `BlockListEditor.tsx`

**Files:**
- Create: `src/components/builder/engine/BlockEditor.tsx`
- Create: `src/components/builder/engine/BlockListEditor.tsx`

- [ ] **Step 1: Create `BlockEditor.tsx`**

Renders all fields for one block instance using `SchemaFormField`:

```tsx
// src/components/builder/engine/BlockEditor.tsx
import React from 'react';
import type { BlockSchema } from '../../../types/engine';
import SchemaFormField from './SchemaFormField';

interface Props {
  schema: BlockSchema;
  /** Current block data */
  data: Record<string, unknown>;
  /** Called with full updated block data */
  onChange: (data: Record<string, unknown>) => void;
  siteId?: string;
  businessId?: string;
}

const BlockEditor: React.FC<Props> = ({ schema, data, onChange, siteId, businessId }) => {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-3">
      {Object.entries(schema.fields).map(([key, fieldSchema]) => (
        <SchemaFormField
          key={key}
          fieldKey={key}
          schema={fieldSchema}
          value={data[key]}
          onChange={(v) => handleFieldChange(key, v)}
          allValues={data}
          siteId={siteId}
          businessId={businessId}
        />
      ))}
    </div>
  );
};

export default React.memo(BlockEditor);
```

- [ ] **Step 2: Create `BlockListEditor.tsx`**

Uses `ArrayEditor` for add/remove/reorder, renders `BlockEditor` for each item's expanded form:

```tsx
// src/components/builder/engine/BlockListEditor.tsx
import React from 'react';
import type { BlockSchema } from '../../../types/engine';
import BlockEditor from './BlockEditor';
import ArrayEditor from '../editors/shared/ArrayEditor';

interface Props {
  schema: BlockSchema;
  /** Current array of block items from section.data[schema.dataKey] */
  items: Record<string, unknown>[];
  /** Called with the full updated items array */
  onChange: (items: Record<string, unknown>[]) => void;
  siteId?: string;
  businessId?: string;
}

const BlockListEditor: React.FC<Props> = ({ schema, items, onChange, siteId, businessId }) => {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        {schema.label}s
      </p>
      <ArrayEditor
        label={schema.label}
        items={items}
        onChange={onChange}
        createDefault={schema.createDefault}
        addLabel={`Add ${schema.singularLabel}`}
        maxItems={schema.maxItems}
        renderItem={(item, _index, onItemChange) => (
          <BlockEditor
            schema={schema}
            data={item}
            onChange={onItemChange}
            siteId={siteId}
            businessId={businessId}
          />
        )}
      />
    </div>
  );
};

export default React.memo(BlockListEditor);
```

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "BlockEditor\|BlockListEditor" | head -10
```
Expected: no errors in these new files.

- [ ] **Step 4: Commit**
```bash
git add src/components/builder/engine/BlockEditor.tsx src/components/builder/engine/BlockListEditor.tsx
git commit -m "feat(engine): add BlockEditor and BlockListEditor — schema-driven block editing"
```

---

## Task 5: Create `SectionEnginePanel.tsx`

**Files:**
- Create: `src/components/builder/engine/SectionEnginePanel.tsx`

This replaces every `*Editor.tsx`. It reads the section's `settings` and `blocks` from the registry and renders them via `SchemaForm` + `BlockListEditor`.

- [ ] **Step 1: Create `SectionEnginePanel.tsx`**

```tsx
// src/components/builder/engine/SectionEnginePanel.tsx
import React, { Suspense } from 'react';
import type { Section } from '../../../types/builder';
import { SECTION_REGISTRY } from '../../../registry/sectionRegistry';
import type { SectionType } from '../../../types/builder';
import SchemaForm from './SchemaForm';
import BlockListEditor from './BlockListEditor';
import StylePanel from '../editors/shared/StylePanel';

interface Props {
  section: Section;
  onUpdate: (data: Record<string, unknown>) => void;
  onClose?: () => void;
  businessId?: string;
  siteId?: string;
  /** When embedded in BuilderLeftPanel, suppress the outer wrapper padding */
  embedded?: boolean;
  /** Which tab to show ('content' | 'style') — driven by BuilderLeftPanel */
  activeTabOverride?: 'content' | 'style' | 'analytics';
}

const SectionEnginePanel: React.FC<Props> = ({
  section,
  onUpdate,
  businessId,
  siteId,
  embedded,
  activeTabOverride,
}) => {
  const entry = SECTION_REGISTRY[section.type as SectionType];

  if (!entry) {
    return (
      <div className="p-4 text-sm text-red-500">
        No engine schema registered for section type: {section.type}
      </div>
    );
  }

  const { settings, blocks } = entry;
  const activeTab = activeTabOverride ?? 'content';

  // Only show settings/blocks on 'content' tab
  // 'style' tab handled by StylePanel below
  const hasSettings = Object.keys(settings).length > 0;
  const hasBlocks = blocks && blocks.length > 0;

  // If no activeTabOverride (standalone use), show everything
  const showSettings = activeTab !== 'style';
  const showBlocks = activeTab !== 'style';
  const showStyle = !embedded || activeTab === 'style';

  if (!hasSettings && !hasBlocks) {
    return (
      <div className="p-4 text-sm text-gray-400 text-center">
        No configurable settings for this section.
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'divide-y divide-gray-100'}>
      {showSettings && hasSettings && (
        <SchemaForm
          settings={settings}
          data={section.data}
          onChange={onUpdate}
          siteId={siteId}
          businessId={businessId}
        />
      )}

      {showBlocks && hasBlocks && blocks.map((blockSchema) => (
        <BlockListEditor
          key={blockSchema.type}
          schema={blockSchema}
          items={(section.data[blockSchema.dataKey] as Record<string, unknown>[]) ?? []}
          onChange={(items) => onUpdate({ ...section.data, [blockSchema.dataKey]: items })}
          siteId={siteId}
          businessId={businessId}
        />
      ))}

      {showStyle && (
        <StylePanel section={section} onUpdate={onUpdate} />
      )}
    </div>
  );
};

export default React.memo(SectionEnginePanel);
```

- [ ] **Step 2: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "SectionEnginePanel" | head -10
```
Expected: errors about `settings`/`blocks` not existing on registry entries yet (Tasks 6–10 fix this). No syntax errors in the file itself.

- [ ] **Step 3: Commit**
```bash
git add src/components/builder/engine/SectionEnginePanel.tsx
git commit -m "feat(engine): add SectionEnginePanel — generic schema-driven section editor"
```

---

## Task 6: Add schemas to registry — Layout sections (navbar, hero, footer)

**Files:**
- Modify: `src/registry/sectionRegistry.ts`

This task adds `settings`, `blocks`, and `Renderer: null as unknown as ComponentType<SectionRendererProps>` as placeholders to the three Layout sections. `Renderer` will be set properly in Task 11 (sectionRenderers.tsx), but we need the field present for TypeScript.

**Actually:** Do NOT use a placeholder. Instead:
1. First read the current `sectionRegistry.ts` in full
2. Add the `settings` and `blocks` fields to `navbar`, `hero`, `footer` entries
3. Add `Renderer: null as unknown as import('../types/engine').SectionRendererProps` temporarily
4. The real `Renderer` will come from Task 11

Wait — a simpler approach: make `Renderer` optional in `SectionRegistryEntry` for now:
`Renderer?: ComponentType<SectionRendererProps>;`

Then in Task 11, set all 24 Renderers and remove the `?`.

- [ ] **Step 1: Make `Renderer` optional temporarily**

In `src/registry/types.ts`, change:
```typescript
Renderer: ComponentType<SectionRendererProps>;
```
to:
```typescript
/** Set in sectionRenderers.tsx — populated in registry migration Task 11 */
Renderer?: ComponentType<SectionRendererProps>;
```

- [ ] **Step 2: Read the current `sectionRegistry.ts` in full**
```bash
cat src/registry/sectionRegistry.ts
```

- [ ] **Step 3: Add `settings` and `blocks` to the `hero` entry**

The `hero` entry currently has: `type`, `label`, `icon`, `description`, `category`, `editableElements`, `defaultData`, `Editor`, `variants`, `analyticsEvents`.

Add after `defaultData` (keep `Editor` for now — it will be removed in Task 14):

```typescript
settings: {
  layout: {
    type: 'select',
    label: 'Layout',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'minimal', label: 'Minimal (text only)' },
    ],
    defaultValue: 'default',
  },
  title: {
    type: 'text',
    label: 'Headline',
    placeholder: 'Welcome to Our Store',
    maxLength: 100,
  },
  subtitle: {
    type: 'textarea',
    label: 'Subheading',
    placeholder: 'Discover amazing products and services',
    maxLength: 200,
  },
  buttonText: { type: 'text', label: 'Primary Button Text', placeholder: 'Shop Now' },
  buttonLink: { type: 'url', label: 'Primary Button Link', placeholder: 'https://' },
  secondaryButtonText: { type: 'text', label: 'Secondary Button Text', placeholder: '' },
  secondaryButtonLink: { type: 'url', label: 'Secondary Button Link', placeholder: 'https://' },
  backgroundColor: { type: 'color-gradient', label: 'Background Color' },
  backgroundImage: { type: 'image', label: 'Background Image' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#FFFFFF' },
  textAlignment: {
    type: 'select',
    label: 'Text Alignment',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    defaultValue: 'center',
  },
  height: {
    type: 'select',
    label: 'Section Height',
    options: [
      { value: 'full', label: 'Full viewport' },
      { value: 'large', label: 'Large (80vh)' },
      { value: 'medium', label: 'Medium (60vh)' },
      { value: 'small', label: 'Small (40vh)' },
    ],
    defaultValue: 'large',
  },
  isCarousel: {
    type: 'toggle',
    label: 'Carousel Mode',
    helpText: 'Show multiple slides with navigation',
    defaultValue: false,
  },
  overlayEnabled: {
    type: 'toggle',
    label: 'Overlay',
    helpText: 'Darken background image for better text contrast',
    defaultValue: false,
  },
  overlayColor: {
    type: 'color',
    label: 'Overlay Color',
    defaultValue: 'rgba(0,0,0,0.4)',
    showWhen: { field: 'overlayEnabled', equals: true },
  },
},
blocks: [],
```

- [ ] **Step 4: Add `settings` and `blocks` to the `navbar` entry**

```typescript
settings: {
  logoText: { type: 'text', label: 'Logo Text', placeholder: 'My Store' },
  logoImage: { type: 'image', label: 'Logo Image' },
  logoUrl: { type: 'url', label: 'Logo Link', placeholder: '/', defaultValue: '/' },
  sticky: { type: 'toggle', label: 'Sticky Navigation', helpText: 'Fix navbar to top of screen when scrolling', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
  textColor: { type: 'color', label: 'Text / Link Color', defaultValue: '#1a1a1a' },
  ctaText: { type: 'text', label: 'CTA Button Text', placeholder: 'Shop Now' },
  ctaLink: { type: 'url', label: 'CTA Button Link', placeholder: '#products' },
  showSearch: { type: 'toggle', label: 'Show Search', defaultValue: true },
  showCart: { type: 'toggle', label: 'Show Cart Icon', defaultValue: true },
},
blocks: [
  {
    type: 'menu_item',
    label: 'Menu Items',
    singularLabel: 'Menu Item',
    icon: 'link',
    dataKey: 'menuItems',
    fields: {
      label: { type: 'text', label: 'Label', placeholder: 'Home' },
      url: { type: 'url', label: 'URL', placeholder: '/' },
      isExternal: { type: 'toggle', label: 'Open in new tab', defaultValue: false },
    },
    createDefault: () => ({ label: 'New Link', url: '/', isExternal: false }),
    maxItems: 10,
  },
],
```

- [ ] **Step 5: Add `settings` and `blocks` to the `footer` entry**

```typescript
settings: {
  companyName: { type: 'text', label: 'Company Name', placeholder: 'My Store' },
  companyLogo: { type: 'image', label: 'Company Logo' },
  tagline: { type: 'textarea', label: 'Tagline / About', placeholder: 'Your trusted store', maxLength: 200 },
  copyright: { type: 'text', label: 'Copyright Text', placeholder: '© 2025 My Store. All rights reserved.' },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#1a1a1a' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
  showSocial: { type: 'toggle', label: 'Show Social Links', defaultValue: true },
  facebookUrl: { type: 'url', label: 'Facebook URL', showWhen: { field: 'showSocial', equals: true } },
  instagramUrl: { type: 'url', label: 'Instagram URL', showWhen: { field: 'showSocial', equals: true } },
  twitterUrl: { type: 'url', label: 'Twitter / X URL', showWhen: { field: 'showSocial', equals: true } },
  linkedinUrl: { type: 'url', label: 'LinkedIn URL', showWhen: { field: 'showSocial', equals: true } },
  youtubeUrl: { type: 'url', label: 'YouTube URL', showWhen: { field: 'showSocial', equals: true } },
},
blocks: [
  {
    type: 'footer_link',
    label: 'Quick Links',
    singularLabel: 'Link',
    icon: 'link',
    dataKey: 'links',
    fields: {
      label: { type: 'text', label: 'Label', placeholder: 'Privacy Policy' },
      url: { type: 'url', label: 'URL', placeholder: '/privacy' },
    },
    createDefault: () => ({ label: 'New Link', url: '/' }),
    maxItems: 20,
  },
],
```

- [ ] **Step 6: TypeScript check — expect only errors about the remaining 21 sections**
```bash
npx tsc --noEmit 2>&1 | grep "sectionRegistry" | head -20
```

- [ ] **Step 7: Commit**
```bash
git add src/registry/sectionRegistry.ts src/registry/types.ts
git commit -m "feat(engine): add settings/blocks schema to Layout sections (hero, navbar, footer)"
```

---

## Task 7: Add schemas — Content sections (features, about, contact, gallery, video, stats, team, divider, imageComparison)

**Files:**
- Modify: `src/registry/sectionRegistry.ts`

For each section, read the corresponding `*Editor.tsx` to understand current fields, then write the schema. Below are the complete schemas for all 9 Content sections.

- [ ] **Step 1: Add `settings` and `blocks` to `features`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Why Choose Us' },
  subtitle: { type: 'textarea', label: 'Section Subtitle', placeholder: 'Explore our key advantages' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '3',
  },
},
blocks: [
  {
    type: 'feature',
    label: 'Feature Cards',
    singularLabel: 'Feature',
    icon: 'star',
    dataKey: 'items',
    fields: {
      icon: { type: 'icon', label: 'Icon', placeholder: 'star', helpText: 'Material Icons name or emoji' },
      title: { type: 'text', label: 'Title', placeholder: 'Fast Delivery' },
      description: { type: 'textarea', label: 'Description', placeholder: 'Describe this feature' },
      link: { type: 'url', label: 'Link URL (optional)' },
      linkText: { type: 'text', label: 'Link Text (optional)', placeholder: 'Learn more' },
    },
    createDefault: () => ({ icon: 'star', title: 'New Feature', description: 'Feature description', link: '', linkText: '' }),
    maxItems: 12,
  },
],
```

- [ ] **Step 2: Add `settings` and `blocks` to `about`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'About Us' },
  subtitle: { type: 'text', label: 'Subtitle', placeholder: 'Our story' },
  content: { type: 'richtext', label: 'Content', placeholder: 'Tell your story here...' },
  image: { type: 'image', label: 'Main Image' },
  imagePosition: {
    type: 'select',
    label: 'Image Position',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
    ],
    defaultValue: 'right',
  },
  buttonText: { type: 'text', label: 'CTA Button Text', placeholder: 'Learn More' },
  buttonLink: { type: 'url', label: 'CTA Button Link', placeholder: 'https://' },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
},
blocks: [],
```

- [ ] **Step 3: Add `settings` and `blocks` to `contact`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'Get In Touch' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: "We'd love to hear from you" },
  submitButtonText: { type: 'text', label: 'Submit Button Text', placeholder: 'Send Message', defaultValue: 'Send Message' },
  successMessage: { type: 'text', label: 'Success Message', placeholder: "Thanks! We'll be in touch soon.", defaultValue: "Thanks! We'll be in touch soon." },
  showEmail: { type: 'toggle', label: 'Show Email Field', defaultValue: true },
  showPhone: { type: 'toggle', label: 'Show Phone Field', defaultValue: false },
  showMessage: { type: 'toggle', label: 'Show Message Field', defaultValue: true },
  email: { type: 'text', label: 'Your Email Address', placeholder: 'hello@mystore.com' },
  phone: { type: 'text', label: 'Your Phone Number', placeholder: '+1 (555) 000-0000' },
  address: { type: 'textarea', label: 'Address', placeholder: '123 Main St, City, Country' },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f9fafb' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
},
blocks: [],
```

- [ ] **Step 4: Add `settings` and `blocks` to `gallery`**

```typescript
settings: {
  title: { type: 'text', label: 'Gallery Title', placeholder: 'Our Gallery' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collection' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '3',
  },
  aspectRatio: {
    type: 'select',
    label: 'Aspect Ratio',
    options: [
      { value: 'square', label: 'Square (1:1)' },
      { value: 'landscape', label: 'Landscape (16:9)' },
      { value: 'portrait', label: 'Portrait (3:4)' },
    ],
    defaultValue: 'square',
  },
  enableLightbox: { type: 'toggle', label: 'Enable Lightbox', helpText: 'Click images to view full size', defaultValue: true },
},
blocks: [
  {
    type: 'gallery_item',
    label: 'Gallery Images',
    singularLabel: 'Image',
    icon: 'image',
    dataKey: 'images',
    fields: {
      image: { type: 'image', label: 'Image', required: true },
      caption: { type: 'text', label: 'Caption', placeholder: 'Image caption' },
      altText: { type: 'text', label: 'Alt Text', placeholder: 'Describe the image', helpText: 'For accessibility and SEO' },
      link: { type: 'url', label: 'Link URL (optional)' },
    },
    createDefault: () => ({ image: '', caption: '', altText: '', link: '' }),
    maxItems: 24,
  },
],
```

- [ ] **Step 5: Add `settings` and `blocks` to `video`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'Watch Our Story' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Learn more about us' },
  videoUrl: { type: 'url', label: 'Video URL', placeholder: 'https://youtube.com/watch?v=...', helpText: 'YouTube, Vimeo, or direct MP4 URL' },
  poster: { type: 'image', label: 'Poster Image (thumbnail)' },
  aspectRatio: {
    type: 'select',
    label: 'Aspect Ratio',
    options: [
      { value: '16:9', label: 'Widescreen (16:9)' },
      { value: '4:3', label: 'Standard (4:3)' },
      { value: '1:1', label: 'Square (1:1)' },
    ],
    defaultValue: '16:9',
  },
  autoplay: { type: 'toggle', label: 'Autoplay', helpText: 'Requires muted to be enabled', defaultValue: false },
  muted: { type: 'toggle', label: 'Muted', defaultValue: false },
  loop: { type: 'toggle', label: 'Loop', defaultValue: false },
  controls: { type: 'toggle', label: 'Show Controls', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#000000' },
},
blocks: [],
```

- [ ] **Step 6: Add `settings` and `blocks` to `stats`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Our Numbers' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'The results speak for themselves' },
  layout: {
    type: 'select',
    label: 'Layout',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'row', label: 'Single Row' },
    ],
    defaultValue: 'grid',
  },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f0fdf4' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
},
blocks: [
  {
    type: 'stat',
    label: 'Stats',
    singularLabel: 'Stat',
    icon: 'bar_chart',
    dataKey: 'stats',
    fields: {
      value: { type: 'text', label: 'Value', placeholder: '10,000+', helpText: 'The big number or metric' },
      label: { type: 'text', label: 'Label', placeholder: 'Happy Customers' },
      icon: { type: 'icon', label: 'Icon (optional)', placeholder: 'people' },
      prefix: { type: 'text', label: 'Prefix (optional)', placeholder: '$', helpText: 'e.g. $ or #' },
      suffix: { type: 'text', label: 'Suffix (optional)', placeholder: '+', helpText: 'e.g. + or %' },
    },
    createDefault: () => ({ value: '0', label: 'New Stat', icon: '', prefix: '', suffix: '' }),
    maxItems: 8,
  },
],
```

- [ ] **Step 7: Add `settings` and `blocks` to `team`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Meet Our Team' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'The people behind the brand' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '3',
  },
  showSocial: { type: 'toggle', label: 'Show Social Links', defaultValue: false },
},
blocks: [
  {
    type: 'team_member',
    label: 'Team Members',
    singularLabel: 'Member',
    icon: 'person',
    dataKey: 'members',
    fields: {
      name: { type: 'text', label: 'Full Name', placeholder: 'Jane Smith' },
      role: { type: 'text', label: 'Role / Title', placeholder: 'CEO & Founder' },
      bio: { type: 'textarea', label: 'Short Bio', placeholder: 'Tell us about this team member' },
      image: { type: 'image', label: 'Profile Photo' },
      linkedinUrl: { type: 'url', label: 'LinkedIn URL' },
      twitterUrl: { type: 'url', label: 'Twitter / X URL' },
    },
    createDefault: () => ({ name: 'Team Member', role: 'Role', bio: '', image: '', linkedinUrl: '', twitterUrl: '' }),
    maxItems: 12,
  },
],
```

- [ ] **Step 8: Add `settings` and `blocks` to `divider`**

```typescript
settings: {
  style: {
    type: 'select',
    label: 'Divider Style',
    options: [
      { value: 'line', label: 'Solid Line' },
      { value: 'dashed', label: 'Dashed Line' },
      { value: 'dots', label: 'Dots' },
      { value: 'space', label: 'Blank Space' },
      { value: 'wave', label: 'Wave' },
    ],
    defaultValue: 'line',
  },
  height: { type: 'number', label: 'Height (px)', defaultValue: 2, min: 1, max: 200, unit: 'px' },
  color: { type: 'color', label: 'Divider Color', defaultValue: '#e5e7eb' },
  width: {
    type: 'select',
    label: 'Width',
    options: [
      { value: 'full', label: 'Full Width' },
      { value: 'container', label: 'Container Width' },
    ],
    defaultValue: 'full',
  },
  spacing: { type: 'number', label: 'Vertical Spacing (px)', defaultValue: 40, min: 0, max: 200, unit: 'px' },
},
blocks: [],
```

- [ ] **Step 9: Add `settings` and `blocks` to `imageComparison`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'See the Difference' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Before and after comparison' },
  beforeImage: { type: 'image', label: 'Before Image', required: true },
  afterImage: { type: 'image', label: 'After Image', required: true },
  beforeLabel: { type: 'text', label: 'Before Label', placeholder: 'Before', defaultValue: 'Before' },
  afterLabel: { type: 'text', label: 'After Label', placeholder: 'After', defaultValue: 'After' },
  startPosition: {
    type: 'range',
    label: 'Start Position',
    min: 10,
    max: 90,
    step: 5,
    defaultValue: 50,
    unit: '%',
    helpText: 'Initial divider position (10–90%)',
  },
},
blocks: [],
```

- [ ] **Step 10: TypeScript check — expect only E-commerce/Engagement/Social sections still missing**
```bash
npx tsc --noEmit 2>&1 | grep "sectionRegistry\|'settings'\|'blocks'" | head -20
```

- [ ] **Step 11: Commit**
```bash
git add src/registry/sectionRegistry.ts
git commit -m "feat(engine): add settings/blocks schema to Content sections (features, about, contact, gallery, video, stats, team, divider, imageComparison)"
```

---

## Task 8: Add schemas — E-commerce sections (products, deals, collections, pricing)

**Files:**
- Modify: `src/registry/sectionRegistry.ts`

- [ ] **Step 1: Add `settings` and `blocks` to `products`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Our Products' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collection' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '3',
  },
  limit: { type: 'number', label: 'Products to Show', defaultValue: 8, min: 1, max: 50 },
  showPrice: { type: 'toggle', label: 'Show Price', defaultValue: true },
  showAddToCart: { type: 'toggle', label: 'Show "Add to Cart" Button', defaultValue: true },
  showDiscount: { type: 'toggle', label: 'Show Discount Badge', defaultValue: true },
  sortBy: {
    type: 'select',
    label: 'Sort By',
    options: [
      { value: 'newest', label: 'Newest First' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popular', label: 'Most Popular' },
    ],
    defaultValue: 'newest',
  },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
},
blocks: [],
```

- [ ] **Step 2: Add `settings` and `blocks` to `deals`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Deals & Offers' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Limited-time offers you cannot miss' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '2',
  },
  limit: { type: 'number', label: 'Deals to Show', defaultValue: 6, min: 1, max: 50 },
  showTimer: { type: 'toggle', label: 'Show Deal Timer', defaultValue: true },
  showOriginalPrice: { type: 'toggle', label: 'Show Original Price', defaultValue: true },
  showDiscount: { type: 'toggle', label: 'Show Discount Percentage', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#fff7ed' },
},
blocks: [],
```

- [ ] **Step 3: Add `settings` and `blocks` to `collections`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Shop by Category' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Browse our collections' },
  columns: {
    type: 'select',
    label: 'Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
      { value: '4', label: '4 Columns' },
    ],
    defaultValue: '3',
  },
  displayStyle: {
    type: 'select',
    label: 'Display Style',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'carousel', label: 'Carousel' },
    ],
    defaultValue: 'grid',
  },
  showCount: { type: 'toggle', label: 'Show Product Count', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f9fafb' },
},
blocks: [],
```

- [ ] **Step 4: Add `settings` and `blocks` to `pricing`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Simple, Transparent Pricing' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Choose the plan that works for you' },
  currency: { type: 'text', label: 'Currency Symbol', placeholder: '$', defaultValue: '$' },
  showToggle: { type: 'toggle', label: 'Show Monthly/Annual Toggle', defaultValue: false },
  billingPeriod: {
    type: 'select',
    label: 'Billing Period Label',
    options: [
      { value: '/month', label: 'Per Month' },
      { value: '/year', label: 'Per Year' },
      { value: '/user', label: 'Per User' },
      { value: '', label: 'No Period Label' },
    ],
    defaultValue: '/month',
  },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
},
blocks: [
  {
    type: 'pricing_plan',
    label: 'Pricing Plans',
    singularLabel: 'Plan',
    icon: 'sell',
    dataKey: 'plans',
    fields: {
      name: { type: 'text', label: 'Plan Name', placeholder: 'Pro' },
      price: { type: 'number', label: 'Price', min: 0, defaultValue: 0 },
      description: { type: 'textarea', label: 'Description', placeholder: 'Everything in Basic, plus...' },
      featured: { type: 'toggle', label: 'Featured Plan', helpText: 'Highlight this plan as recommended', defaultValue: false },
      ctaText: { type: 'text', label: 'CTA Button Text', placeholder: 'Get Started', defaultValue: 'Get Started' },
      ctaLink: { type: 'url', label: 'CTA Button Link', placeholder: 'https://' },
      features: { type: 'textarea', label: 'Features (one per line)', placeholder: 'Unlimited products\nPriority support\nCustom domain', helpText: 'One feature per line' },
    },
    createDefault: () => ({ name: 'New Plan', price: 0, description: '', featured: false, ctaText: 'Get Started', ctaLink: '', features: '' }),
    maxItems: 5,
  },
],
```

- [ ] **Step 5: TypeScript check — expect only Engagement/Social sections still missing**
```bash
npx tsc --noEmit 2>&1 | grep "property.*missing\|'settings'\|'blocks'" | head -20
```

- [ ] **Step 6: Commit**
```bash
git add src/registry/sectionRegistry.ts
git commit -m "feat(engine): add settings/blocks schema to E-commerce sections (products, deals, collections, pricing)"
```

---

## Task 9: Add schemas — Engagement sections (cta, countdown, banner, newsletter, services)

**Files:**
- Modify: `src/registry/sectionRegistry.ts`

- [ ] **Step 1: Add `settings` and `blocks` to `cta`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'Ready to Get Started?' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Join thousands of happy customers' },
  buttonText: { type: 'text', label: 'Primary Button Text', placeholder: 'Shop Now', defaultValue: 'Shop Now' },
  buttonLink: { type: 'url', label: 'Primary Button Link', placeholder: 'https://' },
  secondaryButtonText: { type: 'text', label: 'Secondary Button Text', placeholder: 'Learn More' },
  secondaryButtonLink: { type: 'url', label: 'Secondary Button Link', placeholder: 'https://' },
  backgroundImage: { type: 'image', label: 'Background Image' },
  backgroundColor: { type: 'color-gradient', label: 'Background Color' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
  align: {
    type: 'select',
    label: 'Content Alignment',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    defaultValue: 'center',
  },
},
blocks: [],
```

- [ ] **Step 2: Add `settings` and `blocks` to `countdown`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'Limited Time Offer' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: "Don't miss out!" },
  targetDate: { type: 'date', label: 'Target Date', helpText: 'The date the countdown reaches zero' },
  targetTime: { type: 'text', label: 'Target Time (HH:MM)', placeholder: '23:59', helpText: 'Time in 24-hour format' },
  expiredMessage: { type: 'text', label: 'Expired Message', placeholder: 'Offer has ended!', defaultValue: 'Offer has ended!' },
  daysLabel: { type: 'text', label: 'Days Label', placeholder: 'Days', defaultValue: 'Days' },
  hoursLabel: { type: 'text', label: 'Hours Label', placeholder: 'Hours', defaultValue: 'Hours' },
  minutesLabel: { type: 'text', label: 'Minutes Label', placeholder: 'Minutes', defaultValue: 'Minutes' },
  secondsLabel: { type: 'text', label: 'Seconds Label', placeholder: 'Seconds', defaultValue: 'Seconds' },
  showSeconds: { type: 'toggle', label: 'Show Seconds', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#1a1a1a' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
  accentColor: { type: 'color', label: 'Accent / Timer Color', defaultValue: '#27491F' },
},
blocks: [],
```

- [ ] **Step 3: Add `settings` and `blocks` to `banner`**

```typescript
settings: {
  text: { type: 'textarea', label: 'Banner Text', placeholder: 'Free shipping on orders over $50!', maxLength: 200 },
  linkText: { type: 'text', label: 'Link Text', placeholder: 'Shop Now' },
  link: { type: 'url', label: 'Link URL', placeholder: 'https://' },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#27491F' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
  closeable: { type: 'toggle', label: 'Allow Dismiss', helpText: 'Show an × button to close the banner', defaultValue: true },
  position: {
    type: 'select',
    label: 'Position',
    options: [
      { value: 'top', label: 'Top of page' },
      { value: 'bottom', label: 'Bottom of page' },
    ],
    defaultValue: 'top',
  },
  marquee: { type: 'toggle', label: 'Scrolling Marquee', helpText: 'Animate the banner text horizontally', defaultValue: false },
  marqueeSpeed: {
    type: 'number',
    label: 'Marquee Speed (seconds)',
    min: 5,
    max: 60,
    defaultValue: 20,
    unit: 's',
    showWhen: { field: 'marquee', equals: true },
  },
},
blocks: [],
```

- [ ] **Step 4: Add `settings` and `blocks` to `newsletter`**

```typescript
settings: {
  title: { type: 'text', label: 'Title', placeholder: 'Stay in the Loop' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Get exclusive deals and updates' },
  placeholder: { type: 'text', label: 'Email Input Placeholder', placeholder: 'Enter your email', defaultValue: 'Enter your email' },
  buttonText: { type: 'text', label: 'Subscribe Button Text', placeholder: 'Subscribe', defaultValue: 'Subscribe' },
  successMessage: { type: 'text', label: 'Success Message', placeholder: "You're subscribed! 🎉", defaultValue: "You're subscribed! 🎉" },
  privacyText: { type: 'text', label: 'Privacy Note', placeholder: 'No spam. Unsubscribe anytime.' },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f0fdf4' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
  buttonColor: { type: 'color', label: 'Button Color', defaultValue: '#27491F' },
},
blocks: [],
```

- [ ] **Step 5: Add `settings` and `blocks` to `services`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Our Services' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'What we offer' },
  layout: {
    type: 'select',
    label: 'Layout Style',
    options: [
      { value: 'grid', label: 'Grid Cards' },
      { value: 'list', label: 'List with Image' },
      { value: 'alternating', label: 'Alternating (image left/right)' },
    ],
    defaultValue: 'grid',
  },
  columns: {
    type: 'select',
    label: 'Grid Columns',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
    ],
    defaultValue: '3',
    showWhen: { field: 'layout', equals: 'grid' },
  },
},
blocks: [
  {
    type: 'service',
    label: 'Services',
    singularLabel: 'Service',
    icon: 'build',
    dataKey: 'services',
    fields: {
      icon: { type: 'icon', label: 'Icon', placeholder: 'build' },
      title: { type: 'text', label: 'Service Name', placeholder: 'Custom Design' },
      description: { type: 'richtext', label: 'Description', placeholder: 'Describe this service' },
      image: { type: 'image', label: 'Service Image' },
      link: { type: 'url', label: 'Learn More Link' },
      linkText: { type: 'text', label: 'Link Text', placeholder: 'Learn more' },
    },
    createDefault: () => ({ icon: 'build', title: 'New Service', description: '', image: '', link: '', linkText: 'Learn more' }),
    maxItems: 12,
  },
],
```

- [ ] **Step 6: TypeScript check — expect only Social Proof sections missing**
```bash
npx tsc --noEmit 2>&1 | grep "property.*missing\|'settings'\|'blocks'" | head -20
```

- [ ] **Step 7: Commit**
```bash
git add src/registry/sectionRegistry.ts
git commit -m "feat(engine): add settings/blocks schema to Engagement sections (cta, countdown, banner, newsletter, services)"
```

---

## Task 10: Add schemas — Social Proof sections (testimonials, faq, partners)

**Files:**
- Modify: `src/registry/sectionRegistry.ts`

- [ ] **Step 1: Add `settings` and `blocks` to `testimonials`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'What Our Customers Say' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Real reviews from real customers' },
  layout: {
    type: 'select',
    label: 'Layout',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'carousel', label: 'Carousel' },
      { value: 'list', label: 'List' },
    ],
    defaultValue: 'grid',
  },
  columns: {
    type: 'select',
    label: 'Columns (Grid)',
    options: [
      { value: '2', label: '2 Columns' },
      { value: '3', label: '3 Columns' },
    ],
    defaultValue: '3',
    showWhen: { field: 'layout', equals: 'grid' },
  },
  showRating: { type: 'toggle', label: 'Show Star Rating', defaultValue: true },
  showAvatar: { type: 'toggle', label: 'Show Avatar / Photo', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#f9fafb' },
},
blocks: [
  {
    type: 'testimonial',
    label: 'Testimonials',
    singularLabel: 'Testimonial',
    icon: 'format_quote',
    dataKey: 'reviews',
    fields: {
      text: { type: 'textarea', label: 'Review Text', placeholder: 'This product changed my life!', required: true },
      author: { type: 'text', label: 'Customer Name', placeholder: 'Jane Smith' },
      role: { type: 'text', label: 'Title / Role (optional)', placeholder: 'Verified Buyer' },
      company: { type: 'text', label: 'Company (optional)', placeholder: 'Acme Corp' },
      rating: { type: 'range', label: 'Star Rating', min: 1, max: 5, step: 1, defaultValue: 5 },
      avatar: { type: 'image', label: 'Profile Photo' },
    },
    createDefault: () => ({ text: 'Amazing product!', author: 'Customer Name', role: 'Verified Buyer', company: '', rating: 5, avatar: '' }),
    maxItems: 20,
  },
],
```

- [ ] **Step 2: Add `settings` and `blocks` to `faq`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Frequently Asked Questions' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Everything you need to know' },
  layout: {
    type: 'select',
    label: 'Layout',
    options: [
      { value: 'accordion', label: 'Accordion (collapsible)' },
      { value: 'list', label: 'List (always open)' },
    ],
    defaultValue: 'accordion',
  },
  openFirst: { type: 'toggle', label: 'Open First Item', helpText: 'Expand the first FAQ by default', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
  textColor: { type: 'color', label: 'Text Color', defaultValue: '#1a1a1a' },
},
blocks: [
  {
    type: 'faq_item',
    label: 'FAQ Items',
    singularLabel: 'Question',
    icon: 'help',
    dataKey: 'faqs',
    fields: {
      question: { type: 'text', label: 'Question', placeholder: 'How do I place an order?', required: true },
      answer: { type: 'richtext', label: 'Answer', placeholder: 'To place an order...', required: true },
    },
    createDefault: () => ({ question: 'New Question', answer: 'Answer here' }),
    maxItems: 30,
  },
],
```

- [ ] **Step 3: Add `settings` and `blocks` to `partners`**

```typescript
settings: {
  title: { type: 'text', label: 'Section Title', placeholder: 'Our Partners' },
  subtitle: { type: 'textarea', label: 'Subtitle', placeholder: 'Trusted by leading brands' },
  layout: {
    type: 'select',
    label: 'Layout',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'row', label: 'Row' },
      { value: 'carousel', label: 'Scrolling Carousel' },
    ],
    defaultValue: 'row',
  },
  grayscale: { type: 'toggle', label: 'Grayscale Logos', helpText: 'Display partner logos in grayscale', defaultValue: true },
  backgroundColor: { type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
},
blocks: [
  {
    type: 'partner',
    label: 'Partners',
    singularLabel: 'Partner',
    icon: 'business',
    dataKey: 'partners',
    fields: {
      name: { type: 'text', label: 'Partner Name', placeholder: 'Acme Corp' },
      logo: { type: 'image', label: 'Logo', required: true },
      url: { type: 'url', label: 'Website URL (optional)', placeholder: 'https://acme.com' },
    },
    createDefault: () => ({ name: 'Partner', logo: '', url: '' }),
    maxItems: 20,
  },
],
```

- [ ] **Step 4: Remove `Editor` import and field from all 24 registry entries**

Now that all 24 sections have `settings` and `blocks`, remove the `Editor` field and its imports.

At the top of `sectionRegistry.ts`, find and remove all 24 `React.lazy(...)` imports for the custom editors:
```typescript
// DELETE THESE (all 24 lazy imports):
const HeroEditor = React.lazy(...)
const NavbarEditor = React.lazy(...)
// ...etc
```

In each section entry, remove the `Editor:` line.

Also remove the `EditorProps` import from `registry/types.ts` from `sectionRegistry.ts` if it's now unused.

And in `src/registry/types.ts`, remove `Editor: ComponentType<EditorProps>;` from `SectionRegistryEntry`.

- [ ] **Step 5: TypeScript check — should now have zero registry errors**
```bash
npx tsc --noEmit 2>&1 | grep "sectionRegistry\|registry/types" | head -20
```
Expected: zero errors in registry files.

- [ ] **Step 6: Full TypeScript check — count total errors**
```bash
npx tsc --noEmit 2>&1 | grep "^src/" | wc -l
```

- [ ] **Step 7: Commit**
```bash
git add src/registry/sectionRegistry.ts src/registry/types.ts
git commit -m "feat(engine): add settings/blocks schema to Social Proof sections; remove Editor from all registry entries"
```

---

## Task 11: Create `sectionRenderers.tsx` — registry-driven renderer map

**Files:**
- Create: `src/registry/sectionRenderers.tsx`

This replaces the manual switch in `SectionRenderer.tsx`. It imports all 24 `*Section.tsx` visual renderer components and wraps them for `SectionRendererProps`.

- [ ] **Step 1: Create `src/registry/sectionRenderers.tsx`**

```tsx
// src/registry/sectionRenderers.tsx
// Maps every SectionType to its visual renderer component.
// Imported by SectionRenderer.tsx to replace the manual switch.

import React from 'react';
import type { SectionType } from '../types/builder';
import type { SectionRendererProps } from '../types/engine';

// ── Visual Renderer Imports ──────────────────────────────────────────────
import HeroSection from '../components/builder/sections/HeroSection';
import NavbarSection from '../components/builder/sections/NavbarSection';
import FeaturesSection from '../components/builder/sections/FeaturesSection';
import ProductsSection from '../components/builder/sections/ProductsSection';
import DealsSection from '../components/builder/sections/DealsSection';
import CollectionsSection from '../components/builder/sections/CollectionsSection';
import TestimonialsSection from '../components/builder/sections/TestimonialsSection';
import CTASection from '../components/builder/sections/CTASection';
import AboutSection from '../components/builder/sections/AboutSection';
import ContactSection from '../components/builder/sections/ContactSection';
import GallerySection from '../components/builder/sections/GallerySection';
import PricingSection from '../components/builder/sections/PricingSection';
import FAQSection from '../components/builder/sections/FAQSection';
import FooterSection from '../components/builder/sections/FooterSection';
import StatsSection from '../components/builder/sections/StatsSection';
import TeamSection from '../components/builder/sections/TeamSection';
import ServicesSection from '../components/builder/sections/ServicesSection';
import VideoSection from '../components/builder/sections/VideoSection';
import CountdownSection from '../components/builder/sections/CountdownSection';
import BannerSection from '../components/builder/sections/BannerSection';
import PartnersSection from '../components/builder/sections/PartnersSection';
import NewsletterSection from '../components/builder/sections/NewsletterSection';
import DividerSection from '../components/builder/sections/DividerSection';
import ImageComparisonSection from '../components/builder/sections/ImageComparisonSection';

// ── Renderer Map ─────────────────────────────────────────────────────────
// Each entry is a thin wrapper that passes data/style to the typed renderer.
// The cast is needed because *Section components accept typed data interfaces,
// but the engine passes Record<string, unknown> for generality.

export const SECTION_RENDERERS: Record<SectionType, React.ComponentType<SectionRendererProps>> = {
  hero:            ({ data, style }) => <HeroSection data={data as never} style={style} />,
  navbar:          ({ data, style, siteId }) => <NavbarSection data={data as never} style={style} siteId={siteId} />,
  features:        ({ data, style }) => <FeaturesSection data={data as never} style={style} />,
  products:        ({ data, style, siteId }) => <ProductsSection data={data as never} style={style} siteId={siteId} />,
  deals:           ({ data, style, siteId }) => <DealsSection data={data as never} style={style} siteId={siteId} />,
  collections:     ({ data, style, siteId }) => <CollectionsSection data={data as never} style={style} siteId={siteId} />,
  testimonials:    ({ data, style }) => <TestimonialsSection data={data as never} style={style} />,
  cta:             ({ data, style }) => <CTASection data={data as never} style={style} />,
  about:           ({ data, style }) => <AboutSection data={data as never} style={style} />,
  contact:         ({ data, style, siteId }) => <ContactSection data={data as never} style={style} siteId={siteId} />,
  gallery:         ({ data, style }) => <GallerySection data={data as never} style={style} />,
  pricing:         ({ data, style }) => <PricingSection data={data as never} style={style} />,
  faq:             ({ data, style }) => <FAQSection data={data as never} style={style} />,
  footer:          ({ data, style, siteId }) => <FooterSection data={data as never} style={style} siteId={siteId} />,
  stats:           ({ data, style }) => <StatsSection data={data as never} style={style} />,
  team:            ({ data, style }) => <TeamSection data={data as never} style={style} />,
  services:        ({ data, style }) => <ServicesSection data={data as never} style={style} />,
  video:           ({ data, style }) => <VideoSection data={data as never} style={style} />,
  countdown:       ({ data, style }) => <CountdownSection data={data as never} style={style} />,
  banner:          ({ data, style }) => <BannerSection data={data as never} style={style} />,
  partners:        ({ data, style }) => <PartnersSection data={data as never} style={style} />,
  newsletter:      ({ data, style, siteId }) => <NewsletterSection data={data as never} style={style} siteId={siteId} />,
  divider:         ({ data, style }) => <DividerSection data={data as never} style={style} />,
  imageComparison: ({ data, style }) => <ImageComparisonSection data={data as never} style={style} />,
};
```

**Note on `data as never`:** This is intentional. The visual renderer components accept typed data (e.g. `HeroSectionData`), but `SectionRendererProps.data` is `Record<string, unknown>`. Using `as never` is safe because the engine guarantees the data structure via `mergeSectionData` before passing it to the renderer. TypeScript can't verify this without changing all 24 renderer components, which is out of scope.

- [ ] **Step 2: TypeScript check — sectionRenderers.tsx should be clean**
```bash
npx tsc --noEmit 2>&1 | grep "sectionRenderers" | head -10
```

- [ ] **Step 3: Commit**
```bash
git add src/registry/sectionRenderers.tsx
git commit -m "feat(engine): add sectionRenderers.tsx — registry-driven renderer map for all 24 sections"
```

---

## Task 12: Replace `SectionRenderer.tsx` switch with registry lookup

**Files:**
- Modify: `src/components/builder/SectionRenderer.tsx`

- [ ] **Step 1: Read the current `SectionRenderer.tsx` in full**
```bash
cat src/components/builder/SectionRenderer.tsx
```

- [ ] **Step 2: Rewrite the render logic**

Keep all existing logic for:
- `mergeSectionData()` call for render-time data defaults
- `sectionStyle` construction from `section.style`
- The outer `<div>` with selection outline, overlay, animation class
- `isSelected` / `onSelect` click handler

Replace ONLY the `renderSection()` function and its `switch` statement:

**Delete this entire block:**
```typescript
const renderSection = (sectionType: SectionType, sectionData: Record<string, unknown>) => {
  switch (sectionType) {
    case 'hero': return <HeroSection ... />;
    case 'navbar': return <NavbarSection ... />;
    // ...all 24 cases
    default: return null;
  }
};
```

**Also delete all 24 `*Section` imports at the top of the file.**

**Replace with:**
```typescript
import { SECTION_RENDERERS } from '../../registry/sectionRenderers';

// Inside the component:
const Renderer = SECTION_RENDERERS[section.type];
if (!Renderer) {
  return (
    <div className="p-8 text-center text-gray-400 text-sm">
      Unknown section type: {section.type}
    </div>
  );
}
// Where the switch result was used:
const sectionContent = (
  <Renderer
    data={resolvedData}
    style={sectionStyle}
    siteId={siteId}
    previewMode={previewMode}
  />
);
```

**Important:** Preserve all existing wrapper code (selection ring, overlay, theme CSS vars, animation, etc.) — only the inner renderer dispatch changes.

- [ ] **Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "SectionRenderer" | head -10
```
Expected: zero errors in SectionRenderer.tsx.

- [ ] **Step 4: Commit**
```bash
git add src/components/builder/SectionRenderer.tsx
git commit -m "feat(engine): replace SectionRenderer switch with registry-driven SECTION_RENDERERS lookup"
```

---

## Task 13: Update `SectionEditor.tsx` — use `SectionEnginePanel`

**Files:**
- Modify: `src/components/builder/SectionEditor.tsx`

- [ ] **Step 1: Read the current `SectionEditor.tsx` in full**
```bash
cat src/components/builder/SectionEditor.tsx
```

- [ ] **Step 2: Identify what to keep vs replace**

**KEEP:**
- The `DataAnalyticsPanel` inner component (the "Data & Analytics" tab content — shows API binding info and analytics event rows)
- The tab bar (Content | Data & Analytics)
- `embedded` prop — suppresses header/tabs when in `BuilderLeftPanel`
- `activeTabOverride` prop — allows `BuilderLeftPanel` to control which tab is active
- `Suspense` wrapper (keep it, now wraps `SectionEnginePanel` instead of lazy Editor)
- The registry lookup for `analyticsEvents` / `apiBinding` (to decide whether to show the "Data & Analytics" tab)

**REPLACE:**
- The `<Suspense><entry.Editor ... /></Suspense>` block → `<SectionEnginePanel ... />`
- Remove `entry.Editor` references (the `Editor` field no longer exists on registry entries)

- [ ] **Step 3: Edit `SectionEditor.tsx`**

Add import:
```typescript
import SectionEnginePanel from './engine/SectionEnginePanel';
```

Remove any import of `EditorProps` (no longer needed here).

Replace the Content tab rendering block:
```tsx
// Before:
{resolvedTab === 'content' && (
  <Suspense fallback={...}>
    <entry.Editor
      section={section}
      onUpdate={onUpdate}
      onClose={onClose ?? (() => {})}
      businessId={businessId}
      siteId={siteId}
    />
  </Suspense>
)}

// After:
{resolvedTab === 'content' && (
  <SectionEnginePanel
    section={section}
    onUpdate={onUpdate}
    onClose={onClose}
    businessId={businessId}
    siteId={siteId}
    embedded={embedded}
    activeTabOverride={activeTabOverride}
  />
)}
```

Remove `Suspense` wrapper since `SectionEnginePanel` is not lazy.

Keep the `analyticsTab` condition exactly as before — check `entry.apiBinding || entry.analyticsEvents` — these fields still exist on the registry entry.

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "SectionEditor" | head -10
```
Expected: zero errors in SectionEditor.tsx.

- [ ] **Step 5: Commit**
```bash
git add src/components/builder/SectionEditor.tsx
git commit -m "feat(engine): update SectionEditor to render SectionEnginePanel instead of custom *Editor components"
```

---

## Task 14: Update `BuilderLeftPanel.tsx` — wire block settings view

**Files:**
- Modify: `src/components/builder/BuilderLeftPanel.tsx`

Currently the `block` view in `BuilderLeftPanel` shows a placeholder "Block-level editing coming soon." Now that blocks have schemas, wire the block settings view to render a `BlockEditor` for the selected block.

- [ ] **Step 1: Read `BuilderLeftPanel.tsx` and `useBuilderNav.ts`**

The `useBuilderNav` hook's `NavFrame` for the block view has: `{ view: 'block', label, blockKey }`. The `blockKey` needs to be the block type (e.g. `'feature'`, `'testimonial'`) so we can look up the right `BlockSchema`.

- [ ] **Step 2: Update `pushBlock` call sites**

In `BuilderLeftPanel`'s `PanelContent`, the block view currently shows a placeholder. Update the block view to:

1. Look up the selected section's registry entry
2. Find the `BlockSchema` matching `nav.current.blockKey`
3. Find the block data at the correct index from `sections.find(id).data[blockSchema.dataKey]`
4. Render `BlockEditor` for that block

But first, `useBuilderNav.ts` needs to support storing a block index alongside the block key. Update `NavFrame`:

In `useBuilderNav.ts`, add `blockIndex?: number` to `NavFrame`:
```typescript
export interface NavFrame {
  view: NavView;
  label: string;
  sectionId?: string;
  blockKey?: string;   // block type key (e.g. 'feature')
  blockIndex?: number; // index within the blocks array
}
```

Update `pushBlock` to accept `blockIndex`:
```typescript
const pushBlock = useCallback((blockKey: string, label: string, blockIndex: number) => {
  setStack((prev) => {
    const base = prev.slice(0, 2);
    if (base.length < 2) return prev;
    return [...base, { view: 'block', label, blockKey, blockIndex }];
  });
}, []);
```

- [ ] **Step 3: Update `BuilderLeftPanel`'s block view**

In `PanelContent`, replace the placeholder block view:

```tsx
{/* ── BLOCK SETTINGS VIEW ── */}
{nav.current.view === 'block' && selectedSection && (() => {
  const entry = SECTION_REGISTRY[selectedSection.type as SectionType];
  const blockSchema = entry?.blocks?.find(b => b.type === nav.current.blockKey);
  const blockIndex = nav.current.blockIndex ?? 0;
  const blockItems = (selectedSection.data[blockSchema?.dataKey ?? ''] as Record<string, unknown>[]) ?? [];
  const blockData = blockItems[blockIndex];

  if (!blockSchema || !blockData) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <p className="text-xs text-[#666] text-center mt-8">Block not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-[.6px] mb-3">
        {blockSchema.singularLabel} #{blockIndex + 1}
      </p>
      <BlockEditor
        schema={blockSchema}
        data={blockData}
        onChange={(updatedBlock) => {
          const updatedItems = [...blockItems];
          updatedItems[blockIndex] = updatedBlock;
          onUpdateSection(selectedSection.id, {
            ...selectedSection.data,
            [blockSchema.dataKey]: updatedItems,
          });
        }}
        siteId={siteId}
        businessId={businessId}
      />
    </div>
  );
})()}
```

Add `BlockEditor` import:
```typescript
import BlockEditor from './engine/BlockEditor';
```

- [ ] **Step 4: Export `pushBlock` type update from hook**

Make sure `useBuilderNav.ts` exports the updated `pushBlock` with `blockIndex` parameter. Update the type in the return signature.

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "BuilderLeftPanel\|useBuilderNav" | head -10
```

- [ ] **Step 6: Commit**
```bash
git add src/components/builder/BuilderLeftPanel.tsx src/components/builder/hooks/useBuilderNav.ts
git commit -m "feat(engine): wire block settings view in BuilderLeftPanel using BlockEditor"
```

---

## Task 15: Delete deprecated editors and final cleanup

**Files:**
- Delete: all 24 `src/components/builder/editors/*Editor.tsx` files
- Check: TypeScript full build

- [ ] **Step 1: Full TypeScript check before deletion**
```bash
npx tsc --noEmit 2>&1 | grep "^src/" | grep -v "node_modules" | head -30
```

Confirm zero NEW errors (pre-existing errors in ContextualEditor.tsx, SectionRenderer.tsx about unrelated issues are acceptable — don't introduce new ones).

- [ ] **Step 2: Delete all 24 custom editor files**
```bash
cd src/components/builder/editors && rm \
  HeroEditor.tsx NavbarEditor.tsx FeaturesEditor.tsx ProductsEditor.tsx \
  DealsEditor.tsx CollectionsEditor.tsx TestimonialsEditor.tsx CTAEditor.tsx \
  AboutEditor.tsx ContactEditor.tsx GalleryEditor.tsx PricingEditor.tsx \
  FAQEditor.tsx FooterEditor.tsx StatsEditor.tsx TeamEditor.tsx \
  ServicesEditor.tsx VideoEditor.tsx CountdownEditor.tsx BannerEditor.tsx \
  PartnersEditor.tsx NewsletterEditor.tsx DividerEditor.tsx ImageComparisonEditor.tsx
cd ../../..
```

- [ ] **Step 3: Full TypeScript check after deletion**
```bash
npx tsc --noEmit 2>&1 | grep "^src/" | grep -v "node_modules"
```

Fix any NEW errors that appear (should be none if Tasks 1–14 were done correctly).

- [ ] **Step 4: Verify the shared primitives still exist (not accidentally deleted)**
```bash
ls src/components/builder/editors/shared/
```
Expected: `TextField.tsx ColorField.tsx ImageField.tsx SelectField.tsx ToggleField.tsx NumberField.tsx ArrayEditor.tsx StylePanel.tsx`

- [ ] **Step 5: Verify all engine files exist**
```bash
ls src/components/builder/engine/
```
Expected: `SchemaFormField.tsx SchemaForm.tsx BlockEditor.tsx BlockListEditor.tsx SectionEnginePanel.tsx`

- [ ] **Step 6: Check sectionRenderers.tsx imports compile**
```bash
npx tsc --noEmit 2>&1 | grep "sectionRenderers\|SectionRenderer" | head -10
```

- [ ] **Step 7: Final commit**
```bash
git add -A
git commit -m "feat(engine): complete Section Engine migration — delete 24 legacy *Editor components, registry-driven rendering, schema-driven editing"
```

---

## Critical Invariants (must not break)

1. **All 24 sections render correctly on canvas** — `SectionRenderer.tsx` uses `SECTION_RENDERERS` from the registry; visual output is identical
2. **All 24 sections are editable** — `SectionEnginePanel` renders `SchemaForm` + `BlockListEditor` from registry `settings` / `blocks`
3. **Section data defaults** — `mergeSectionData()` in `sectionDefaults.ts` still runs at render time; schema `defaultValue` fields are editor UI defaults, not the canonical render-time defaults
4. **Autosave + undo/redo** — `onUpdate` callbacks still flow up to `BuilderPage` → `updateSections` → `useUndoRedo`; no behavioral change
5. **Floating element editor** — `FloatingElementEditor.tsx` is unchanged; `BuilderCanvas`'s `data-edit-type` click detection is unchanged
6. **Data & Analytics tab** — `SectionEditor.tsx` still shows this tab for sections with `apiBinding` / `analyticsEvents`; tab content is unchanged
7. **BlockLeftPanel breadcrumb** — outline → section → block nav still works; `useBuilderNav.pushBlock` now accepts `blockIndex` but is backward compatible via the block settings wiring in Task 14
8. **TypeScript** — zero new TypeScript errors in any builder file; all engine types are fully typed

---

## Known Out-of-Scope Items (document as follow-up TODOs)

- **Inline editing from FloatingElementEditor**: the engine's `FieldSchema` does not yet affect what `FloatingElementEditor` shows — it uses its own `deriveFieldKey` heuristic. Future work: make `FloatingElementEditor` read from the section's `settings` schema to surface the right fields.
- **ActivationConstraint on PointerSensor** in `BuilderCanvas.tsx` — pre-existing drag UX issue, not addressed here.
- **RichText fields** in `SchemaFormField` fall back to `textarea` — wire `RichTextEditor.tsx` for `type: 'richtext'` fields as a follow-up.
- **console.log cleanup** in `BuilderPage.tsx` — 8 debug logs still present, remove in a dedicated cleanup PR.
