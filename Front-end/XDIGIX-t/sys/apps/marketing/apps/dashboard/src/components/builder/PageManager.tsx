import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ── Types ──────────────────────────────────────────────────────── */
export type PageType =
  | 'home'
  | 'products'
  | 'product'
  | 'collections'
  | 'collection-list'
  | 'gift-card'
  | 'cart'
  | 'checkout'
  | 'page'
  | 'blog'
  | 'blog-post'
  | 'search'
  | 'password';

export interface SitePage {
  id: string;
  slug: string;
  name: string;
  type: PageType;
  /** System pages can't be deleted */
  isSystem?: boolean;
  /** Pages with sub-templates (e.g., Products → individual product) */
  hasChildren?: boolean;
  icon?: string;
  order?: number;
  group?: 'main' | 'utility' | 'content';
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
    canonical?: string;
  };
}

/** Default system pages — always present, can't be deleted */
export const SYSTEM_PAGES: SitePage[] = [
  { id: 'home',            slug: 'home',             name: 'Home page',        type: 'home',            isSystem: true, icon: 'home',             order: 0,  group: 'main' },
  { id: 'products',        slug: 'products',         name: 'Products',         type: 'products',        isSystem: true, icon: 'sell',             order: 1,  group: 'main',    hasChildren: true },
  { id: 'collections',     slug: 'collections',      name: 'Collections',      type: 'collections',     isSystem: true, icon: 'filter_vintage',   order: 2,  group: 'main',    hasChildren: true },
  { id: 'collection-list', slug: 'collection-list',  name: 'Collections list', type: 'collection-list', isSystem: true, icon: 'format_list_bulleted', order: 3, group: 'main' },
  { id: 'gift-card',       slug: 'gift-card',        name: 'Gift card',        type: 'gift-card',       isSystem: true, icon: 'card_giftcard',    order: 4,  group: 'main' },
  { id: 'cart',            slug: 'cart',              name: 'Cart',             type: 'cart',            isSystem: true, icon: 'shopping_bag',     order: 10, group: 'utility' },
  { id: 'checkout',        slug: 'checkout',          name: 'Checkout',         type: 'checkout',        isSystem: true, icon: 'shopping_cart',    order: 11, group: 'utility' },
  { id: 'search',          slug: 'search',            name: 'Search',           type: 'search',          isSystem: true, icon: 'search',           order: 30, group: 'utility' },
  { id: 'password',        slug: 'password',          name: 'Password',         type: 'password',        isSystem: true, icon: 'lock',             order: 31, group: 'utility' },
];

interface Props {
  pages: SitePage[];
  currentSlug: string;
  onSelectPage: (slug: string) => void;
  onAddPage: (name: string) => void;
  onRenamePage: (id: string, name: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (pages: SitePage[]) => void;
}

/* ── Helpers ────────────────────────────────────────────────────── */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
}

/* ── Sortable page row ──────────────────────────────────────────── */
const SortablePageRow = ({
  page,
  isActive,
  isHome,
  isSystem,
  onSelect,
  onRename,
  onDelete,
}: {
  page: SitePage;
  isActive: boolean;
  isHome: boolean;
  isSystem: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(page.name);

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== page.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      {/* Icon for system pages, drag handle for custom pages */}
      {page.icon ? (
        <span className={`material-icons text-lg ${isActive ? 'text-primary' : 'text-gray-400'}`}>{page.icon}</span>
      ) : !isSystem ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="material-icons text-sm">drag_handle</span>
        </button>
      ) : (
        <span className="w-5" />
      )}

      {/* Page name / rename input */}
      <div className="flex-1 min-w-0" onClick={onSelect}>
        {editing ? (
          <input
            autoFocus
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm border border-primary/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        ) : (
          <span className="text-sm font-medium truncate block">{page.name}</span>
        )}
        <span className="text-xs text-gray-400 truncate block">/{page.slug}</span>
      </div>

      {/* Actions — hidden for system pages */}
      {!isSystem && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditing(true); setNameValue(page.name); }}
            className="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-100"
            title="Rename page"
          >
            <span className="material-icons text-sm">edit</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
            title="Delete page"
          >
            <span className="material-icons text-sm">delete_outline</span>
          </button>
        </div>
      )}
      {page.hasChildren && (
        <span className="material-icons text-sm text-gray-400 flex-shrink-0">chevron_right</span>
      )}
    </div>
  );
};

/* ── PageManager ────────────────────────────────────────────────── */
const PageManager = ({
  pages,
  currentSlug,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onReorderPages,
}: Props) => {
  const [newPageName, setNewPageName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex((p) => p.id === active.id);
    const newIdx = pages.findIndex((p) => p.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onReorderPages(arrayMove(pages, oldIdx, newIdx).map((p, i) => ({ ...p, order: i })));
    }
  }, [pages, onReorderPages]);

  const handleAddPage = () => {
    const name = newPageName.trim();
    if (!name) return;
    onAddPage(name);
    setNewPageName('');
    setShowAdd(false);
  };

  const sorted = [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-lg">pages</span>
            <h2 className="text-sm font-semibold text-gray-800">Pages</h2>
            <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">{pages.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Add page"
          >
            <span className="material-icons text-base">add</span>
          </button>
        </div>

        {/* Add page inline form */}
        {showAdd && (
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              type="text"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPage(); if (e.key === 'Escape') { setShowAdd(false); setNewPageName(''); } }}
              placeholder="Page name…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleAddPage}
              disabled={!newPageName.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-[#1f3c19] disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        )}
        {newPageName && showAdd && (
          <p className="text-xs text-gray-400 mt-1">Slug: /{slugify(newPageName)}</p>
        )}
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {sorted.map((page) => (
              <SortablePageRow
                key={page.id}
                page={page}
                isActive={page.slug === currentSlug}
                isHome={page.slug === 'home'}
                isSystem={!!page.isSystem}
                onSelect={() => onSelectPage(page.slug)}
                onRename={(name) => onRenamePage(page.id, name)}
                onDelete={() => {
                  if (confirm(`Delete page "${page.name}"? This will remove all its sections.`)) {
                    onDeletePage(page.id);
                  }
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default PageManager;
