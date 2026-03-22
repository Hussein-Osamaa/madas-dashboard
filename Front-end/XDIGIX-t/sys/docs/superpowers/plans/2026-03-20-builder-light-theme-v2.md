# Builder Light Theme (Mockup v2) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the builder UI from dark theme to light Shopify-style theme matching the mockup v2 at `sys/.mockups/builder-mockup.html`.

**Architecture:** Pure CSS/class changes across 4 builder components. No logic changes. The mockup uses a clean light UI with white surfaces, `#e5e7eb` borders, green `#27491F` accent, and `#e9ebee` canvas background.

**Tech Stack:** React, Tailwind CSS, Material Icons

---

### Design Tokens (from mockup v2 CSS vars)

| Token | Value | Usage |
|---|---|---|
| `--surface` | `#ffffff` | Panel bg, toolbar bg, canvas frame |
| `--surface-2` | `#f9fafb` | Secondary surfaces |
| `--surface-3` | `#f3f4f6` | Hover states, device group bg |
| `--border` | `#e5e7eb` | All borders |
| `--text-primary` | `#111827` | Primary text |
| `--text-secondary` | `#6b7280` | Secondary text, icons |
| `--text-tertiary` | `#9ca3af` | Muted text, labels |
| `--accent` | `#27491F` | Selected states, save btn, section labels |
| `--accent-light` | `#e8f0e6` | Accent hover bg |
| `--canvas-bg` | `#e9ebee` | Canvas area background |

---

### Task 1: BuilderToolbar — dark to light

**Files:** `src/components/builder/BuilderToolbar.tsx`

- [ ] **Step 1: Replace toolbar container classes**

Replace `bg-[#1a1a1a] border-b border-[#2a2a2a]` with `bg-white border-b border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,.06)]`

- [ ] **Step 2: Update all text/icon colors**

| Old class | New class |
|---|---|
| `text-[#888]` | `text-[#6b7280]` |
| `hover:text-[#ccc]` | `hover:text-[#111827]` |
| `text-[#e8e8e8]` | `text-[#111827]` |
| `text-[#555]` | `text-[#6b7280]` |
| `text-[#666]` | `text-[#6b7280]` |
| `text-[#ccc]` | `text-[#111827]` |

- [ ] **Step 3: Update dividers, device group, page selector**

| Element | Old | New |
|---|---|---|
| Dividers | `bg-[#333]` | `bg-[#e5e7eb]` |
| Device group wrapper | `bg-[#252525]` | `bg-[#f3f4f6]` |
| Active device btn | `bg-[#333] text-[#e8e8e8]` | `bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,.06)]` |
| Page select | `bg-[#252525] text-[#555] border-[#333]` | `bg-[#f3f4f6] text-[#111827] border-[#e5e7eb]` |

- [ ] **Step 4: Update action buttons**

| Element | Old | New |
|---|---|---|
| Undo/redo/export/settings | `text-[#666] hover:text-[#ccc]` | `text-[#6b7280] hover:text-[#111827]` |
| Preview btn | `border-[#333] text-[#ccc] hover:bg-[#252525]` | `border-[#e5e7eb] text-[#111827] hover:bg-[#f3f4f6]` |
| Save btn (green) | keep `bg-[#27491F]` (matches mockup) | no change |
| Publish btn | keep `bg-[#27491F]` | add `bg-[#e8f5e9] text-[#27491F]` matching mockup |

- [ ] **Step 5: Add "Add section" and "Theme" buttons to toolbar right**

Per mockup, toolbar has explicit "Add section" and "Theme" text buttons between undo/redo and save. Add:
```tsx
<button className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] rounded transition-colors" onClick={onOpenAddSheet}>
  <span className="material-icons text-sm">add_circle_outline</span>
  Add section
</button>
<button className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] rounded transition-colors" onClick={onToggleTheme}>
  <span className="material-icons text-sm">light_mode</span>
  Theme
</button>
```
Add `onOpenAddSheet` and `onToggleTheme` to Props (they already exist but may not be wired to toolbar).

- [ ] **Step 6: Move page selector + device group to center**

Wrap page selector and device group in a centered flex container with `flex-1 justify-center`.

- [ ] **Step 7: Commit**

---

### Task 2: BuilderLeftPanel — dark to light

**Files:** `src/components/builder/BuilderLeftPanel.tsx`

- [ ] **Step 1: Update PanelContent root container**

`bg-[#1a1a1a]` → `bg-white`

- [ ] **Step 2: Update all panel text/icon colors**

| Old | New |
|---|---|
| `text-[#999]` | `text-[#9ca3af]` |
| `text-[#666]` | `text-[#6b7280]` |
| `text-[#ccc]` | `text-[#111827]` |
| `text-[#e8e8e8]` | `text-[#111827]` |
| `text-[#d0d0d0]` | `text-[#111827]` |
| `text-[#555]` | `text-[#9ca3af]` |
| `text-[#888]` | `text-[#6b7280]` |
| `text-[#444]` | `text-[#9ca3af]` |

- [ ] **Step 3: Update borders**

`border-[#2a2a2a]` → `border-[#e5e7eb]`

- [ ] **Step 4: Update backgrounds**

| Element | Old | New |
|---|---|---|
| Icon boxes | `bg-[#252525]` | `bg-[#f3f4f6]` |
| Section badge | `bg-[#222]` | `bg-[#f9fafb]` |
| Icon bg in badge | `bg-[#27491F33]` | `bg-[#e8f0e6]` |
| Icon color in badge | `text-[#6dbf67]` | `text-[#27491F]` |
| Selected outline row | `bg-[#27491F22]` | `bg-[#e8f0e6]` |
| Hover state | `hover:bg-[#242424]` | `hover:bg-[#f3f4f6]` |
| Hover actions bg | `hover:bg-[#333]` | `hover:bg-[#f3f4f6]` |

- [ ] **Step 5: Update theme button and add-section button**

| Element | Old | New |
|---|---|---|
| Theme btn hover | `hover:bg-[#2a2a2a]` | `hover:bg-[#f3f4f6]` |
| Add section border | `border-[#2a2a2a] hover:border-[#444] hover:bg-[#1f1f1f]` | `border-[#e5e7eb] hover:border-[#27491F] hover:bg-[#e8f0e6]` |
| Add section text | `text-[#666] hover:text-[#999]` | `text-[#27491F]` |

- [ ] **Step 6: Update tab styling**

| Tab state | Old | New |
|---|---|---|
| Active tab | `text-[#e8e8e8] border-[#27491F]` | `text-[#27491F] border-[#27491F]` |
| Inactive tab | `text-[#666] hover:text-[#ccc]` | `text-[#6b7280] hover:text-[#111827]` |

- [ ] **Step 7: Update desktop panel width and border**

`w-[280px] border-r border-[#2a2a2a]` → `w-[300px] border-r border-[#e5e7eb]`

- [ ] **Step 8: Commit**

---

### Task 3: SortableSection — dark to light

**Files:** `src/components/builder/SortableSection.tsx`

- [ ] **Step 1: Update hover ring**

`group-hover:ring-[#27491F]/30` → `group-hover:border-2 group-hover:border-[#27491F]`

Actually, use mockup pattern: replace ring overlay with border approach:
```tsx
<div className="absolute inset-0 border-2 border-transparent group-hover:border-[#27491F] pointer-events-none transition-all z-[10] rounded-[2px]" />
```
For selected state, add: when `isSelected`, always show border.

- [ ] **Step 2: Update section chip label**

Keep green accent bg (`bg-[#27491F]`). The mockup matches the current green label. Just ensure it matches:
- Position: `top-0 left-0`
- Border radius: `rounded-br` (bottom-right only)
- Font: `text-[10px] font-semibold`

- [ ] **Step 3: Update action buttons — dark to light**

Replace dark action buttons with light glassmorphism:
```tsx
<button className="w-7 h-7 rounded bg-white/90 backdrop-blur text-[#6b7280] hover:text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center justify-center transition-colors" />
```
For danger (delete): `hover:text-red-500`

- [ ] **Step 4: Add selected state border**

When `isSelected` is true, the border overlay should be always visible (not just on hover):
```tsx
<div className={clsx(
  "absolute inset-0 border-2 pointer-events-none transition-all z-[10] rounded-[2px]",
  isSelected ? "border-[#27491F] shadow-[inset_0_0_0_1px_#27491F]" : "border-transparent group-hover:border-[#27491F]"
)} />
```

- [ ] **Step 5: Commit**

---

### Task 4: Canvas area — dark to light

**Files:** `src/pages/ecommerce/BuilderPage.tsx`, `src/components/builder/BuilderCanvas.tsx`

- [ ] **Step 1: Update canvas wrapper in BuilderPage**

The canvas container `<div className="flex-1 overflow-auto">` should get the mockup's canvas background:
```tsx
<div className="flex-1 overflow-auto bg-[#e9ebee]">
```

- [ ] **Step 2: Update BuilderCanvas wrapper**

Read `BuilderCanvas.tsx` to find the outer wrapper div. Add canvas frame styling per mockup:
- The canvas content should be wrapped in a white frame with rounded corners and shadow
- `bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,.14)] max-w-[1100px] mx-auto my-6 overflow-hidden`

- [ ] **Step 3: Update hover edit CSS**

In `BuilderCanvas.tsx`, the global style tag has `[data-preview-mode] [data-edit-type]:hover` styles. Update:
- `outline: 1px dashed rgba(39,73,31,0.5)` → keep (already green accent)
- `outline-offset: 2px` → keep

- [ ] **Step 4: Commit**

---

### Task 5: AddSectionSheet — dark to light

**Files:** `src/components/builder/AddSectionSheet.tsx`

- [ ] **Step 1: Read AddSectionSheet and update dark classes to light**

The sheet should match mockup: white background, light borders, green accent for active tab.

- [ ] **Step 2: Commit**

---

### Task 6: FloatingElementEditor — dark to light

**Files:** `src/components/builder/FloatingElementEditor.tsx`

- [ ] **Step 1: Read FloatingElementEditor and update dark classes to light**

Match mockup: white bg, `#f9fafb` header, light borders, green accent dot.

- [ ] **Step 2: Commit**

---

### Task 7: Verify and screenshot

- [ ] **Step 1: Run TypeScript check**
- [ ] **Step 2: Take screenshot via preview tools**
- [ ] **Step 3: Compare with mockup and fix any mismatches**
