import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { addDomain, isValidDomain } from '../../services/domainService';
import BuilderCanvas from '../../components/builder/BuilderCanvas';
import BuilderToolbar, { type PagePreviewData } from '../../components/builder/BuilderToolbar';
import { Section, SectionType } from '../../types/builder';
import { SelectedElement } from '../../types/elementEditor';
import { getDefaultData, SECTION_REGISTRY } from '../../registry/sectionRegistry';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useAutosave, AutosaveStatus } from '../../hooks/useAutosave';
import { ThemeProvider, SiteTheme } from '../../contexts/ThemeContext';
import ThemePanel from '../../components/builder/ThemePanel';
import PageManager, { SitePage, SYSTEM_PAGES } from '../../components/builder/PageManager';
import SEOPanel from '../../components/builder/SEOPanel';
import BuilderLeftPanel, { type BlockEditTarget } from '../../components/builder/BuilderLeftPanel';
import AddSectionSheet from '../../components/builder/AddSectionSheet';
import { fetchProducts, type Product } from '../../services/productsService';
import { fetchCollections } from '../../services/collectionsService';
import { useLinkedInventory } from '../../hooks/useLinkedInventory';

/* ── Backend API helper ─────────────────────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BACKEND_URL as string | undefined)
  ?.replace(/\/api\/?$/, '') ?? '';

function getToken() {
  return localStorage.getItem('backend_access_token')
    || localStorage.getItem('warehouse_access_token') || '';
}

async function sitesApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/sites${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Strip placeholder unsplash URLs from loaded section data ──── */
function stripUnsplashUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.includes('images.unsplash.com') ? '' : value;
  }
  if (Array.isArray(value)) {
    return value.map(stripUnsplashUrls);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripUnsplashUrls(v);
    }
    return out;
  }
  return value;
}

const BuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const siteId = searchParams.get('siteId');

  // Linked inventory (XDF / warehouse-linked products)
  const { data: linkedInventory } = useLinkedInventory(!!businessId);

  /** Convert linked inventory products → Product[] shape for display */
  const linkedProductsAsProducts = useCallback((): Product[] => {
    if (!linkedInventory?.products?.length) return [];
    return linkedInventory.products.map((p) => ({
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
  }, [linkedInventory]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showTheme, setShowTheme] = useState(false);
  // TODO: Pages and SEO panels need new trigger UI (toolbar buttons removed in toolbar redesign).
  // Currently unreachable — wire to BuilderLeftPanel header or a toolbar kebab menu in a follow-up.
  const [showSEO, setShowSEO] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [initialTheme, setInitialTheme] = useState<Partial<SiteTheme>>({});
  const [pages, setPages] = useState<SitePage[]>([...SYSTEM_PAGES]);
  const [currentPageSlug, setCurrentPageSlug] = useState('home');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [siteName, setSiteName] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [initialSections, setInitialSections] = useState<Section[]>([]);
  /** Per-page section storage: maps pageSlug → Section[] */
  const pageSectionsMapRef = useRef<Record<string, Section[]>>({});
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [floatAnchorRect, setFloatAnchorRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editBlockTarget, setEditBlockTarget] = useState<BlockEditTarget | null>(null);
  
  // Clear selected element when changing sections
  const handleSelectSection = useCallback((sectionId: string | null) => {
    setSelectedSection(sectionId);
    setSelectedElement(null);
    setFloatAnchorRect(null);
  }, []);
  
  // Toast notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  
  // Show toast helper
  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ type, title, message });
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  }, []);
  
  // Undo/Redo hook
  const { sections, updateSections, undo, redo, canUndo, canRedo } = useUndoRedo(initialSections);
  
  // Keep a ref to the latest sections for use in callbacks
  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    const loadSite = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }

      try {
        const data = await sitesApi<Record<string, any>>('GET', `/${siteId}`);
        // Normalise sections: backend may store payload in `data` (new builder)
        // or `content` (legacy builder / old saves).  Always expose as `data`.
        const loadedSections = (data.sections || []).map((s: any) => {
          const sData = s.data && Object.keys(s.data).length > 0 ? { ...s.data } : { ...(s.content ?? {}) };
          // Strip legacy color fields from sections that now use schemes only
          if (s.type === 'banner' || s.type === 'navbar' || s.type === 'countdown' || s.type === 'footer' || s.type === 'cta' || s.type === 'newsletter') {
            delete sData.backgroundColor;
            delete sData.textColor;
          }
          // Ensure banner/countdown get a dark scheme if no scheme is set
          if (s.type === 'banner' && !sData.color_scheme) {
            sData.color_scheme = 'scheme-4';
          }
          if (s.type === 'countdown' && !sData.color_scheme) {
            sData.color_scheme = 'scheme-4';
          }
          return { ...s, data: sData };
        });
        console.log('[BuilderPage] Loaded sections from API:', loadedSections.length, 'sections');
        console.log('[BuilderPage] Loaded section types:', loadedSections.map((s: any) => s.type));
        setSiteName(data.name || 'Untitled Site');
        setCurrentStatus((data.status as 'draft' | 'published') || 'draft');
        if (data.settings?.theme) {
          // Backend stores all theme values as strings — deserialize back to proper types
          const raw = data.settings.theme as Record<string, string>;
          const parsed: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(raw)) {
            // Try parsing JSON arrays/objects first (e.g. colorSchemes)
            if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
              try { parsed[k] = JSON.parse(v); continue; } catch { /* not JSON, fall through */ }
            }
            // Already an array/object (not stringified)
            if (typeof v !== 'string') { parsed[k] = v; continue; }
            if (v === 'true') parsed[k] = true;
            else if (v === 'false') parsed[k] = false;
            else if (v !== '' && !isNaN(Number(v)) && !/^#/.test(v) && !/^https?:/.test(v)) parsed[k] = Number(v);
            else parsed[k] = v;
          }
          setInitialTheme(parsed as Partial<SiteTheme>);
        }
        if (data.pages?.length) {
          // Merge saved custom pages with system pages (system always present)
          const savedPages = data.pages as SitePage[];
          const customPages = savedPages.filter((p: SitePage) => !SYSTEM_PAGES.some(sp => sp.id === p.id));
          setPages([...SYSTEM_PAGES, ...customPages]);
        }

        // Load per-page sections if available
        const hasPageSections = data.pageSections && typeof data.pageSections === 'object';
        if (hasPageSections) {
          pageSectionsMapRef.current = data.pageSections as Record<string, Section[]>;
        }

        // Prefer pageSections.home over top-level sections (autosave may have
        // overwritten top-level sections while editing a non-home page)
        const homeSectionsFromMap = hasPageSections
          ? (pageSectionsMapRef.current['home'] as Section[] | undefined)
          : undefined;
        const effectiveSections = (homeSectionsFromMap && homeSectionsFromMap.length > 0)
          ? homeSectionsFromMap
          : loadedSections;

        if (effectiveSections.length === 0) {
          // Shopify Dawn-style default theme — clean, minimal storefront
          const defaultSections: Section[] = [
            {
              id: 'banner-1',
              type: 'banner',
              order: 0,
              data: {
                text: 'Welcome to our store',
                link: '', linkText: '',
                dismissible: false, enableMarquee: false, marqueeSpeed: 30,
                announcements: [],
                color_scheme: 'scheme-4',
              },
            },
            {
              id: 'navbar-1',
              type: 'navbar',
              order: 1,
              data: {
                logo: '', logoText: siteName || 'xdigix',
                menuItems: [
                  { label: 'Home', link: '/' },
                  { label: 'Catalog', link: '/catalog' },
                  { label: 'Contact', link: '/contact' },
                ],
                showSearch: true, searchPlaceholder: 'Search...',
                showCart: true, cartCount: 0,
                showWishlist: false, wishlistCount: 0,
                showUserIcon: true,
                sticky: true,
                color_scheme: 'scheme-1',
              },
            },
            {
              id: 'hero-1',
              type: 'hero',
              order: 2,
              data: {
                backgroundImage: '',
                backgroundColor: '#121212',
                textColor: '#ffffff',
                image: '',
                image_overlay_opacity: 40,
                image_height: 'large',
                desktop_content_position: 'bottom-center',
                desktop_content_alignment: 'center',
                show_text_box: false,
                isCarousel: false,
                blocks: [
                  { type: 'heading', text: 'Browse our latest products', heading_size: 'h1' },
                  { type: 'text', text: 'Discover amazing products and deals' },
                  { type: 'buttons', button_label_1: 'Shop all', button_link_1: '/catalog', button_style_secondary_1: false, button_label_2: '', button_link_2: '#', button_style_secondary_2: true },
                ],
              },
            },
            {
              id: 'features-1',
              type: 'features',
              order: 3,
              data: {
                title: 'Multicolumn',
                heading_size: 'h1',
                columns_desktop: 3,
                column_alignment: 'center',
                image_width: 'full',
                image_ratio: 'adapt',
                padding_top: 36,
                padding_bottom: 36,
                items: [
                  { title: 'Free Shipping', text: 'Enjoy free shipping on all orders over $50. We deliver to your doorstep with care and speed.', image: '', icon: '', link_label: '', link: '' },
                  { title: '24/7 Support', text: 'Our dedicated support team is available around the clock to help you with any questions or concerns.', image: '', icon: '', link_label: '', link: '' },
                  { title: 'Easy Returns', text: 'Not satisfied? Return any item within 30 days for a full refund — no questions asked.', image: '', icon: '', link_label: '', link: '' },
                ],
              },
            },
            {
              id: 'products-1',
              type: 'products',
              order: 4,
              data: {
                title: 'Featured products',
                heading_size: 'h1',
                columns_desktop: 4,
                show_view_all: true,
                image_ratio: 'adapt',
                show_vendor: false,
                show_rating: false,
                selectedProducts: [
                  { id: 'demo-1', name: 'Classic Leather Bag', price: 89.99, image: '' },
                  { id: 'demo-2', name: 'Minimalist Watch', price: 149.99, image: '' },
                  { id: 'demo-3', name: 'Wireless Headphones', price: 59.99, image: '' },
                  { id: 'demo-4', name: 'Designer Sunglasses', price: 124.99, image: '' },
                ],
                showPrice: true,
                showAddToCart: true,
                padding_top: 80,
                padding_bottom: 80,
              },
            },
            {
              id: 'about-1',
              type: 'about',
              order: 5,
              data: {
                title: 'Image with text',
                content: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
                image: '',
                height: 'adapt',
                desktop_image_width: 'medium',
                layout: 'image_first',
                desktop_content_position: 'middle',
                desktop_content_alignment: 'left',
                padding_top: 36,
                padding_bottom: 36,
                blocks: [],
              },
            },
            {
              id: 'newsletter-1',
              type: 'newsletter',
              order: 6,
              data: {
                title: 'Subscribe to our emails',
                subtitle: 'Be the first to know about new collections and exclusive offers.',
                heading_size: 'h1',
                placeholder: 'Email',
                buttonText: 'Subscribe',
                full_width: true,
                backgroundColor: '#FFFFFF',
                successMessage: 'Thank you for subscribing!',
                padding_top: 40,
                padding_bottom: 52,
              },
            },
            {
              id: 'footer-1',
              type: 'footer',
              order: 7,
              data: {
                layout: 'minimal',
                logoText: siteName || 'xdigix', logo: '',
                tagline: '',
                copyrightText: `© ${new Date().getFullYear()}, ${siteName || 'xdigix'}`,
                columns: [
                  { title: 'Quick links', links: [{ label: 'Search', link: '/search' }] },
                ],
                policyLinks: [
                  { label: 'Privacy policy', link: '/privacy' },
                  { label: 'Terms of service', link: '/terms' },
                  { label: 'Refund policy', link: '/refund' },
                ],
                socialLinks: [],
                showNewsletter: false,
                newsletter_enable: false,
                show_social: true,
                payment_enable: true,
                show_policy: true,
                backgroundColor: '#ffffff', textColor: '#121212',
                padding_top: 36,
                padding_bottom: 36,
              },
            },
          ];
          pageSectionsMapRef.current['home'] = defaultSections;
          setInitialSections(defaultSections);
        } else {
          const cleaned = effectiveSections.map((s: Section) => ({
            ...s,
            data: stripUnsplashUrls(s.data) as Record<string, unknown>,
          }));
          pageSectionsMapRef.current['home'] = cleaned;
          setInitialSections(cleaned);
        }
      } catch (error) {
        console.error('[BuilderPage] Failed to load site:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSite();
  }, [siteId]);

  const handleSave = useCallback(async () => {
    if (!siteId) return;

    setSaving(true);
    try {
      const currentSections = sectionsRef.current;
      console.log('[BuilderPage] Saving sections:', currentSections.length, 'sections');
      console.log('[BuilderPage] Section types being saved:', currentSections.map((s: any) => s.type));

      // Keep the pageSections map up to date with current page's sections
      pageSectionsMapRef.current[currentPageSlug] = currentSections;

      // Top-level `sections` is always the home page for backward compatibility
      const homeSections = pageSectionsMapRef.current['home'] || currentSections;
      await sitesApi('PATCH', `/${siteId}`, {
        sections: homeSections,
        pageSections: pageSectionsMapRef.current,
      });

      console.log('[BuilderPage] Save successful via /api/sites');
      setAutosaveStatus('saved');
      showToast('success', '✓ Changes Saved', 'Your website changes have been saved.');
      setTimeout(() => setAutosaveStatus('idle'), 3000);
    } catch (error) {
      console.error('[BuilderPage] Failed to save:', error);
      setAutosaveStatus('error');
      showToast('error', 'Save Failed', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [siteId, currentPageSlug, showToast]);

  // Stable getter for pageSections map (used by autosave to persist page context)
  const getPageSections = useCallback(() => pageSectionsMapRef.current, []);

  // Autosave — fires 3 s after every real edit (sections reference change)
  const { triggerSave } = useAutosave(siteId, sections, {
    onStatusChange: setAutosaveStatus,
    onError: (err) => showToast('error', '⚠ Auto-save Failed', err.message),
    apiBase: `${API_BASE}/api`,
    getToken,
    getPageSections,
    currentPageSlug,
  });

  /** Save theme token changes to the backend.
   *  The backend Zod schema expects all theme values as strings,
   *  so we serialize numbers/booleans to string before sending. */
  const handleThemeSave = useCallback(async (theme: SiteTheme) => {
    if (!siteId) return;
    try {
      const serialized: Record<string, string> = {};
      for (const [k, v] of Object.entries(theme)) {
        // Arrays/objects (like colorSchemes) must be JSON-stringified
        if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
          serialized[k] = JSON.stringify(v);
        } else {
          serialized[k] = String(v);
        }
      }
      await sitesApi('PATCH', `/${siteId}`, { settings: { theme: serialized } });
    } catch (err) {
      console.error('[BuilderPage] Theme save failed:', err);
    }
  }, [siteId]);

  /** Save pages array to backend */
  const savePages = useCallback(async (newPages: SitePage[]) => {
    if (!siteId) return;
    try { await sitesApi('PATCH', `/${siteId}`, { pages: newPages }); }
    catch (err) { console.error('[BuilderPage] Failed to save pages:', err); }
  }, [siteId]);

  const handleAddPage = useCallback((name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'page';
    const uniqueSlug = pages.some(p => p.slug === slug)
      ? `${slug}-${Date.now()}`
      : slug;
    const newPage: SitePage = { id: `page-${Date.now()}`, slug: uniqueSlug, name, type: 'page', order: pages.length, icon: 'description', group: 'content' };
    const updated = [...pages, newPage];
    setPages(updated);
    setCurrentPageSlug(uniqueSlug);
    void savePages(updated);
  }, [pages, savePages]);

  const handleRenamePage = useCallback((id: string, name: string) => {
    const updated = pages.map(p => p.id === id ? { ...p, name } : p);
    setPages(updated);
    void savePages(updated);
  }, [pages, savePages]);

  const handleDeletePage = useCallback((id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page || page.isSystem) return;
    const updated = pages.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i }));
    setPages(updated);
    if (currentPageSlug === page.slug) setCurrentPageSlug('home');
    void savePages(updated);
  }, [pages, currentPageSlug, savePages]);

  const handleReorderPages = useCallback((newPages: SitePage[]) => {
    setPages(newPages);
    void savePages(newPages);
  }, [savePages]);

  const handleUpdatePageSeo = useCallback((seo: NonNullable<SitePage['seo']>) => {
    const updated = pages.map(p => p.slug === currentPageSlug ? { ...p, seo } : p);
    setPages(updated);
    void savePages(updated);
  }, [pages, currentPageSlug, savePages]);

  const currentPage = pages.find(p => p.slug === currentPageSlug) ?? pages[0];

  /** Generate default locked sections for a page type */
  const getDefaultPageSections = useCallback((pageSlug: string): Section[] => {
    const page = pages.find(p => p.slug === pageSlug);
    const pageType = page?.type || 'page';
    const storeName = siteName || 'xdigix';

    // Shared header/footer — always present on all pages
    const header: Section[] = [
      { id: `${pageSlug}-banner`, type: 'banner', order: 0, locked: true, data: { text: 'Welcome to our store', link: '', linkText: '', dismissible: false, enableMarquee: false, marqueeSpeed: 30, announcements: [], color_scheme: 'scheme-4' } },
      { id: `${pageSlug}-navbar`, type: 'navbar', order: 1, locked: true, data: { logo: '', logoText: storeName, menuItems: [{ label: 'Home', link: '/' }, { label: 'Catalog', link: '/catalog' }, { label: 'Contact', link: '/contact' }], showSearch: true, showCart: true, color_scheme: 'scheme-1' } },
    ];
    const footer: Section[] = [
      { id: `${pageSlug}-footer`, type: 'footer', order: 99, locked: true, data: { layout: 'minimal', logoText: storeName, logo: '', tagline: '', copyrightText: `\u00A9 ${new Date().getFullYear()}, ${storeName}`, columns: [{ title: 'Quick links', links: [{ label: 'Search', link: '/search' }] }], policyLinks: [], socialLinks: [], color_scheme: 'scheme-1', padding_top: 36, padding_bottom: 36 } },
    ];

    // Page-specific middle sections
    let middle: Section[] = [];
    switch (pageType) {
      case 'home':
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, data: { image: '', image_overlay_opacity: 40, image_height: 'large', desktop_content_position: 'bottom-center', desktop_content_alignment: 'center', show_text_box: false, blocks: [{ type: 'heading', text: 'Browse our latest products', heading_size: 'h1' }, { type: 'text', text: 'Discover amazing products and deals' }, { type: 'buttons', button_label_1: 'Shop all', button_link_1: '/catalog', button_style_1: 'solid', button_label_2: '', button_link_2: '', button_style_2: 'outline' }] } },
          { id: `${pageSlug}-features`, type: 'features', order: 3, data: { title: 'Multicolumn', heading_size: 'h1', columns_desktop: 3, column_alignment: 'center', image_width: 'full', image_ratio: 'adapt', padding_top: 36, padding_bottom: 36, items: [{ title: 'Free Shipping', text: 'Enjoy free shipping on all orders over $50.', image: '' }, { title: '24/7 Support', text: 'Our dedicated support team is available around the clock.', image: '' }, { title: 'Easy Returns', text: 'Return any item within 30 days for a full refund.', image: '' }] } },
          { id: `${pageSlug}-products`, type: 'products', order: 4, data: { title: 'Featured products', heading_size: 'h1', columns_desktop: 4, show_view_all: true, image_ratio: 'adapt', show_vendor: false, show_rating: false, selectedProducts: [], showPrice: true, showAddToCart: true, padding_top: 80, padding_bottom: 80 } },
          { id: `${pageSlug}-about`, type: 'about', order: 5, data: { title: 'Image with text', content: 'Pair text with an image to focus on your chosen product, collection, or blog post.', image: '', height: 'adapt', desktop_image_width: 'medium', layout: 'image_first', desktop_content_position: 'middle', desktop_content_alignment: 'left', padding_top: 36, padding_bottom: 36, blocks: [] } },
          { id: `${pageSlug}-newsletter`, type: 'newsletter', order: 6, data: { title: 'Subscribe to our emails', subtitle: 'Be the first to know about new collections and exclusive offers.', heading_size: 'h1', placeholder: 'Email', buttonText: 'Subscribe', full_width: true, padding_top: 40, padding_bottom: 52 } },
        ];
        break;
      case 'products':
        // Products page = product detail template (single product view)
        middle = [
          { id: `${pageSlug}-productInfo`, type: 'productInfo', order: 2, locked: true, data: { product_name: 'Sample Product', product_vendor: 'Vendor', product_price: 99.99, product_compare_price: 0, product_description: 'This is a sample product description.', product_images: [], product_available: true, product_sku: 'SKU-001', product_inventory: 25, media_width: 'medium', padding_top: 36, padding_bottom: 36, color_scheme: 'scheme-1', blocks: [{ type: 'vendor' }, { type: 'title' }, { type: 'price' }, { type: 'quantity_selector' }, { type: 'buy_buttons' }, { type: 'description' }, { type: 'share' }] } },
        ];
        break;
      case 'collections':
        // Collections page = view all products in a grid
        middle = [
          { id: `${pageSlug}-products`, type: 'products', order: 2, locked: true, data: { title: 'All Products', subtitle: 'Browse our collection', layout: 'grid', columns: 4, showPrice: true, showAddToCart: true, selectedProducts: [], padding_top: 36, padding_bottom: 36, color_scheme: 'scheme-1' } },
        ];
        break;
      case 'collection-list':
        middle = [
          { id: `${pageSlug}-collections`, type: 'collections', order: 2, locked: true, data: { title: 'Collections', heading_size: 'h1', image_ratio: 'square', columns_desktop: 3, show_view_all: false, items: [], padding_top: 36, padding_bottom: 36, color_scheme: 'scheme-1' } },
        ];
        break;
      case 'cart':
        middle = [
          { id: `${pageSlug}-cart`, type: 'cart', order: 2, locked: true, data: { title: 'Your cart', empty_message: 'Your cart is empty', empty_button_text: 'Continue shopping', empty_button_link: '/', show_notes: true, show_shipping: true, preview_mode: 'with_items', padding_top: 36, padding_bottom: 36, color_scheme: 'scheme-1' } },
        ];
        break;
      case 'checkout':
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, locked: true, data: { title: 'Checkout', subtitle: 'Complete your purchase', image_height: 'small', desktop_content_position: 'middle-center', desktop_content_alignment: 'center', blocks: [{ type: 'heading', text: 'Checkout', heading_size: 'h1' }, { type: 'text', text: 'Complete your purchase securely.' }] } },
        ];
        break;
      case 'search':
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, locked: true, data: { title: 'Search', subtitle: 'Find what you\'re looking for', image_height: 'small', desktop_content_position: 'middle-center', desktop_content_alignment: 'center', blocks: [{ type: 'heading', text: 'Search our store', heading_size: 'h1' }] } },
        ];
        break;
      case 'gift-card':
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, locked: true, data: { title: 'Gift Cards', subtitle: 'Give the gift of choice', image_height: 'medium', desktop_content_position: 'middle-center', desktop_content_alignment: 'center', blocks: [{ type: 'heading', text: 'Gift Cards', heading_size: 'h0' }, { type: 'text', text: 'Give the gift of choice with our gift cards.' }, { type: 'buttons', button_label_1: 'Buy Gift Card', button_link_1: '#' }] } },
        ];
        break;
      case 'password':
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, locked: true, data: { title: 'Opening soon', subtitle: 'Be the first to know when we launch.', image_height: 'large', desktop_content_position: 'middle-center', desktop_content_alignment: 'center', blocks: [{ type: 'heading', text: 'Opening soon', heading_size: 'hxl' }, { type: 'text', text: 'Be the first to know when we launch.' }, { type: 'email_signup', placeholder: 'Email', button_label: '' }] } },
          { id: `${pageSlug}-newsletter`, type: 'newsletter', order: 3, locked: true, hidden: true, data: { title: 'Subscribe', subtitle: 'Be the first to know when we launch.', placeholder: 'Email', buttonText: 'Notify me', padding_top: 0, padding_bottom: 0, color_scheme: 'scheme-1' } },
        ];
        break;
      default:
        // Custom pages get a basic hero
        middle = [
          { id: `${pageSlug}-hero`, type: 'hero', order: 2, locked: true, data: { title: page?.name || 'Page', subtitle: '', image_height: 'small', desktop_content_position: 'middle-center', desktop_content_alignment: 'center', blocks: [{ type: 'heading', text: page?.name || 'Page', heading_size: 'h1' }] } },
        ];
        break;
    }
    return [...header, ...middle, ...footer];
  }, [pages, siteName]);

  /**
   * Auto-populate product/collection sections with real store data.
   * Merges local inventory products with linked/XDF warehouse products.
   * Called when switching to products or collections pages so the user
   * sees their actual inventory instead of placeholder data.
   */
  /** Fetch all products: local + linked/XDF inventory merged */
  const fetchAllProducts = useCallback(async (): Promise<Product[]> => {
    let allProducts: Product[] = [];
    if (businessId) {
      try { allProducts = await fetchProducts(businessId); } catch { /* no local */ }
    }
    const linked = linkedProductsAsProducts();
    if (linked.length > 0) {
      const localIds = new Set(allProducts.map(p => p.id));
      allProducts = [...allProducts, ...linked.filter(p => !localIds.has(p.id))];
    }
    return allProducts;
  }, [businessId, linkedProductsAsProducts]);

  /** Convert Product[] → selectedProducts shape for the products grid section */
  const toSelectedProducts = (products: Product[]) =>
    products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      sellingPrice: p.sellingPrice,
      image: p.images?.[0] || '',
      description: p.description || '',
      onSale: p.sellingPrice != null && p.sellingPrice < p.price,
      salePrice: p.sellingPrice,
      compareAtPrice: p.sellingPrice != null && p.sellingPrice < p.price ? p.price : undefined,
    }));

  /**
   * Auto-populate product/collection sections with real store data.
   * Merges local inventory products with linked/XDF warehouse products.
   */
  const injectStoreData = useCallback(async (slug: string, secs: Section[]): Promise<Section[]> => {
    const page = pages.find(p => p.slug === slug);
    const pageType = page?.type || '';

    // Collections page = products grid (view all products)
    if (pageType === 'collections') {
      try {
        const allProducts = await fetchAllProducts();
        const selectedProducts = toSelectedProducts(allProducts);
        return secs.map(s =>
          s.type === 'products'
            ? { ...s, data: { ...s.data, selectedProducts } }
            : s
        );
      } catch { /* ignore */ }
    }

    // Collection-list page = collections grid
    if (pageType === 'collection-list') {
      if (!businessId) return secs;
      try {
        const collections = await fetchCollections(businessId);
        const selectedCollections = collections
          .filter(c => c.status === 'active')
          .map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            productCount: c.productCount || c.productIds?.length || 0,
            image: '',
          }));
        return secs.map(s =>
          s.type === 'collections'
            ? { ...s, data: { ...s.data, selectedCollections } }
            : s
        );
      } catch { /* ignore */ }
    }

    // Products page = product detail (productInfo) — inject first product as preview if empty
    if (pageType === 'products') {
      const hasProductData = secs.some(s => s.type === 'productInfo' && s.data.product_images?.length > 0);
      if (!hasProductData) {
        try {
          const allProducts = await fetchAllProducts();
          if (allProducts.length > 0) {
            const p = allProducts[0];
            return secs.map(s => {
              if (s.type === 'productInfo') {
                return {
                  ...s,
                  data: {
                    ...s.data,
                    product_name: p.name,
                    product_vendor: p.category || 'Vendor',
                    product_price: p.sellingPrice ?? p.price,
                    product_compare_price: p.sellingPrice && p.sellingPrice < p.price ? p.price : 0,
                    product_description: p.description || s.data.product_description || '',
                    product_images: p.images || [],
                    product_sku: p.sku || 'SKU-001',
                    product_available: true,
                  },
                };
              }
              return s;
            });
          }
        } catch { /* ignore */ }
      }
    }

    return secs;
  }, [pages, businessId, fetchAllProducts]);

  /** Switch to a different page — save current sections, load target page sections */
  const handleSwitchPage = useCallback(async (slug: string) => {
    // Save current page's sections into the map (even if re-selecting same page)
    pageSectionsMapRef.current[currentPageSlug] = sectionsRef.current;
    // If selecting the same page, just ensure the left panel shows the outline
    if (slug === currentPageSlug) return;
    // Load target page's sections (generate defaults if never visited)
    let targetSections = pageSectionsMapRef.current[slug];
    if (!targetSections || targetSections.length === 0) {
      targetSections = getDefaultPageSections(slug);
      pageSectionsMapRef.current[slug] = targetSections;
    }
    // Inject real store products/collections into the sections
    targetSections = await injectStoreData(slug, targetSections);
    pageSectionsMapRef.current[slug] = targetSections;

    setSelectedSection(null);
    setCurrentPageSlug(slug);
    setInitialSections(targetSections);
    // Save map to backend
    if (siteId) {
      void sitesApi('PATCH', `/${siteId}`, { pageSections: pageSectionsMapRef.current }).catch(() => {});
    }
  }, [currentPageSlug, siteId, getDefaultPageSections, injectStoreData]);

  /** Switch to a page with product/collection preview data injected into the section */
  const handleSelectPageWithPreview = useCallback(async (parentSlug: string, previewData: PagePreviewData) => {
    const slug = parentSlug;
    // Save current page sections
    pageSectionsMapRef.current[currentPageSlug] = sectionsRef.current;

    // Load or generate target page sections
    let targetSections = pageSectionsMapRef.current[slug];
    if (!targetSections || targetSections.length === 0) {
      targetSections = getDefaultPageSections(slug);
      pageSectionsMapRef.current[slug] = targetSections;
    }

    // Inject product preview data into the productInfo section
    if (previewData.parentPageType === 'products' && previewData.product) {
      const p = previewData.product;
      targetSections = targetSections.map(s => {
        if (s.type === 'productInfo') {
          return {
            ...s,
            data: {
              ...s.data,
              product_name: p.name,
              product_vendor: p.category || 'Vendor',
              product_price: p.sellingPrice ?? p.price,
              product_compare_price: p.sellingPrice && p.sellingPrice < p.price ? p.price : 0,
              product_description: p.description || s.data.product_description || '',
              product_images: p.images || [],
              product_sku: p.sku || 'SKU-001',
              product_available: true,
            },
          };
        }
        return s;
      });
    }

    // Inject collection data — show that collection's products in the grid
    if (previewData.parentPageType === 'collections' && previewData.collection) {
      const col = previewData.collection;
      try {
        // Fetch all products and filter by collection's productIds
        const allProducts = await fetchAllProducts();
        const collProductIds = new Set(col.productIds || []);
        const collProducts = collProductIds.size > 0
          ? allProducts.filter(p => collProductIds.has(p.id))
          : allProducts; // If no productIds, show all (smart collection fallback)
        const selectedProducts = toSelectedProducts(collProducts);
        targetSections = targetSections.map(s =>
          s.type === 'products'
            ? { ...s, data: { ...s.data, title: col.name, selectedProducts } }
            : s
        );
      } catch {
        // Fallback: just update the title
        targetSections = targetSections.map(s =>
          s.type === 'products'
            ? { ...s, data: { ...s.data, title: col.name } }
            : s
        );
      }
    }

    // Also inject real store data for any remaining empty sections
    targetSections = await injectStoreData(slug, targetSections);

    pageSectionsMapRef.current[slug] = targetSections;
    setSelectedSection(null);
    setCurrentPageSlug(slug);
    setInitialSections(targetSections);

    if (siteId) {
      void sitesApi('PATCH', `/${siteId}`, { pageSections: pageSectionsMapRef.current }).catch(() => {});
    }
  }, [currentPageSlug, siteId, getDefaultPageSections, injectStoreData, fetchAllProducts]);

  /** Toggle section visibility (hide/show) */
  const handleToggleSectionVisibility = useCallback((sectionId: string) => {
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, hidden: !s.hidden } : s
    );
    updateSections(updated);
  }, [sections, updateSections]);

  const handleAddSection = useCallback((type: SectionType, initialData?: Record<string, any>) => {
    const defaultData = getDefaultSectionData(type);
    // Merge initialData with defaultData (initialData takes priority)
    const mergedData = initialData ? { ...defaultData, ...initialData } : defaultData;
    console.log(`[BuilderPage] Adding section type: ${type}`, mergedData);
    
    const newSection: Section = {
      id: `${type}-${Date.now()}`,
      type,
      order: sections.length,
      data: mergedData
    };
    
    console.log('[BuilderPage] New section created:', JSON.stringify(newSection, null, 2));
    updateSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  }, [sections, updateSections]);

  const handleUpdateSection = useCallback((sectionId: string, data: any) => {
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        // Check if this is a full section object (from ContextualEditor)
        if (data.id && data.type && data.data) {
          return { ...section, data: data.data, style: data.style || section.style };
        }
        // Check if this is a style update
        if (data._style !== undefined) {
          return { ...section, style: data._style, data: { ...section.data } };
        }
        // Regular data update
        return { ...section, data: { ...section.data, ...data } };
      }
      return section;
    });
    updateSections(updatedSections);
  }, [sections, updateSections]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    setPendingDeleteId(sectionId);
  }, []);

  const confirmDeleteSection = useCallback(() => {
    if (!pendingDeleteId) return;
    const filtered = sections.filter((s) => s.id !== pendingDeleteId);
    const reordered = filtered.map((section, index) => ({ ...section, order: index }));
    updateSections(reordered);
    if (selectedSection === pendingDeleteId) {
      setSelectedSection(null);
    }
    setPendingDeleteId(null);
  }, [pendingDeleteId, sections, selectedSection, updateSections]);

  const handleReorderSections = useCallback((newSections: Section[]) => {
    updateSections(newSections.map((section, index) => ({ ...section, order: index })));
  }, [updateSections]);

  const handleSelectElementWithRect = useCallback((element: SelectedElement, rect: DOMRect) => {
    setSelectedElement(element);
    setFloatAnchorRect(rect);
  }, []);

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

  const handleDuplicateSection = useCallback((sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      const newSection: Section = {
        ...section,
        id: `${section.type}-${Date.now()}`,
        order: sections.length
      };
      updateSections([...sections, newSection]);
      setSelectedSection(newSection.id);
    }
  }, [sections, updateSections]);

  // ── Block-level edit / delete / add from canvas ──────────────────────
  // dataKey is now passed explicitly from each section component via BlockWrapper,
  // so handlers always know exactly which array in section.data to operate on.

  const handleEditBlock = useCallback((sectionId: string, dataKey: string, blockIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Auto-migrate legacy data for Hero-like sections that use 'blocks' dataKey
    const d = section.data as Record<string, any>;
    if (dataKey === 'blocks' && (!d.blocks || d.blocks.length === 0)) {
      const migratedBlocks: Record<string, any>[] = [];
      if (d.title) migratedBlocks.push({ type: 'heading', text: d.title, heading_size: d.heading_size || 'h1' });
      if (d.subtitle || d.content) migratedBlocks.push({ type: 'text', text: d.subtitle || d.content || '' });
      if (d.buttonText) migratedBlocks.push({ type: 'buttons', button_label_1: d.buttonText, button_link_1: d.buttonLink || '#', button_style_secondary_1: false, button_label_2: d.secondaryButtonText || '', button_link_2: d.secondaryButtonLink || '#', button_style_secondary_2: true });
      if (migratedBlocks.length > 0) {
        handleUpdateSection(sectionId, { ...d, blocks: migratedBlocks } as Record<string, unknown>);
      }
    }
    setSelectedSection(sectionId);
    requestAnimationFrame(() => setEditBlockTarget({ sectionId, dataKey, blockIndex }));
  }, [sections, handleUpdateSection]);

  const handleDeleteBlock = useCallback((sectionId: string, dataKey: string, blockIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const sData = section.data as Record<string, any>;
    const arr = [...(sData[dataKey] ?? [])];
    if (blockIndex < 0 || blockIndex >= arr.length) return;
    arr.splice(blockIndex, 1);
    handleUpdateSection(sectionId, { ...sData, [dataKey]: arr } as Record<string, unknown>);
  }, [sections, handleUpdateSection]);

  const handleAddBlock = useCallback((sectionId: string, dataKey: string, blockData: Record<string, unknown>) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const sData = section.data as Record<string, any>;
    const arr = [...(sData[dataKey] ?? [])];
    arr.push(blockData);
    handleUpdateSection(sectionId, { ...sData, [dataKey]: arr } as Record<string, unknown>);
  }, [sections, handleUpdateSection]);

  const handlePublish = useCallback(async (options: { status: 'draft' | 'published'; customDomain?: string }) => {
    if (!siteId) return;

    try {
      const currentSections = sectionsRef.current;
      console.log('[BuilderPage] Publishing with sections:', currentSections.length, 'sections');

      // Optional: connect a NEW custom domain
      const rawDomain = options.customDomain?.trim();
      const shouldConnectDomain = options.status === 'published' && !!rawDomain;
      if (shouldConnectDomain && rawDomain && businessId) {
        const cleanDomain = rawDomain
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, '')
          .replace(/^www\./, '');

        if (!isValidDomain(cleanDomain)) {
          throw new Error('Please enter a valid domain (e.g., mystore.com or shop.example.com).');
        }

        const connectResult = await addDomain(cleanDomain, businessId, siteId);
        if (!connectResult.success) {
          throw new Error(connectResult.error || 'Failed to connect domain. Please try again.');
        }
      }

      // Save latest sections + optional customDomain, then publish/unpublish atomically
      // Ensure pageSections map is up to date before publishing
      pageSectionsMapRef.current[currentPageSlug] = currentSections;
      const homeSections = pageSectionsMapRef.current['home'] || currentSections;
      const patchBody: Record<string, unknown> = {
        sections: homeSections,
        pageSections: pageSectionsMapRef.current,
      };
      if (shouldConnectDomain && rawDomain) {
        patchBody.customDomain = rawDomain
          .toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '');
      }
      await sitesApi('PATCH', `/${siteId}`, patchBody);

      if (options.status === 'published') {
        // Atomic: unpublish all others + publish this one server-side
        await sitesApi('POST', `/${siteId}/publish`);
        setCurrentStatus('published');
        showToast(
          'success',
          '🎉 Website Published!',
          shouldConnectDomain
            ? 'Your website is now live! Domain connected — finish DNS setup in E-commerce → Custom Domains.'
            : 'Your website is now live! Changes are visible to your visitors.',
        );
      } else {
        await sitesApi('POST', `/${siteId}/unpublish`);
        setCurrentStatus('draft');
        showToast('info', 'Draft Saved', "Website saved as draft. Publish when you're ready to go live.");
      }
    } catch (error) {
      console.error('[BuilderPage] Failed to publish:', error);
      throw error instanceof Error ? error : new Error('Failed to publish website. Please try again.');
    }
  }, [businessId, siteId, currentPageSlug, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S or Cmd+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (loading) {
    return <FullScreenLoader message="Loading website builder..." />;
  }

  if (!siteId) {
    return (
      <div className="flex items-center justify-center h-screen bg-base">
        <div className="text-center">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">web</span>
          <p className="text-lg font-medium text-primary mb-2">No Site Selected</p>
          <p className="text-sm text-madas-text/70 mb-6">Please select a site from the website builder</p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="rounded-lg bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors"
          >
            Go to Website Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider initialTheme={initialTheme}>
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      {/* Top Toolbar */}
      <BuilderToolbar
        siteId={siteId}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        onSave={handleSave}
        saving={saving}
        autosaveStatus={autosaveStatus}
        onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
        showTheme={showTheme}
        onToggleTheme={() => setShowTheme((prev) => !prev)}
        showPages={showPages}
        onTogglePages={() => setShowPages((prev) => !prev)}
        showSEO={showSEO}
        onToggleSEO={() => setShowSEO((prev) => !prev)}
        onBack={() => navigate('/ecommerce/website-builder')}
        onSettings={() => navigate(`/ecommerce/website-settings?siteId=${siteId}`)}
        sections={sections}
        onPublish={handlePublish}
        siteName={siteName}
        currentStatus={currentStatus}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenAddSheet={() => setShowAddSheet(true)}
        pages={pages}
        currentPageSlug={currentPageSlug}
        onSelectPage={handleSwitchPage}
        businessId={businessId}
        onSelectPageWithPreview={handleSelectPageWithPreview}
        linkedProducts={linkedInventory?.products ?? []}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Pages Panel — left side */}
        {showPages && (
          <div className="w-64 border-r border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
            <PageManager
              pages={pages}
              currentSlug={currentPageSlug}
              onSelectPage={setCurrentPageSlug}
              onAddPage={handleAddPage}
              onRenamePage={handleRenamePage}
              onDeletePage={handleDeletePage}
              onReorderPages={handleReorderPages}
            />
          </div>
        )}

        <BuilderLeftPanel
          sections={sections}
          selectedSectionId={selectedSection}
          onSelectSection={handleSelectSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onToggleSectionVisibility={handleToggleSectionVisibility}
          onDuplicateSection={handleDuplicateSection}
          onReorderSection={handleReorderSectionByDirection}
          onReorderSections={handleReorderSections}
          onOpenAddSheet={() => setShowAddSheet(true)}
          onOpenTheme={() => setShowTheme(true)}
          businessId={businessId ?? ''}
          siteId={siteId ?? undefined}
          isDrawer={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          editBlockTarget={editBlockTarget}
          onEditBlockTargetConsumed={() => setEditBlockTarget(null)}
        />

        {/* Main Canvas */}
        <div className="flex-1 overflow-hidden">
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
            onEditBlock={handleEditBlock}
            onDeleteBlock={handleDeleteBlock}
            onAddBlock={handleAddBlock}
          />
        </div>

        {/* Theme Panel — slides in from the right when showTheme is true */}
        {showTheme && (
          <div className="w-[340px] border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
            <ThemePanel
              onClose={() => setShowTheme(false)}
              onSave={handleThemeSave}
            />
          </div>
        )}

        {/* SEO Panel — per-page SEO settings */}
        {showSEO && currentPage && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
            <SEOPanel
              page={currentPage}
              siteName={siteName}
              onUpdate={handleUpdatePageSeo}
              onClose={() => setShowSEO(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="h-7 bg-[#1a1a1a] border-t border-[#2a2a2a] flex items-center px-3 gap-4 text-[11px] text-[#888] flex-shrink-0 select-none">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            autosaveStatus === 'saved' ? 'bg-green-500' :
            autosaveStatus === 'saving' ? 'bg-blue-400 animate-pulse' :
            autosaveStatus === 'error' ? 'bg-red-400' : 'bg-[#555]'
          }`} />
          {autosaveStatus === 'saving' ? 'Saving…' :
           autosaveStatus === 'saved' ? `Auto-saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
           autosaveStatus === 'error' ? 'Save failed' : 'Ready'}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-icons text-[11px]">
            {previewMode === 'desktop' ? 'desktop_windows' : previewMode === 'tablet' ? 'tablet' : 'phone_android'}
          </span>
          {previewMode === 'desktop' ? 'Desktop 980px' : previewMode === 'tablet' ? 'Tablet 768px' : 'Mobile 375px'}
        </span>
        <span>{sections.length} section{sections.length !== 1 ? 's' : ''} · {currentPageSlug === 'home' ? 'Home' : currentPageSlug}</span>
        <span className="ml-auto text-[#555] tracking-wide">XDIGIX Builder v2</span>
      </div>

      {/* FloatingElementEditor removed — all editing done via left panel settings */}

      {/* Add section sheet — slides in from left */}
      <AddSectionSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAddSection={handleAddSection}
      />

      {/* Toast Notification */}
      {showNotification && notification && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl p-4 shadow-2xl max-w-md animate-slide-up border',
          notification.type === 'success' && 'bg-green-50 border-green-200',
          notification.type === 'error' && 'bg-red-50 border-red-200',
          notification.type === 'info' && 'bg-blue-50 border-blue-200'
        )}>
          <span className={clsx(
            'material-icons text-2xl',
            notification.type === 'success' && 'text-green-600',
            notification.type === 'error' && 'text-red-600',
            notification.type === 'info' && 'text-blue-600'
          )}>
            {notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}
          </span>
          <div className="flex-1">
            <p className={clsx(
              'font-semibold text-base',
              notification.type === 'success' && 'text-green-800',
              notification.type === 'error' && 'text-red-800',
              notification.type === 'info' && 'text-blue-800'
            )}>
              {notification.title}
            </p>
            <p className={clsx(
              'text-sm mt-1',
              notification.type === 'success' && 'text-green-700',
              notification.type === 'error' && 'text-red-700',
              notification.type === 'info' && 'text-blue-700'
            )}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className={clsx(
              'hover:opacity-70 transition-opacity p-1 rounded-lg',
              notification.type === 'success' && 'text-green-600 hover:bg-green-100',
              notification.type === 'error' && 'text-red-600 hover:bg-red-100',
              notification.type === 'info' && 'text-blue-600 hover:bg-blue-100'
            )}
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
      )}
    </div>

    {/* Delete confirmation popup */}
    {pendingDeleteId && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setPendingDeleteId(null)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-[#111827]">Delete section?</h3>
          <p className="text-sm text-[#6b7280]">Are you sure you want to delete this section? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setPendingDeleteId(null)} className="px-4 py-2 text-sm text-[#6b7280] hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={confirmDeleteSection} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Delete</button>
          </div>
        </div>
      </div>
    )}
    </ThemeProvider>
  );
};

/* ── Default section data ────────────────────────────────────────────────
   Delegated to the section registry.  The registry is the single source of
   truth for default data; this thin wrapper preserves backward compatibility
   with the existing call site (line ~150).
───────────────────────────────────────────────────────────────────────── */
function getDefaultSectionData(type: SectionType): Record<string, unknown> {
  return getDefaultData(type);
}

export default BuilderPage;
