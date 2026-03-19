import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { addDomain, isValidDomain } from '../../services/domainService';
import BuilderCanvas from '../../components/builder/BuilderCanvas';
import BuilderToolbar from '../../components/builder/BuilderToolbar';
import { Section, SectionType } from '../../types/builder';
import { SelectedElement } from '../../types/elementEditor';
import { getDefaultData } from '../../registry/sectionRegistry';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useAutosave, AutosaveStatus } from '../../hooks/useAutosave';
import { ThemeProvider, SiteTheme } from '../../contexts/ThemeContext';
import ThemePanel from '../../components/builder/ThemePanel';
import PageManager, { SitePage } from '../../components/builder/PageManager';
import SEOPanel from '../../components/builder/SEOPanel';
import BuilderLeftPanel from '../../components/builder/BuilderLeftPanel';
import FloatingElementEditor from '../../components/builder/FloatingElementEditor';
import AddSectionSheet from '../../components/builder/AddSectionSheet';

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

const BuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const siteId = searchParams.get('siteId');
  
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
  const [pages, setPages] = useState<SitePage[]>([
    { id: 'home', slug: 'home', name: 'Home', order: 0 }
  ]);
  const [currentPageSlug, setCurrentPageSlug] = useState('home');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [siteName, setSiteName] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [initialSections, setInitialSections] = useState<Section[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [floatAnchorRect, setFloatAnchorRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
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
        const loadedSections = (data.sections || []).map((s: any) => ({
          ...s,
          data: s.data && Object.keys(s.data).length > 0 ? s.data : (s.content ?? {}),
        }));
        console.log('[BuilderPage] Loaded sections from API:', loadedSections.length, 'sections');
        console.log('[BuilderPage] Loaded section types:', loadedSections.map((s: any) => s.type));
        setSiteName(data.name || 'Untitled Site');
        setCurrentStatus((data.status as 'draft' | 'published') || 'draft');
        if (data.settings?.theme) {
          setInitialTheme(data.settings.theme as Partial<SiteTheme>);
        }
        if (data.pages?.length) {
          setPages(data.pages as SitePage[]);
        }

        if (loadedSections.length === 0) {
          const defaultSections: Section[] = [
            {
              id: 'hero-1',
              type: 'hero',
              order: 0,
              data: {
                title: 'Welcome to Our Store',
                subtitle: 'Discover amazing products',
                buttonText: 'Shop Now',
                buttonLink: '#',
                backgroundImage: '',
                backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
                textColor: '#FFFFFF',
              },
            },
          ];
          setInitialSections(defaultSections);
        } else {
          setInitialSections(loadedSections);
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

      await sitesApi('PATCH', `/${siteId}`, { sections: currentSections });

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
  }, [siteId, showToast]);

  // Autosave — fires 3 s after every real edit (sections reference change)
  const { triggerSave } = useAutosave(siteId, sections, {
    onStatusChange: setAutosaveStatus,
    onError: (err) => showToast('error', '⚠ Auto-save Failed', err.message),
    apiBase: `${API_BASE}/api`,
    getToken,
  });

  /** Save theme token changes to the backend */
  const handleThemeSave = useCallback(async (theme: SiteTheme) => {
    if (!siteId) return;
    try {
      await sitesApi('PATCH', `/${siteId}`, { settings: { theme } });
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
    const newPage: SitePage = { id: `page-${Date.now()}`, slug: uniqueSlug, name, order: pages.length };
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
    if (!page || page.slug === 'home') return;
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
    if (confirm('Are you sure you want to delete this section?')) {
      const filtered = sections.filter((s) => s.id !== sectionId);
      // Reorder remaining sections
      const reordered = filtered.map((section, index) => ({ ...section, order: index }));
      updateSections(reordered);
      if (selectedSection === sectionId) {
        setSelectedSection(null);
      }
    }
  }, [sections, selectedSection, updateSections]);

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
      const patchBody: Record<string, unknown> = { sections: currentSections };
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
  }, [businessId, siteId, showToast]);

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
          onDuplicateSection={handleDuplicateSection}
          onReorderSection={handleReorderSectionByDirection}
          onOpenAddSheet={() => setShowAddSheet(true)}
          onOpenTheme={() => setShowTheme(true)}
          businessId={businessId ?? ''}
          siteId={siteId ?? undefined}
          isDrawer={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />

        {/* Main Canvas */}
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

        {/* Theme Panel — slides in from the right when showTheme is true */}
        {showTheme && (
          <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
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

      {/* Floating element editor — portal-rendered, anchored to clicked canvas element */}
      <FloatingElementEditor
        element={selectedElement}
        anchorRect={floatAnchorRect}
        section={sections.find((s) => s.id === selectedSection) ?? null}
        onUpdate={(sectionId, data) => handleUpdateSection(sectionId, data as Record<string, unknown>)}
        onClose={() => { setSelectedElement(null); setFloatAnchorRect(null); }}
      />

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
