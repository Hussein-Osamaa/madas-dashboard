# Shopify-Style Builder UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace XDIGIX's right-sidebar builder layout with a Shopify-style left-panel, 3-level navigation (outline → section settings → block settings), floating element editor, and add-section sheet.

**Architecture:** The existing `BuilderPage.tsx` state and all 24 section editors remain untouched structurally. We swap the right sidebar layout for a new `BuilderLeftPanel` component with a stack-based navigation, add a portal-rendered `FloatingElementEditor` anchored to hovered canvas elements, and move the section library into an `AddSectionSheet` overlay from the left. `SectionEditor` receives an optional `tab` prop and its internal header/back-button is suppressed when used embedded in the left panel.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react, @dnd-kit/core, react-dom createPortal

> **CWD for all commands:** All `git add`, `cat`, and `npx tsc` commands assume the working directory is:
> `/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/apps/marketing/apps/dashboard`
> (i.e. `cd` there first and keep it as your working directory throughout)

---

## File Map

### Files to CREATE
| File | Responsibility |
|---|---|
| `src/components/builder/BuilderLeftPanel.tsx` | 3-level nav panel: outline → section settings (Content\|Style tabs) → block settings. Extracts `<PanelContent>` into a named inner component shared by both desktop and drawer modes. |
| `src/components/builder/AddSectionSheet.tsx` | 360px overlay sliding from left with section library grid |
| `src/components/builder/FloatingElementEditor.tsx` | Portal-rendered 240px floating card anchored to hovered element (fully controlled state) |
| `src/components/builder/hooks/useBuilderNav.ts` | Nav stack state: push/pop/go-to, breadcrumb labels |

### Files to MODIFY
| File | What Changes |
|---|---|
| `src/components/builder/SectionEditor.tsx` | Add optional `embedded?: boolean` prop; when true, suppress internal header/tabs/back-button and render only the editor body so the left panel's own tab system controls navigation |
| `src/pages/ecommerce/BuilderPage.tsx` | Replace right sidebar with `BuilderLeftPanel` + `FloatingElementEditor` + `AddSectionSheet`; reconcile `onSelectElement` → `onSelectElementWithRect`; keep `ThemePanel` triggered by left panel's Sun icon |
| `src/components/builder/BuilderToolbar.tsx` | Shopify-style dark top bar; remove sidebar toggle; keep all existing prop callbacks |
| `src/components/builder/BuilderCanvas.tsx` | Add `onSelectElementWithRect` prop (replaces/augments `onSelectElement`); add hover rings, section chips, action bars, element badges |

### Files to LEAVE UNCHANGED
All 24 individual editors in `src/components/builder/editors/` — they render inside the new left panel's Content tab without modification.

---

## Task 1: `useBuilderNav` hook

**Files:**
- Create: `src/components/builder/hooks/useBuilderNav.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/components/builder/hooks
```

```typescript
// src/components/builder/hooks/useBuilderNav.ts
import { useState, useCallback } from 'react';

export type NavView = 'outline' | 'section' | 'block';

export interface NavFrame {
  view: NavView;
  label: string;
  sectionId?: string;
  blockKey?: string;
}

export function useBuilderNav() {
  const [stack, setStack] = useState<NavFrame[]>([
    { view: 'outline', label: 'Page outline' },
  ]);

  const current = stack[stack.length - 1];

  const pushSection = useCallback((sectionId: string, label: string) => {
    setStack([
      { view: 'outline', label: 'Page outline' },
      { view: 'section', label, sectionId },
    ]);
  }, []);

  const pushBlock = useCallback((blockKey: string, label: string) => {
    setStack((prev) => {
      const base = prev.slice(0, 2);
      return [...base, { view: 'block', label, blockKey }];
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
  }, []);

  const reset = useCallback(() => {
    setStack([{ view: 'outline', label: 'Page outline' }]);
  }, []);

  return { stack, current, pushSection, pushBlock, goTo, reset };
}
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit 2>&1 | grep useBuilderNav
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**
```bash
git add src/components/builder/hooks/useBuilderNav.ts
git commit -m "feat(builder): add useBuilderNav hook for 3-level left panel navigation"
```

---

## Task 2: `AddSectionSheet` component

**Files:**
- Create: `src/components/builder/AddSectionSheet.tsx`

**Before coding, read these files to understand the existing section registry shape:**

- [ ] **Step 1: Read BuilderSidebar and registry types**
```bash
cat src/components/builder/BuilderSidebar.tsx
cat src/registry/types.ts
```

Note: `SectionRegistryEntry.icon` is a **Material Icons glyph string** (e.g. `"storefront"`, `"menu"`), not an emoji or React node. Render it with `<span className="material-icons">{entry.icon}</span>`.

- [ ] **Step 2: Create AddSectionSheet.tsx**

```tsx
// src/components/builder/AddSectionSheet.tsx
import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';

interface Props {
  open: boolean;
  onClose: () => void;
  onAddSection: (type: SectionType) => void;
}

const TABS = ['All', 'Layout', 'Content', 'E-commerce', 'Engagement', 'Social Proof'] as const;
type Tab = typeof TABS[number];

export default function AddSectionSheet({ open, onClose, onAddSection }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('All');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const entries = Object.values(SECTION_REGISTRY);
  const filtered = entries.filter((entry) => {
    const matchesTab = activeTab === 'All' || entry.category === activeTab;
    const matchesSearch = !search || entry.label.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-[360px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col shadow-2xl"
        style={{ animation: 'slideInLeft 0.2s ease' }}
      >
        <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#e8e8e8]">Add section</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-[#2a2a2a] text-[#666] hover:text-[#ccc] flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search sections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#222] border border-[#333] rounded-lg text-[#ccc] text-xs pl-8 pr-3 py-2 outline-none focus:border-[#27491F] placeholder-[#555]"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex px-4 pt-2 border-b border-[#2a2a2a] flex-shrink-0 overflow-x-auto gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[11px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'text-[#e8e8e8] border-[#27491F]'
                  : 'text-[#666] border-transparent hover:text-[#ccc]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-[#555] text-xs text-center mt-8">No sections found</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((entry) => (
                <button
                  key={entry.type}
                  onClick={() => { onAddSection(entry.type as SectionType); onClose(); }}
                  className="rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#27491F] hover:shadow-[0_0_0_2px_rgba(39,73,31,0.2)] transition-all text-left group"
                >
                  {/* Mini preview */}
                  <div className="h-[72px] bg-gradient-to-br from-[#222] to-[#2a2a2a] flex items-center justify-center text-[#444] group-hover:text-[#666] transition-colors">
                    <span className="material-icons text-2xl">{entry.icon}</span>
                  </div>
                  <div className="px-2 py-1.5 bg-[#222] flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#ccc] truncate">{entry.label}</span>
                    <span className="text-[10px] text-[#555] ml-auto whitespace-nowrap">{entry.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Check TypeScript**
```bash
npx tsc --noEmit 2>&1 | grep AddSectionSheet
```
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add src/components/builder/AddSectionSheet.tsx
git commit -m "feat(builder): add AddSectionSheet slide-in overlay for section library"
```

---

## Task 3: `FloatingElementEditor` component

**Files:**
- Create: `src/components/builder/FloatingElementEditor.tsx`

**Important:** Uses fully controlled `value` + local `useState` to avoid uncontrolled/controlled mixing and to correctly reflect undo/redo state changes.

- [ ] **Step 1: Read ContextualEditor to understand element types**
```bash
cat src/components/builder/ContextualEditor.tsx
cat src/types/elementEditor.ts
```

- [ ] **Step 2: Create FloatingElementEditor.tsx**

```tsx
// src/components/builder/FloatingElementEditor.tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import { SelectedElement } from '../../types/elementEditor';
import { Section } from '../../types/builder';

interface Props {
  element: SelectedElement | null;
  anchorRect: DOMRect | null;
  section: Section | null;
  onUpdate: (sectionId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const SWATCHES = ['#1a1a1a', '#27491F', '#ffffff', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa'];

function deriveFieldKey(element: SelectedElement): string {
  switch (element.type) {
    case 'title':    return 'title';
    case 'subtitle': return 'subtitle';
    case 'button':   return 'buttonText';
    case 'cta':      return 'buttonText';
    case 'text':     return 'text';
    default:
      // SelectedElement may have an extra `fieldKey` set by the canvas
      return (element as { fieldKey?: string }).fieldKey ?? 'title';
  }
}

function deriveColorKey(fieldKey: string): string {
  if (fieldKey === 'title')      return 'titleColor';
  if (fieldKey === 'subtitle')   return 'subtitleColor';
  if (fieldKey === 'buttonText') return 'buttonTextColor';
  return 'textColor';
}

export default function FloatingElementEditor({ element, anchorRect, section, onUpdate, onClose }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Derive the field key and current value from the section data
  const fieldKey = element ? deriveFieldKey(element) : 'title';
  const rawValue = section ? String((section.data as Record<string, unknown>)[fieldKey] ?? '') : '';

  // Controlled local state — syncs with external section data (handles undo/redo)
  const [localValue, setLocalValue] = useState(rawValue);
  useEffect(() => { setLocalValue(rawValue); }, [rawValue]);

  // Position calculation
  let posStyle: React.CSSProperties = { display: 'none' };
  if (element && anchorRect) {
    const W = 248, H = 240;
    let left = anchorRect.right + 12;
    let top = anchorRect.top;
    if (left + W > window.innerWidth - 8) left = anchorRect.left - W - 12;
    if (top + H > window.innerHeight - 8) top = window.innerHeight - H - 8;
    if (top < 52) top = 52;
    posStyle = { position: 'fixed', left, top, width: W, zIndex: 200 };
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose();
    };
    if (element) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [element, onClose]);

  if (!element || !section) return null;

  const fieldLabel = fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1');
  const colorKey = deriveColorKey(fieldKey);
  const isButtonType = element.type === 'button' || element.type === 'cta';

  return createPortal(
    <div
      ref={wrapperRef}
      style={posStyle}
      className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#27491F]" />
          <span className="text-[11px] font-semibold text-[#ccc] capitalize">{element.type} text</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
        >
          <X size={10} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Content field — controlled */}
        <div>
          <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
            {fieldLabel}
          </label>
          <textarea
            rows={2}
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onUpdate(section.id, { [fieldKey]: e.target.value });
            }}
            className="w-full bg-[#252525] border border-[#333] rounded-md text-[#e8e8e8] text-[12px] px-2 py-1.5 outline-none resize-none focus:border-[#27491F] font-sans"
          />
        </div>

        {/* Color row */}
        <div>
          <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Text color</label>
          <div className="flex gap-1.5 flex-wrap">
            {SWATCHES.map((color) => (
              <button
                key={color}
                title={color}
                style={{ background: color === '#ffffff' ? '#fff' : color, borderColor: color === '#ffffff' ? '#444' : 'transparent' }}
                onClick={() => onUpdate(section.id, { [colorKey]: color })}
                className="w-5 h-5 rounded border-2 hover:scale-110 transition-transform"
              />
            ))}
          </div>
        </div>

        {/* Link field — buttons only */}
        {isButtonType && (
          <div>
            <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Link URL</label>
            <input
              type="text"
              placeholder="https://…"
              value={String((section.data as Record<string, unknown>).buttonLink ?? '')}
              onChange={(e) => onUpdate(section.id, { buttonLink: e.target.value })}
              className="w-full bg-[#252525] border border-[#333] rounded-md text-[#e8e8e8] text-[12px] px-2 py-1.5 outline-none focus:border-[#27491F] font-sans"
            />
          </div>
        )}

        {/* Redirect note */}
        <div className="flex items-start gap-1.5 p-2 bg-[#1a2318] border border-[#27491F33] rounded-md">
          <Info size={11} className="text-[#6dbf67] flex-shrink-0 mt-0.5" />
          <span className="text-[10px] text-[#6dbf67] leading-[1.5]">
            Layout &amp; style settings are in the <strong>Style tab</strong> of section settings.
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Check TypeScript**
```bash
npx tsc --noEmit 2>&1 | grep FloatingElementEditor
```

- [ ] **Step 4: Commit**
```bash
git add src/components/builder/FloatingElementEditor.tsx
git commit -m "feat(builder): add FloatingElementEditor portal-rendered hover popover (controlled)"
```

---

## Task 4: Update `SectionEditor` — add `embedded` prop

**Files:**
- Modify: `src/components/builder/SectionEditor.tsx`

`SectionEditor` currently has its own header, back button, and internal tab bar (Content / Analytics). When used embedded in `BuilderLeftPanel`, these must be suppressed so the left panel's own header and Content|Style tabs are authoritative.

- [ ] **Step 1: Read SectionEditor.tsx in full**
```bash
cat src/components/builder/SectionEditor.tsx
```

- [ ] **Step 2: Identify the header/tabs/back-button JSX block**

Look for the outermost returned JSX. It will contain:
- A `<div>` with a back button and section name
- An internal tab bar (e.g. `<div className="flex border-b ...">` with Content / Analytics tabs)
- The editor body below

- [ ] **Step 3: Add optional `embedded` prop**

In the Props interface (or wherever props are defined), add:
```typescript
embedded?: boolean;  // when true, suppress header, back-button, and internal tabs
```

**Also make `onClose` optional**, since `BuilderLeftPanel` will pass a no-op:
```typescript
onClose?: () => void;  // was required — make optional
```

- [ ] **Step 4: Wrap the header+tab section in a conditional**

Find the JSX block that renders the internal header (back button + section name) and internal tabs. Wrap it:
```tsx
{!embedded && (
  // existing header + internal tab bar JSX
)}
```

When `embedded=true`, render only the editor body (the form fields). The active tab is determined by the left panel passing the appropriate content.

**Backward compatibility:** When `embedded` is `false` or `undefined`, nothing changes — all existing callers (like `ContextualEditor` and any other usage) continue working exactly as before.

- [ ] **Step 5: Check TypeScript — zero new errors expected**
```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Verify builder still works with no regressions**

Open `http://localhost:5174/ecommerce/builder?siteId=<any-id>`. Click a section. The right sidebar should still show the section editor as before (since nothing in `BuilderPage` has changed yet).

- [ ] **Step 7: Commit**
```bash
git add src/components/builder/SectionEditor.tsx
git commit -m "feat(builder): add embedded prop to SectionEditor to suppress header when used in left panel"
```

---

## Task 5: Create `BuilderLeftPanel`

**Files:**
- Create: `src/components/builder/BuilderLeftPanel.tsx`

The panel content is extracted into a named inner component `PanelContent` so it can be used in both desktop (fixed) and mobile drawer (overlay) modes without duplicating JSX.

- [ ] **Step 1: Read types/builder.ts for the Section interface**
```bash
head -60 src/types/builder.ts
```

- [ ] **Step 2: Create BuilderLeftPanel.tsx**

```tsx
// src/components/builder/BuilderLeftPanel.tsx
import { useState, useCallback } from 'react';
import { Sun, Plus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Section, SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';
import { useBuilderNav } from './hooks/useBuilderNav';
import SectionEditor from './SectionEditor';

// ── Props ──────────────────────────────────────────────────────────────────

interface PanelProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSection: (id: string, data: Record<string, unknown>) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onReorderSection: (id: string, direction: 'up' | 'down') => void;
  onOpenAddSheet: () => void;
  onOpenTheme: () => void;
  businessId: string;
  siteId?: string;
}

interface BuilderLeftPanelProps extends PanelProps {
  // Mobile drawer mode
  isDrawer?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

// ── Inner panel content (shared between desktop and drawer) ────────────────

function PanelContent({
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onReorderSection,
  onOpenAddSheet,
  onOpenTheme,
  businessId,
  siteId,
}: PanelProps) {
  const nav = useBuilderNav();
  const [ssTab, setSsTab] = useState<'content' | 'style'>('content');

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  const handleSelectSection = useCallback((section: Section) => {
    const entry = SECTION_REGISTRY[section.type as SectionType];
    nav.pushSection(section.id, entry?.label ?? section.type);
    onSelectSection(section.id);
    setSsTab('content');
  }, [nav, onSelectSection]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    nav.goTo(index);
    if (index === 0) onSelectSection(null);
  }, [nav, onSelectSection]);

  const viewTitle = nav.current.view === 'outline' ? 'Page outline'
    : nav.current.view === 'section' ? 'Section settings'
    : 'Block settings';

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-hidden">
      {/* Panel title row */}
      <div className="px-3.5 pt-3 pb-0 flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-semibold text-[#999] uppercase tracking-[.6px] flex-1">
          {viewTitle}
        </span>
        <button
          onClick={onOpenTheme}
          title="Theme settings"
          className="w-6 h-6 rounded flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
        >
          <Sun size={13} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3.5 pt-2.5 pb-2 border-b border-[#2a2a2a] flex-shrink-0 min-h-[36px] overflow-hidden">
        {nav.stack.map((frame, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={10} className="text-[#444] flex-shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className={clsx(
                'text-[11px] truncate transition-colors max-w-[100px]',
                i === nav.stack.length - 1
                  ? 'text-[#e8e8e8] font-medium cursor-default'
                  : 'text-[#666] hover:text-[#ccc] cursor-pointer'
              )}
            >
              {i === 0 ? 'Home page' : frame.label}
            </button>
          </span>
        ))}
      </div>

      {/* ── OUTLINE VIEW ── */}
      {nav.current.view === 'outline' && (
        <div className="flex-1 overflow-y-auto py-2">
          {sections.map((section, idx) => {
            const entry = SECTION_REGISTRY[section.type as SectionType];
            const isSelected = selectedSectionId === section.id;
            return (
              <div
                key={section.id}
                className="group cursor-pointer"
                onClick={() => handleSelectSection(section)}
              >
                <div className={clsx(
                  'flex items-center gap-2.5 px-3.5 py-2 transition-colors',
                  'hover:bg-[#242424]',
                  isSelected && 'bg-[#27491F22] border-l-2 border-[#27491F] pl-[calc(0.875rem-2px)]'
                )}>
                  {/* Section icon — Material Icons glyph */}
                  <div className="w-7 h-7 rounded-md bg-[#252525] flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-sm text-[#888]">{entry?.icon ?? 'web'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#d0d0d0] truncate">{entry?.label ?? section.type}</div>
                    <div className="text-[10px] text-[#555] uppercase tracking-[.4px]">{entry?.category ?? 'section'}</div>
                  </div>
                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorderSection(section.id, 'up'); }}
                      disabled={idx === 0}
                      title="Move up"
                      className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#333] disabled:opacity-30 transition-colors"
                    >↑</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorderSection(section.id, 'down'); }}
                      disabled={idx === sections.length - 1}
                      title="Move down"
                      className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#333] disabled:opacity-30 transition-colors"
                    >↓</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                      title="Delete section"
                      className="w-5 h-5 rounded text-[11px] flex items-center justify-center text-[#666] hover:text-red-400 hover:bg-[#333] transition-colors"
                    >×</button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Add section */}
          <button
            onClick={onOpenAddSheet}
            className="mx-3.5 mt-1.5 mb-3 flex items-center gap-2 w-[calc(100%-28px)] px-3 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-[#666] text-xs hover:border-[#444] hover:text-[#999] hover:bg-[#1f1f1f] transition-all"
          >
            <Plus size={13} />
            Add section
          </button>
        </div>
      )}

      {/* ── SECTION SETTINGS VIEW ── */}
      {nav.current.view === 'section' && selectedSection && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section badge */}
          <div className="px-3.5 pt-3 pb-0 flex-shrink-0">
            {(() => {
              const entry = SECTION_REGISTRY[selectedSection.type as SectionType];
              return (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#222] rounded-lg mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#27491F33] flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-base text-[#6dbf67]">{entry?.icon ?? 'web'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#e8e8e8]">{entry?.label ?? selectedSection.type}</div>
                    <div className="text-[10px] text-[#666] uppercase tracking-[.5px]">{entry?.category ?? 'section'}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Content / Style tabs */}
          <div className="flex border-b border-[#2a2a2a] flex-shrink-0 px-3.5">
            {(['content', 'style'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSsTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-center text-xs font-medium capitalize border-b-2 -mb-px transition-all',
                  ssTab === tab
                    ? 'text-[#e8e8e8] border-[#27491F]'
                    : 'text-[#666] border-transparent hover:text-[#ccc]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* SectionEditor rendered in embedded mode — no header, no internal tabs */}
          <div className="flex-1 overflow-y-auto">
            <SectionEditor
              key={`${selectedSection.id}-${ssTab}`}
              section={selectedSection}
              onUpdate={(data) => onUpdateSection(selectedSection.id, data)}
              onClose={() => { nav.goTo(0); onSelectSection(null); }}
              businessId={businessId}
              siteId={siteId}
              embedded={true}
              activeTabOverride={ssTab === 'content' ? 'content' : 'style'}
            />
          </div>
        </div>
      )}

      {/* ── BLOCK SETTINGS VIEW ── */}
      {nav.current.view === 'block' && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <p className="text-xs text-[#666] text-center mt-8">
            Block-level editing coming soon.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Public component (desktop + drawer) ───────────────────────────────────

export default function BuilderLeftPanel({
  isDrawer,
  drawerOpen,
  onDrawerClose,
  ...panelProps
}: BuilderLeftPanelProps) {
  // Desktop mode: fixed 280px left panel
  if (!isDrawer) {
    return (
      <div className="w-[280px] border-r border-[#2a2a2a] flex-shrink-0 h-full overflow-hidden">
        <PanelContent {...panelProps} />
      </div>
    );
  }

  // Mobile drawer mode: full-screen overlay
  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onDrawerClose}
        />
      )}
      {/* Sliding panel */}
      <div
        className={clsx(
          'fixed left-0 top-12 bottom-0 w-[280px] z-50 md:hidden transition-transform duration-200 shadow-2xl',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <PanelContent {...panelProps} />
      </div>
    </>
  );
}
```

**Note:** `SectionEditor` receives two new props: `embedded={true}` and `activeTabOverride`. The `activeTabOverride` prop (`'content' | 'style'`) tells the embedded editor which internal tab to show, since the left panel's own tab bar controls navigation. Add this prop in Task 4 alongside `embedded`. The `key` prop forces a remount when the tab changes, ensuring the editor resets its internal state.

- [ ] **Step 3: Check TypeScript (expect `activeTabOverride` prop error until Task 4 is updated)**
```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Go back to SectionEditor and also add `activeTabOverride?: 'content' | 'style'` to its Props**

Read the file again after Task 4 edits and add this prop. When `activeTabOverride` is set, it overrides the component's own `activeTab` state. Implementation:
```typescript
// In SectionEditor, after existing useState for activeTab:
const resolvedTab = activeTabOverride ?? activeTab;
// Use `resolvedTab` everywhere instead of `activeTab`
```

- [ ] **Step 5: Check TypeScript — zero errors expected**
```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**
```bash
git add src/components/builder/BuilderLeftPanel.tsx src/components/builder/SectionEditor.tsx
git commit -m "feat(builder): add BuilderLeftPanel with PanelContent shared between desktop/drawer modes"
```

---

## Task 6: Update `BuilderToolbar` — Shopify-style dark top bar

**Files:**
- Modify: `src/components/builder/BuilderToolbar.tsx`

- [ ] **Step 1: Read BuilderToolbar.tsx in full**
```bash
cat src/components/builder/BuilderToolbar.tsx
```

- [ ] **Step 2: Identify props to keep and UI to change**

Keep all existing prop callbacks intact (onSave, onPublish, onUndo, onRedo, onBack, etc.). Only change visual layout.

Remove from toolbar UI:
- `showSidebar` toggle button (sidebar is now always-visible left panel)
- Theme / Pages / SEO icon buttons from the toolbar (theme is in left panel header, pages in the page selector dropdown)

New layout (left → right):
```
[← Back] [|] [● SiteName] [Page ▾] [spacer] [🖥|📱|📱] [|] [↩][↪] [Preview] [Publish]
```

Add an optional `onToggleDrawer?: () => void` prop and show a hamburger menu button only on mobile (`md:hidden`).

Key style: `h-12 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-3 gap-2 z-10 flex-shrink-0`

- [ ] **Step 3: Apply targeted edits using the Edit tool**

After reading the file in Step 1, make precise edits:
1. Change outer div height and background to dark theme
2. Reorder items per the layout above
3. Remove sidebar toggle button
4. Keep `onToggleTheme` prop and callback (it's now called by left panel's Sun icon, but keep the prop to avoid breaking the BuilderPage signature)
5. Add `onToggleDrawer?: () => void` prop for mobile hamburger
6. Ensure `siteName` prop renders with green live dot

- [ ] **Step 4: Check TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**
```bash
git add src/components/builder/BuilderToolbar.tsx
git commit -m "feat(builder): redesign BuilderToolbar to Shopify-style dark top bar"
```

---

## Task 7: Update `BuilderCanvas` — hover rings, badges, `onSelectElementWithRect`

**Files:**
- Modify: `src/components/builder/BuilderCanvas.tsx`
- Modify: `src/components/builder/SortableSection.tsx`

- [ ] **Step 1: Read both files in full**
```bash
cat src/components/builder/BuilderCanvas.tsx
cat src/components/builder/SortableSection.tsx
```

- [ ] **Step 2: Add `onSelectElementWithRect` prop to BuilderCanvas**

In `BuilderCanvas`'s Props interface, add:
```typescript
onSelectElementWithRect?: (element: SelectedElement, rect: DOMRect) => void;
```

In the canvas click handler where `data-edit-type` elements are already detected, add:
```typescript
// After existing `onSelectElement(element)` call:
if (onSelectElementWithRect) {
  onSelectElementWithRect(element, (e.target as HTMLElement).getBoundingClientRect());
}
```

Keep calling `onSelectElement` as well so existing callers continue to work.

- [ ] **Step 3: Add hover affordances to SortableSection**

In `SortableSection.tsx`, the outermost returned `<div>` (the section wrapper), add a `group` class and these children:
```tsx
{/* Hover ring overlay */}
<div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-[#27491F]/30 pointer-events-none transition-all z-[5] rounded-[2px]" />

{/* Section chip label */}
<div className="absolute top-0 left-0 bg-[#27491F] text-white text-[10px] font-semibold px-2 py-0.5 rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity z-[15] uppercase tracking-[.4px] pointer-events-none select-none">
  {sectionType}
</div>

{/* Action bar — top right */}
<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[15]">
  <button
    onClick={(e) => { e.stopPropagation(); onSettingsClick?.(); }}
    className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-[#ccc] hover:bg-[#27491F] hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
    title="Section settings"
  >
    <span className="material-icons text-sm">settings</span>
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
    className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-[#ccc] hover:bg-[#27491F] hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
    title="Duplicate"
  >
    <span className="material-icons text-sm">content_copy</span>
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onDelete(); }}
    className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-red-400 hover:bg-red-800 hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
    title="Delete"
  >
    <span className="material-icons text-sm">delete</span>
  </button>
</div>
```

Pass `onSettingsClick` as a new optional prop to `SortableSection` that triggers the left panel's section selection.

- [ ] **Step 4: Add element hover styling via scoped CSS**

In `BuilderCanvas.tsx`, inject a `<style>` tag:
```tsx
<style>{`
  [data-edit-type] { position: relative; }
  [data-edit-type]:hover {
    outline: 1px dashed rgba(39, 73, 31, 0.5);
    outline-offset: 2px;
    cursor: pointer;
  }
`}</style>
```

- [ ] **Step 5: Check TypeScript**
```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**
```bash
git add src/components/builder/BuilderCanvas.tsx src/components/builder/SortableSection.tsx
git commit -m "feat(builder): add hover rings, section chips, action bars, element outline badges to canvas"
```

---

## Task 8: Wire everything in `BuilderPage`

**Files:**
- Modify: `src/pages/ecommerce/BuilderPage.tsx`

This is the final integration task. Three key changes: (1) replace right sidebar with left panel, (2) add floating editor state, (3) keep ThemePanel triggered by left panel's Sun icon.

- [ ] **Step 1: Add new state variables**

Add after existing state declarations:
```typescript
const [showAddSheet, setShowAddSheet] = useState(false);
const [floatAnchorRect, setFloatAnchorRect] = useState<DOMRect | null>(null);
const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
const [drawerOpen, setDrawerOpen] = useState(false);

useEffect(() => {
  const handler = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

- [ ] **Step 2: Add `handleSelectElementWithRect` callback**

```typescript
const handleSelectElementWithRect = useCallback((element: SelectedElement, rect: DOMRect) => {
  setSelectedElement(element);
  setFloatAnchorRect(rect);
}, []);
```

- [ ] **Step 3: Add `handleReorderSectionByDirection` helper**

```typescript
const handleReorderSectionByDirection = useCallback((id: string, dir: 'up' | 'down') => {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const next = [...sections];
  if (dir === 'up' && idx > 0) {
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
  } else if (dir === 'down' && idx < next.length - 1) {
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
  } else return;
  handleReorderSections(next);
}, [sections, handleReorderSections]);
```

- [ ] **Step 4: Remove the entire right sidebar block**

Remove the `{showSidebar && <div className="w-80 border-l ...">...</div>}` block.
Remove `showSidebar` and `setShowSidebar` state (no longer needed since left panel is always visible).

- [ ] **Step 5: Replace the layout with left panel + canvas**

The `<div className="flex flex-1 overflow-hidden">` should now contain:
```tsx
<BuilderLeftPanel
  sections={sections}
  selectedSectionId={selectedSection}
  onSelectSection={handleSelectSection}
  onUpdateSection={handleUpdateSection}
  onDeleteSection={handleDeleteSection}
  onDuplicateSection={handleDuplicateSection}
  onReorderSection={handleReorderSectionByDirection}
  onOpenAddSheet={() => setShowAddSheet(true)}
  onOpenTheme={() => setShowTheme(true)}
  businessId={businessId}
  siteId={siteId ?? undefined}
  isDrawer={isMobile}
  drawerOpen={drawerOpen}
  onDrawerClose={() => setDrawerOpen(false)}
/>

{/* Canvas — full remaining width */}
<div className="flex-1 overflow-auto">
  <BuilderCanvas
    sections={sections}
    selectedSection={selectedSection}
    selectedElement={selectedElement}
    previewMode={previewMode}
    onSelectSection={handleSelectSection}
    onSelectElement={setSelectedElement}
    onSelectElementWithRect={handleSelectElementWithRect}
    onUpdateSection={handleUpdateSection}
    onDeleteSection={handleDeleteSection}
    onReorderSections={handleReorderSections}
    onDuplicateSection={handleDuplicateSection}
    siteId={siteId || undefined}
  />
</div>
```

Keep `ThemePanel` and `SEOPanel` conditional blocks as they are (still triggered by `showTheme` / `showSEO`).

**ThemePanel wiring fix:** `showTheme` was previously toggled by a toolbar button. Now it's toggled by the left panel's Sun icon (`onOpenTheme` prop → `setShowTheme(true)`). The toolbar's `onToggleTheme` prop still exists but is no longer called from the toolbar UI (Task 6 removed that button). Either remove the `onToggleTheme` prop from toolbar or leave it as dead code — both are safe.

- [ ] **Step 6: Add new imports**
```typescript
import BuilderLeftPanel from '../../components/builder/BuilderLeftPanel';
import FloatingElementEditor from '../../components/builder/FloatingElementEditor';
import AddSectionSheet from '../../components/builder/AddSectionSheet';
```

Add `FloatingElementEditor` and `AddSectionSheet` to the render (inside `ThemeProvider`, at the end of the main div, before the toast):
```tsx
<FloatingElementEditor
  element={selectedElement}
  anchorRect={floatAnchorRect}
  section={sections.find((s) => s.id === selectedSection) ?? null}
  onUpdate={(sectionId, data) => handleUpdateSection(sectionId, data as Record<string, unknown>)}
  onClose={() => { setSelectedElement(null); setFloatAnchorRect(null); }}
/>

<AddSectionSheet
  open={showAddSheet}
  onClose={() => setShowAddSheet(false)}
  onAddSection={handleAddSection}
/>
```

- [ ] **Step 7: Pass `onToggleDrawer` to BuilderToolbar (mobile)**
```tsx
<BuilderToolbar
  ...existingProps
  onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
/>
```

- [ ] **Step 8: Full TypeScript check — fix all errors**
```bash
npx tsc --noEmit 2>&1
```

Address every error. Common expected errors:
- `Property 'onSelectElementWithRect' does not exist on type BuilderCanvasProps` → add it in Task 7
- `Property 'embedded' does not exist on type SectionEditorProps` → add it in Task 4
- `Property 'activeTabOverride' does not exist` → add it in Task 4/5
- `Property 'onToggleDrawer' does not exist on BuilderToolbarProps` → add it in Task 6

- [ ] **Step 9: Verify in browser — all 8 scenarios**

1. Left panel visible with section outline ✓
2. Click section → section settings with Content/Style tabs ✓
3. Breadcrumb → click "Home page" → back to outline ✓
4. Click "Add section" button → AddSectionSheet slides from left ✓
5. Canvas section hover → green ring + chip + action bar ✓
6. Canvas element hover → dashed outline ✓
7. Click element → FloatingElementEditor appears near element ✓
8. Ctrl+Z → undo works, floating editor text reflects new value ✓

- [ ] **Step 10: Commit**
```bash
git add src/pages/ecommerce/BuilderPage.tsx
git commit -m "feat(builder): integrate BuilderLeftPanel, FloatingElementEditor, AddSectionSheet into BuilderPage"
```

---

## Task 9: Final cleanup and TypeScript verification

- [ ] **Step 1: Full TypeScript check**
```bash
npx tsc --noEmit 2>&1
```
Expected: zero new errors (pre-existing errors in shipping/warehouse routes are acceptable and unrelated).

- [ ] **Step 2: Mark BuilderSidebar as deprecated (do not delete)**

Add at the top of `src/components/builder/BuilderSidebar.tsx`:
```typescript
/**
 * @deprecated Replaced by AddSectionSheet. Kept for reference.
 * TODO: Remove in a future cleanup PR.
 */
```

- [ ] **Step 3: Remove dead `showSidebar` state from BuilderPage if not already removed**

Search for any remaining references to `showSidebar` in `BuilderPage.tsx`:
```bash
grep -n "showSidebar" src/pages/ecommerce/BuilderPage.tsx
```
Expected: no matches.

- [ ] **Step 4: Final commit**
```bash
git add -A
git commit -m "feat(builder): shopify-style builder UI — left panel, floating editor, add-section sheet, dark toolbar"
```

---

## Critical Invariants (must not break)

1. **All 24 section editors** render inside the new left panel's Content tab via `embedded=true` on `SectionEditor`
2. **Autosave** (3s debounce via `useAutosave`) fires on every `sections` reference change
3. **Undo/redo** (50-entry history via `useUndoRedo`) works via Ctrl+Z/Ctrl+Shift+Z
4. **Publish flow** (`POST /api/sites/:id/publish`) untouched
5. **ThemePanel** accessible via Sun icon in left panel header → `onOpenTheme` → `setShowTheme(true)` in BuilderPage
6. **Multi-page support** (page selector in toolbar) remains functional
7. **FloatingElementEditor** uses controlled state — text updates correctly after undo/redo

## Not In This Plan

- Rewriting individual section editors (HeroEditor, ProductsEditor, etc.)
- Full block-level product item drill-down inside ProductsEditor (foundation via `useBuilderNav.pushBlock` is ready; full UI is a follow-up)
- AI theme generation API
- Public storefront API (Phases A/B — partially implemented separately)
