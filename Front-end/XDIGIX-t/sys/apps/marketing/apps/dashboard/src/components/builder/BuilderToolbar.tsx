import { useState, useRef, useEffect, useCallback } from 'react';
import { Section } from '../../types/builder';
import PreviewModal from './PreviewModal';
import PublishModal from './PublishModal';
import { exportWebsiteToHTML } from '../../utils/exportWebsite';
import type { AutosaveStatus } from '../../hooks/useAutosave';
import type { SitePage } from './PageManager';
import { fetchProducts, type Product } from '../../services/productsService';
import { fetchCollections, type Collection } from '../../services/collectionsService';
import type { LinkedInventoryProduct } from '../../lib/backend-adapter';

/** Preview data passed when selecting a child item (product/collection) */
export type PagePreviewData = {
  /** The parent page type being previewed */
  parentPageType: 'products' | 'collections';
  /** Product data for product page preview */
  product?: Product;
  /** Collection data for collection page preview */
  collection?: Collection;
};

type Props = {
  siteId: string;
  businessId?: string;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  onPreviewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onSave: () => void;
  saving: boolean;
  autosaveStatus?: AutosaveStatus;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  showTheme?: boolean;
  showPages?: boolean;
  onTogglePages?: () => void;
  showSEO?: boolean;
  onToggleSEO?: () => void;
  onBack: () => void;
  onSettings: () => void;
  sections: Section[];
  onPublish: (options: { status: 'draft' | 'published'; customDomain?: string }) => Promise<void>;
  siteName: string;
  currentStatus: 'draft' | 'published';
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleDrawer?: () => void;
  onOpenAddSheet?: () => void;
  onToggleTheme?: () => void;
  pages?: SitePage[];
  currentPageSlug?: string;
  onSelectPage?: (slug: string) => void;
  onSelectPageWithPreview?: (slug: string, previewData: PagePreviewData) => void;
  /** Linked/XDF inventory products (already fetched via useLinkedInventory) */
  linkedProducts?: LinkedInventoryProduct[];
};

const BuilderToolbar = ({
  siteId,
  previewMode,
  onPreviewModeChange,
  onSave,
  saving,
  autosaveStatus = 'idle',
  onBack,
  onSettings,
  sections,
  onPublish,
  siteName,
  currentStatus,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onToggleDrawer,
  onOpenAddSheet,
  onToggleTheme,
  businessId,
  pages = [],
  currentPageSlug = 'home',
  onSelectPage,
  onSelectPageWithPreview,
  linkedProducts = [],
}: Props) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
  const pageSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Chevron sub-navigation state
  const [expandedPage, setExpandedPage] = useState<string | null>(null); // 'products' | 'collections'
  const [childItems, setChildItems] = useState<(Product | Collection)[]>([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const childSearchRef = useRef<HTMLInputElement>(null);

  // Fetch children when a page is expanded via chevron
  const handleChevronClick = useCallback(async (pageSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedPage === pageSlug) {
      setExpandedPage(null);
      setChildItems([]);
      setChildSearch('');
      return;
    }
    setExpandedPage(pageSlug);
    setChildLoading(true);
    setChildSearch('');
    try {
      if (pageSlug === 'products') {
        // Fetch local products
        let localProducts: Product[] = [];
        if (businessId) {
          try {
            localProducts = await fetchProducts(businessId);
          } catch { /* no local products */ }
        }

        // Convert linked/XDF products to Product shape and merge
        const linkedAsProducts: Product[] = linkedProducts.map(p => ({
          id: p.id,
          name: p.name ?? '',
          description: (p as Record<string, unknown>).description as string ?? '',
          category: (p as Record<string, unknown>).category as string ?? '',
          price: (p as Record<string, unknown>).price as number ?? 0,
          sellingPrice: (p as Record<string, unknown>).sellingPrice as number | undefined,
          sku: p.sku ?? '',
          barcode: p.barcode,
          images: (p as Record<string, unknown>).images as string[] | undefined,
          stock: p.stock ?? {},
          sizeBarcodes: p.sizeBarcodes ?? {},
        }));

        // Deduplicate by id — local products take priority
        const localIds = new Set(localProducts.map(p => p.id));
        const uniqueLinked = linkedAsProducts.filter(p => !localIds.has(p.id));
        setChildItems([...localProducts, ...uniqueLinked]);
      } else if (pageSlug === 'collections') {
        if (businessId) {
          const collections = await fetchCollections(businessId);
          setChildItems(collections);
        }
      }
    } catch {
      setChildItems([]);
    } finally {
      setChildLoading(false);
    }
  }, [expandedPage, businessId, linkedProducts]);

  // Focus child search when expanded
  useEffect(() => {
    if (expandedPage) setTimeout(() => childSearchRef.current?.focus(), 100);
  }, [expandedPage]);

  // Close page selector on outside click
  useEffect(() => {
    if (!showPageSelector) return;
    const handleClick = (e: MouseEvent) => {
      if (pageSelectorRef.current && !pageSelectorRef.current.contains(e.target as Node)) {
        setShowPageSelector(false);
        setPageSearch('');
        setExpandedPage(null);
        setChildItems([]);
        setChildSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPageSelector]);

  // Focus search when opened
  useEffect(() => {
    if (showPageSelector) searchInputRef.current?.focus();
  }, [showPageSelector]);

  // Reset expanded page when dropdown closes
  useEffect(() => {
    if (!showPageSelector) {
      setExpandedPage(null);
      setChildItems([]);
      setChildSearch('');
    }
  }, [showPageSelector]);

  const currentPage = pages.find(p => p.slug === currentPageSlug);
  const currentPageIcon = currentPage?.icon || 'description';
  const currentPageName = currentPage?.name || 'Home page';

  // Group pages for the dropdown
  const mainPages = pages.filter(p => p.group === 'main');
  const utilityPages = pages.filter(p => p.group === 'utility');
  const contentPages = pages.filter(p => p.group === 'content');
  const customPages = pages.filter(p => !p.isSystem);

  const filterPages = (list: SitePage[]) =>
    pageSearch ? list.filter(p => p.name.toLowerCase().includes(pageSearch.toLowerCase())) : list;

  return (
    <>
      <div className="h-12 bg-white border-b border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center px-3 gap-2 z-[60] relative flex-shrink-0">
        {/* Hamburger — mobile only */}
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="md:hidden w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded"
            title="Toggle panel"
          >
            <span className="material-icons text-base">menu</span>
          </button>
        )}

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111827] transition-colors flex-shrink-0"
        >
          <span className="material-icons text-sm">arrow_back</span>
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="h-4 w-px bg-[#e5e7eb] flex-shrink-0" />

        {/* Site name with live dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {currentStatus === 'published' && (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-[#111827] max-w-[120px] truncate">{siteName}</span>
        </div>

        {/* Center: page selector + device group */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {/* Page selector dropdown */}
          <div className="relative flex-shrink-0" ref={pageSelectorRef}>
            <button
              type="button"
              onClick={() => setShowPageSelector(v => !v)}
              className="flex items-center gap-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] text-xs rounded-lg px-2.5 py-1.5 border border-[#e5e7eb] transition-colors"
            >
              <span className="material-icons text-sm text-[#6b7280]">{currentPageIcon}</span>
              <span className="font-medium">{currentPageName}</span>
              <span className="material-icons text-sm text-[#9ca3af]">{showPageSelector ? 'expand_less' : 'expand_more'}</span>
            </button>

            {showPageSelector && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-[280px] bg-white rounded-xl shadow-xl border border-[#e5e7eb] z-50 overflow-hidden">
                {/* Expanded child view (products/collections sub-list) */}
                {expandedPage ? (
                  <>
                    {/* Back header */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f3f4f6]">
                      <button
                        type="button"
                        onClick={() => { setExpandedPage(null); setChildItems([]); setChildSearch(''); }}
                        className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
                      >
                        <span className="material-icons text-sm">arrow_back</span>
                      </button>
                      <span className="text-sm font-medium text-[#111827]">
                        {expandedPage === 'products' ? 'Products' : 'Collections'}
                      </span>
                    </div>

                    {/* Child search */}
                    <div className="p-2 border-b border-[#f3f4f6]">
                      <div className="flex items-center gap-2 bg-[#f9fafb] rounded-lg px-2.5 py-1.5 border border-[#e5e7eb] focus-within:border-[#27491F] focus-within:ring-1 focus-within:ring-[#27491F]/20">
                        <span className="material-icons text-sm text-[#9ca3af]">search</span>
                        <input
                          ref={childSearchRef}
                          type="text"
                          value={childSearch}
                          onChange={e => setChildSearch(e.target.value)}
                          placeholder={expandedPage === 'products' ? 'Search products…' : 'Search collections…'}
                          className="flex-1 bg-transparent text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Child items list */}
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {childLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <span className="material-icons text-lg text-[#9ca3af] animate-spin">progress_activity</span>
                        </div>
                      ) : childItems.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[#9ca3af]">
                          No {expandedPage} found
                        </div>
                      ) : (
                        childItems
                          .filter(item => !childSearch || item.name.toLowerCase().includes(childSearch.toLowerCase()))
                          .map(item => {
                            const isProduct = expandedPage === 'products';
                            const product = isProduct ? (item as Product) : undefined;
                            const coll = !isProduct ? (item as Collection) : undefined;
                            const image = isProduct ? product?.images?.[0] : undefined;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  const parentType = expandedPage as 'products' | 'collections';
                                  if (isProduct && product) {
                                    onSelectPageWithPreview?.(parentType, { parentPageType: 'products', product });
                                  } else if (coll) {
                                    onSelectPageWithPreview?.(parentType, { parentPageType: 'collections', collection: coll });
                                  }
                                  setShowPageSelector(false);
                                  setExpandedPage(null);
                                  setChildItems([]);
                                  setChildSearch('');
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-[#374151] hover:bg-[#f9fafb] transition-colors"
                              >
                                {/* Thumbnail */}
                                <div className="w-8 h-8 rounded bg-[#f5f5f5] flex-shrink-0 overflow-hidden flex items-center justify-center">
                                  {image ? (
                                    <img src={image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="material-icons text-sm text-[#d1d5db]">
                                      {isProduct ? 'inventory_2' : 'filter_vintage'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  {isProduct && product?.price != null && (
                                    <p className="text-xs text-[#9ca3af]">
                                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.sellingPrice ?? product.price)}
                                    </p>
                                  )}
                                  {!isProduct && coll?.productCount != null && (
                                    <p className="text-xs text-[#9ca3af]">{coll.productCount} products</p>
                                  )}
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Search */}
                    <div className="p-2 border-b border-[#f3f4f6]">
                      <div className="flex items-center gap-2 bg-[#f9fafb] rounded-lg px-2.5 py-1.5 border border-[#e5e7eb] focus-within:border-[#27491F] focus-within:ring-1 focus-within:ring-[#27491F]/20">
                        <span className="material-icons text-sm text-[#9ca3af]">search</span>
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={pageSearch}
                          onChange={e => setPageSearch(e.target.value)}
                          placeholder="Search online store"
                          className="flex-1 bg-transparent text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Page list */}
                    <div className="max-h-[380px] overflow-y-auto py-1">
                      {/* Main pages */}
                      {filterPages(mainPages).map(page => (
                        <PageSelectorRow
                          key={page.id}
                          page={page}
                          isActive={page.slug === currentPageSlug}
                          onSelect={() => { onSelectPage?.(page.slug); setShowPageSelector(false); setPageSearch(''); }}
                          onChevronClick={page.hasChildren ? (e) => handleChevronClick(page.slug, e) : undefined}
                        />
                      ))}

                      {/* Utility pages (Cart, Checkout) */}
                      {filterPages(utilityPages).length > 0 && (
                        <>
                          <div className="h-px bg-[#f3f4f6] my-1" />
                          {filterPages(utilityPages).map(page => (
                            <PageSelectorRow key={page.id} page={page} isActive={page.slug === currentPageSlug} onSelect={() => { onSelectPage?.(page.slug); setShowPageSelector(false); setPageSearch(''); }} />
                          ))}
                        </>
                      )}

                      {/* Content pages (custom Pages, Blogs) */}
                      {(filterPages(contentPages).length > 0 || filterPages(customPages).length > 0) && (
                        <>
                          <div className="h-px bg-[#f3f4f6] my-1" />
                          {filterPages(contentPages).map(page => (
                            <PageSelectorRow key={page.id} page={page} isActive={page.slug === currentPageSlug} onSelect={() => { onSelectPage?.(page.slug); setShowPageSelector(false); setPageSearch(''); }} />
                          ))}
                          {filterPages(customPages).map(page => (
                            <PageSelectorRow key={page.id} page={page} isActive={page.slug === currentPageSlug} onSelect={() => { onSelectPage?.(page.slug); setShowPageSelector(false); setPageSearch(''); }} />
                          ))}
                        </>
                      )}

                      {/* No results */}
                      {pageSearch && filterPages(pages).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-[#9ca3af]">No pages found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Preview mode */}
          <div className="flex items-center bg-[#f3f4f6] rounded-md overflow-hidden flex-shrink-0">
            {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onPreviewModeChange(mode)}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  previewMode === mode
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                <span className="material-icons text-sm">
                  {mode === 'desktop' ? 'desktop_windows' : mode === 'tablet' ? 'tablet' : 'phone_android'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: autosave + undo/redo + add section + theme + export + settings + save + preview + publish */}
        <div className="flex items-center gap-1">
          {/* Autosave status */}
          {autosaveStatus && autosaveStatus !== 'idle' && (
            <span className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${
              autosaveStatus === 'saving'  ? 'text-blue-400' :
              autosaveStatus === 'pending' ? 'text-[#6b7280]' :
              autosaveStatus === 'saved'   ? 'text-green-500' :
              autosaveStatus === 'error'   ? 'text-red-400'  : 'text-[#6b7280]'
            }`}>
              {autosaveStatus === 'saving'  && <span className="material-icons text-xs animate-spin">progress_activity</span>}
              {autosaveStatus === 'saved'   && <span className="material-icons text-xs">check_circle</span>}
              {autosaveStatus === 'error'   && <span className="material-icons text-xs">warning</span>}
              {autosaveStatus === 'saving'  && 'Saving…'}
              {autosaveStatus === 'pending' && '●'}
              {autosaveStatus === 'saved'   && 'Saved'}
              {autosaveStatus === 'error'   && 'Failed'}
            </span>
          )}

          {/* Undo / Redo */}
          {onUndo && onRedo && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
              >
                <span className="material-icons text-base">undo</span>
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
              >
                <span className="material-icons text-base">redo</span>
              </button>
            </>
          )}

          {/* Add section */}
          <button
            type="button"
            onClick={onOpenAddSheet}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] rounded transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">add_circle_outline</span>
            Add section
          </button>

          {/* Theme */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] rounded transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">light_mode</span>
            Theme
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={() => {
              const html = exportWebsiteToHTML(sections, siteName);
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${siteName.replace(/\s+/g, '-')}.html`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            title="Export as HTML"
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded transition-colors"
          >
            <span className="material-icons text-sm">download</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onSettings}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] rounded transition-colors"
          >
            <span className="material-icons text-sm">settings</span>
          </button>

          {/* Save */}
          <button
            id="save-btn"
            type="button"
            onClick={onSave}
            disabled={saving}
            title="Save"
            className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#111827] disabled:opacity-30 rounded transition-colors"
          >
            <span className="material-icons text-sm">{saving ? 'progress_activity' : 'save'}</span>
          </button>

          {/* Preview */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1 border border-[#e5e7eb] text-[#111827] text-xs px-3 py-1.5 rounded-md hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">preview</span>
            Preview
          </button>

          {/* Publish */}
          <button
            type="button"
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1 bg-[#e8f5e9] text-[#27491F] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#d1e7d3] transition-colors flex-shrink-0"
          >
            <span className="material-icons text-sm">publish</span>
            {currentStatus === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* PreviewModal */}
      <PreviewModal open={showPreview} onClose={() => setShowPreview(false)} sections={sections} siteId={siteId} />

      {/* PublishModal */}
      <PublishModal
        open={showPublish}
        onClose={() => setShowPublish(false)}
        onPublish={onPublish}
        siteId={siteId}
        siteName={siteName}
        currentStatus={currentStatus}
        sections={sections}
      />
    </>
  );
};

/* ── Page selector row ─────────────────────────────────────────── */
const PageSelectorRow = ({
  page,
  isActive,
  onSelect,
  onChevronClick,
}: {
  page: SitePage;
  isActive: boolean;
  onSelect: () => void;
  onChevronClick?: (e: React.MouseEvent) => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
      isActive ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#374151] hover:bg-[#f9fafb]'
    }`}
  >
    <span className={`material-icons text-lg ${isActive ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
      {page.icon || 'description'}
    </span>
    <span className="flex-1 text-sm font-medium truncate">{page.name}</span>
    {page.hasChildren && (
      <span
        role="button"
        tabIndex={-1}
        onClick={onChevronClick}
        className="material-icons text-sm text-[#9ca3af] hover:text-[#111827] hover:bg-[#e5e7eb] rounded p-0.5 transition-colors"
      >
        chevron_right
      </span>
    )}
  </button>
);

export default BuilderToolbar;
