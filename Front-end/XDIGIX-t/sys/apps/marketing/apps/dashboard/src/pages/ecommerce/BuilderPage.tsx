import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { doc, db, getDoc, updateDoc, collection, getDocs, query, where, writeBatch } from '../../lib/firebase';
import { addDomain, isValidDomain } from '../../services/domainService';
import BuilderCanvas from '../../components/builder/BuilderCanvas';
import BuilderSidebar from '../../components/builder/BuilderSidebar';
import BuilderToolbar from '../../components/builder/BuilderToolbar';
import SectionEditor from '../../components/builder/SectionEditor';
import ContextualEditor from '../../components/builder/ContextualEditor';
import { Section, SectionType } from '../../types/builder';
import { SelectedElement } from '../../types/elementEditor';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { getDefaultPublishedSiteUrl, slugifyBrandName } from '../../utils/siteUrls';

// Helper to remove undefined values from objects (Firestore doesn't accept undefined)
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
};

const BuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const siteId = searchParams.get('siteId');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showSidebar, setShowSidebar] = useState(true);
  const [siteName, setSiteName] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [initialSections, setInitialSections] = useState<Section[]>([]);
  
  // Clear selected element when changing sections
  const handleSelectSection = useCallback((sectionId: string | null) => {
    setSelectedSection(sectionId);
    setSelectedElement(null);
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
      if (!businessId || !siteId) {
        setLoading(false);
        return;
      }

      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const loadedSections = data.sections || [];
          console.log('[BuilderPage] Loaded sections from Firestore:', loadedSections.length, 'sections');
          console.log('[BuilderPage] Loaded section types:', loadedSections.map((s: any) => s.type));
          console.log('[BuilderPage] Full sections data:', JSON.stringify(loadedSections, null, 2));
          setSiteName(data.name || 'Untitled Site');
          setCurrentStatus((data.status as 'draft' | 'published') || 'draft');
          
          // If no sections, add a default hero section
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
                  textColor: '#FFFFFF'
                }
              }
            ];
            setInitialSections(defaultSections);
          } else {
            setInitialSections(loadedSections);
          }
        }
      } catch (error) {
        console.error('Failed to load site:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSite();
  }, [businessId, siteId]);

  const handleSave = useCallback(async () => {
    if (!businessId || !siteId) return;

    setSaving(true);
    try {
      // Always use the latest sections from the ref
      const currentSections = sectionsRef.current;
      // Clean undefined values before saving to Firestore
      const cleanedSections = removeUndefined(currentSections);
      
      console.log('[BuilderPage] Saving sections:', cleanedSections.length, 'sections');
      console.log('[BuilderPage] Section types being saved:', cleanedSections.map((s: any) => s.type));
      
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      await updateDoc(siteRef, {
        sections: cleanedSections,
        updatedAt: new Date(),
        lastEditedBy: user?.uid
      });
      
      console.log('[BuilderPage] Save successful to Firestore');
      
      // Show success toast
      showToast('success', '✓ Changes Saved', 'Your website changes have been saved.');
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('error', 'Save Failed', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [businessId, siteId, user?.uid, showToast]);

  // Auto-save completely removed to prevent data conflicts

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
    if (!businessId || !siteId) return;

    try {
      // Always use the latest sections from the ref
      const currentSections = sectionsRef.current;
      console.log('[BuilderPage] Publishing with sections:', currentSections.length, 'sections');
      console.log('[BuilderPage] Section types:', currentSections.map(s => s.type).join(', '));
      
      // When publishing, first unpublish all other sites for this business
      // This ensures only ONE site is live at a time
      if (options.status === 'published') {
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const publishedSitesQuery = query(sitesRef, where('status', '==', 'published'));
        const publishedSitesSnapshot = await getDocs(publishedSitesQuery);
        
        if (!publishedSitesSnapshot.empty) {
          const batch = writeBatch(db);
          publishedSitesSnapshot.docs.forEach((siteDoc) => {
            // Don't unpublish the current site we're about to publish
            if (siteDoc.id !== siteId) {
              batch.update(siteDoc.ref, { 
                status: 'draft',
                unpublishedAt: new Date(),
                unpublishedReason: 'auto_unpublished_new_site'
              });
              console.log(`[BuilderPage] Auto-unpublishing site ${siteDoc.id}`);
            }
          });
          await batch.commit();
        }

        // Update the custom domain to point to this new site (if business has a domain)
        const domainsRef = collection(db, 'customDomains');
        const domainQuery = query(domainsRef, where('tenantId', '==', businessId));
        const domainsSnapshot = await getDocs(domainQuery);
        
        if (!domainsSnapshot.empty) {
          const domainBatch = writeBatch(db);
          domainsSnapshot.docs.forEach((domainDoc) => {
            // Update domain to point to the new site
            if (domainDoc.data().siteId !== siteId) {
              domainBatch.update(domainDoc.ref, { 
                siteId: siteId,
                updatedAt: new Date()
              });
              console.log(`[BuilderPage] Updating domain ${domainDoc.data().domain} to point to site ${siteId}`);
            }
          });
          await domainBatch.commit();
        }
      }

      // Optional: connect a NEW custom domain (so publish doesn't overwrite domain fields)
      const rawDomain = options.customDomain?.trim();
      const shouldConnectDomain = options.status === 'published' && !!rawDomain;
      if (shouldConnectDomain && rawDomain) {
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

      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      // Clean undefined values before saving to Firestore
      const cleanedSections = removeUndefined(currentSections);
      const updateData: any = {
        status: options.status,
        sections: cleanedSections,
        updatedAt: new Date(),
        lastEditedBy: user?.uid
      };

      if (options.status === 'published') {
        updateData.publishedAt = new Date();
        updateData.isActive = true; // Mark as the active site
        // Default URL: https://xdigix.com/[brand name]. Compute slug from site name and ensure uniqueness.
        const rawName = (siteName && typeof siteName === 'string' && siteName.trim()) ? siteName.trim() : 'My Store';
        let slug = slugifyBrandName(rawName) || 'store';
        const slugCheckQuery = query(collection(db, 'businesses', businessId, 'published_sites'), where('slug', '==', slug));
        const slugSnap = await getDocs(slugCheckQuery);
        const takenByOther = slugSnap.docs.some(d => d.id !== siteId);
        if (takenByOther) slug = `${slug}-${siteId.slice(0, 6)}`;
        updateData.slug = slug;
        const defaultUrl = getDefaultPublishedSiteUrl(siteId, slug);
        updateData.url = defaultUrl;
        updateData.publicUrl = defaultUrl;
      } else {
        updateData.isActive = false;
      }

      await updateDoc(siteRef, updateData);
      setCurrentStatus(options.status);
      
      if (options.status === 'published') {
        showToast(
          'success', 
          '🎉 Website Published!', 
          shouldConnectDomain 
            ? 'Your website is now live! Domain connected — finish DNS setup in E-commerce → Custom Domains.' 
            : 'Your website is now live! Changes are visible to your visitors.'
        );
      } else {
        showToast('info', 'Draft Saved', 'Website saved as draft. Publish when you\'re ready to go live.');
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      throw error instanceof Error ? error : new Error('Failed to publish website. Please try again.');
    }
  }, [businessId, siteId, siteName, user?.uid, showToast]);

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
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      {/* Top Toolbar */}
      <BuilderToolbar
        siteId={siteId}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        onSave={handleSave}
        saving={saving}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
        showSidebar={showSidebar}
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
        {/* Main Canvas */}
        <div className="flex-1 overflow-auto">
          <BuilderCanvas
            sections={sections}
            selectedSection={selectedSection}
            selectedElement={selectedElement}
            previewMode={previewMode}
            onSelectSection={handleSelectSection}
            onSelectElement={setSelectedElement}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            onDuplicateSection={handleDuplicateSection}
            siteId={siteId || undefined}
          />
        </div>

        {/* Right Sidebar - Combined Section Library & Editor */}
        {showSidebar && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            {selectedSection ? (
              /* Edit Mode - Show contextual editor or section editor based on selected element */
              selectedElement && sections.find((s) => s.id === selectedSection) ? (
                /* Contextual Element Editor */
                <ContextualEditor
                  selectedElement={selectedElement}
                  section={sections.find((s) => s.id === selectedSection)!}
                  onUpdateSection={(updatedSection) => {
                    handleUpdateSection(updatedSection.id, updatedSection);
                  }}
                  onClearSelection={() => setSelectedElement(null)}
                  businessId={businessId}
                  siteId={siteId || undefined}
                />
              ) : (
                /* Section Overview & Quick Actions */
                <div className="flex flex-col h-full">
                  {/* Section Header */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => handleSelectSection(null)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                      >
                        <span className="material-icons text-sm">arrow_back</span>
                        Back to Sections
                      </button>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800">
                      {sections.find((s) => s.id === selectedSection)?.type.charAt(0).toUpperCase()}
                      {sections.find((s) => s.id === selectedSection)?.type.slice(1)} Section
                    </h3>
                  </div>
                  
                  {/* Click Prompt */}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <span className="material-icons text-4xl text-primary">touch_app</span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Click to Edit</h4>
                    <p className="text-xs text-gray-500 max-w-[200px] mb-6">
                      Click on any element in the section preview to start editing it. You can edit:
                    </p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-[240px]">
                      {['Background', 'Title', 'Text', 'Buttons', 'Cards', 'Images'].map((item) => (
                        <div key={item} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="material-icons text-xs text-primary">check_circle</span>
                          <span className="text-xs text-gray-600">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="p-4 border-t border-gray-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedElement({ type: 'background', sectionId: selectedSection! })}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-left"
                    >
                      <span className="material-icons text-primary">format_color_fill</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Edit Background</p>
                        <p className="text-xs text-gray-500">Colors, images, padding</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedElement({ type: 'title', sectionId: selectedSection! })}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                    >
                      <span className="material-icons text-gray-600">title</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Edit Title</p>
                        <p className="text-xs text-gray-500">Text, font, color, alignment</p>
                      </div>
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Add Sections Mode */
              <BuilderSidebar
                onAddSection={handleAddSection}
                sections={sections}
                onSelectSection={handleSelectSection}
                selectedSection={selectedSection}
              />
            )}
          </div>
        )}
      </div>

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
  );
};

// Helper function to get default section data
function getDefaultSectionData(type: SectionType): any {
  const defaults: Partial<Record<SectionType, any>> = {
    navbar: {
      logo: '',
      logoText: 'MADAS',
      menuItems: [
        { label: 'MEN', link: '#', badge: '' },
        { label: 'WOMEN', link: '#', badge: '' },
        { label: 'KIDS', link: '#', badge: '' },
        { label: 'CLASSIC', link: '#', badge: '' },
        { label: 'NEW', link: '#', badge: 'NEW' }
      ],
      showSearch: true,
      searchPlaceholder: 'Search products...',
      showCart: true,
      cartCount: 0,
      showWishlist: true,
      wishlistCount: 0,
      showUserIcon: true,
      backgroundColor: '#FFFFFF',
      textColor: '#27491F',
      sticky: false
    },
    hero: {
      title: 'Welcome to Our Store',
      subtitle: 'Discover amazing products',
      buttonText: 'Shop Now',
      buttonLink: '#',
      backgroundImage: '',
      backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
      textColor: '#FFFFFF'
    },
    features: {
      title: 'Our Features',
      subtitle: 'What makes us special',
      items: [
        { icon: '⭐', title: 'Feature 1', description: 'Description here' },
        { icon: '🚀', title: 'Feature 2', description: 'Description here' },
        { icon: '💎', title: 'Feature 3', description: 'Description here' }
      ]
    },
    products: {
      title: 'Featured Products',
      subtitle: 'Check out our best sellers',
      layout: 'grid',
      columns: 4,
      selectedProducts: [],
      showPrice: true,
      showAddToCart: true,
      cardStyle: {
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        priceColor: '#6b7280',
        borderRadius: 12,
        shadow: 'md',
        imageAspect: 'square',
        imageFit: 'contain',
        imageBackgroundColor: '#f3f4f6',
        buttonBackgroundColor: '#27491F',
        buttonTextColor: '#ffffff',
        buttonBorderRadius: 8,
        buttonFullWidth: true,
        showBorder: true,
        borderColor: '#e5e7eb'
      }
    },
    deals: {
      title: 'DEAL OF THE DAY',
      viewMoreText: 'VIEW MORE',
      viewMoreLink: '#',
      selectedProducts: [],
      columns: 4,
      cardStyle: {
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        descriptionColor: '#6b7280',
        priceColor: '#1f2937',
        borderRadius: 8,
        showBorder: true,
        borderColor: '#e5e7eb',
        imageBackgroundColor: '#f3f4f6',
        buttonBackgroundColor: '#F0CAE1',
        buttonTextColor: '#27491F',
        buttonBorderRadius: 6
      }
    },
    collections: {
      title: 'Shop by Collection',
      subtitle: 'Browse our curated collections',
      layout: 'grid',
      columns: 4,
      selectedCollections: [],
      cardStyle: {
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderRadius: 16,
        showBorder: false,
        borderColor: '#e5e7eb',
        imageAspect: 'square',
        imageFit: 'cover',
        overlayColor: '#000000',
        overlayOpacity: 0.4,
        showName: true,
        showDescription: false,
        showProductCount: true,
        namePosition: 'overlay'
      },
      titleStyle: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center'
      },
      subtitleStyle: {
        fontSize: '1rem',
        color: '#6b7280'
      }
    },
    testimonials: {
      title: 'What Our Customers Say',
      items: [
        { name: 'John Doe', role: 'Customer', text: 'Amazing service!', rating: 5 },
        { name: 'Jane Smith', role: 'Customer', text: 'Great products!', rating: 5 }
      ]
    },
    cta: {
      title: 'Ready to Get Started?',
      subtitle: 'Join thousands of satisfied customers',
      buttonText: 'Get Started',
      buttonLink: '#',
      backgroundColor: '#27491F',
      buttonBackgroundColor: '#ffffff',
      buttonTextColor: '#27491F'
    },
    about: {
      title: 'About Us',
      content: 'Your story here...',
      image: ''
    },
    contact: {
      title: 'Get in Touch',
      subtitle: 'We\'d love to hear from you',
      email: '',
      phone: '',
      address: ''
    },
    gallery: {
      title: 'Our Gallery',
      subtitle: '',
      layout: 'grid',
      columns: 4,
      images: []
    },
    pricing: {
      title: 'Pricing Plans',
      subtitle: 'Choose the perfect plan for you',
      currency: '$',
      billingPeriod: '/month',
      plans: []
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: []
    },
    footer: {
      layout: 'classic',
      logoText: 'BRAND',
      logo: '',
      tagline: 'Sign up for exclusive offers and be the first to know about new arrivals.',
      copyrightText: '© 2024 Brand. All rights reserved.',
      columns: [
        {
          title: 'Company',
          links: [
            { label: 'About Us', link: '#' },
            { label: 'Contact', link: '#' },
            { label: 'Careers', link: '#' }
          ]
        },
        {
          title: 'Support',
          links: [
            { label: 'Help Center', link: '#' },
            { label: 'Privacy Policy', link: '#' },
            { label: 'Terms of Service', link: '#' }
          ]
        },
        {
          title: 'Connect',
          links: [
            { label: 'Facebook', link: '#' },
            { label: 'Twitter', link: '#' },
            { label: 'Instagram', link: '#' }
          ]
        }
      ],
      policyLinks: [
        { label: 'Privacy policy', link: '#' },
        { label: 'Refund policy', link: '#' },
        { label: 'Contact information', link: '#' },
        { label: 'Terms of service', link: '#' },
        { label: 'Shipping policy', link: '#' }
      ],
      socialLinks: [
        { platform: 'Facebook', icon: 'facebook', link: '#' },
        { platform: 'Instagram', icon: 'camera_alt', link: '#' },
        { platform: 'TikTok', icon: 'music_note', link: '#' }
      ],
      socialIconBackgroundColor: '#1f2937',
      socialIconHoverBackgroundColor: '#27491F',
      showNewsletter: true,
      newsletterText: 'Subscribe to get special offers and updates.',
      newsletterPlaceholder: 'Your email'
    },
    stats: {
      title: 'Our Impact',
      subtitle: 'Numbers that speak for themselves',
      stats: [
        { value: '10K+', label: 'Happy Customers', icon: '😊' },
        { value: '500+', label: 'Products Sold', icon: '📦' },
        { value: '99%', label: 'Satisfaction Rate', icon: '⭐' },
        { value: '24/7', label: 'Support Available', icon: '💬' }
      ],
      layout: 'row',
      animated: true
    },
    team: {
      title: 'Meet Our Team',
      subtitle: 'The people behind our success',
      members: [
        { name: 'John Doe', role: 'CEO & Founder', bio: 'Visionary leader', image: '' },
        { name: 'Jane Smith', role: 'CTO', bio: 'Tech innovator', image: '' },
        { name: 'Mike Johnson', role: 'Lead Designer', bio: 'Creative mind', image: '' }
      ],
      layout: 'grid'
    },
    services: {
      title: 'Our Services',
      subtitle: 'What we offer',
      services: [
        { icon: '🚀', title: 'Fast Delivery', description: 'Get your products delivered within 24-48 hours', price: 'Free' },
        { icon: '🛡️', title: 'Secure Payment', description: 'Multiple secure payment options available', price: '' },
        { icon: '🔄', title: 'Easy Returns', description: '30-day hassle-free return policy', price: '' }
      ],
      layout: 'grid'
    },
    video: {
      title: 'Watch Our Story',
      subtitle: 'See what makes us different',
      videoUrl: '',
      videoType: 'youtube',
      thumbnailUrl: '',
      autoplay: false,
      showControls: true
    },
    countdown: {
      title: 'Coming Soon',
      subtitle: 'Something amazing is on its way',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      expiredMessage: 'The wait is over!',
      backgroundColor: '#27491F',
      textColor: '#ffffff'
    },
    banner: {
      text: '🎉 Special Offer: Get 20% off your first order! Use code WELCOME20',
      link: '#',
      linkText: 'Shop Now',
      backgroundColor: '#27491F',
      textColor: '#ffffff',
      icon: '',
      dismissible: true,
      enableMarquee: false,
      marqueeSpeed: 15
    },
    partners: {
      title: 'Trusted By',
      subtitle: 'Leading brands that work with us',
      partners: [
        { name: 'Company 1', logo: '', link: '#' },
        { name: 'Company 2', logo: '', link: '#' },
        { name: 'Company 3', logo: '', link: '#' },
        { name: 'Company 4', logo: '', link: '#' }
      ],
      grayscale: true,
      autoScroll: false
    },
    newsletter: {
      title: 'Stay Updated',
      subtitle: 'Subscribe to our newsletter for the latest updates and exclusive offers',
      placeholder: 'Enter your email address',
      buttonText: 'Subscribe',
      backgroundColor: '#f9fafb',
      successMessage: 'Thank you for subscribing!'
    },
    divider: {
      style: 'line',
      color: '#e5e7eb',
      height: 1,
      width: '100%',
      spacing: 40
    },
    imageComparison: {
      title: '',
      subtitle: '',
      beforeImage: '',
      afterImage: '',
      beforeLabel: 'Before',
      afterLabel: 'After',
      sliderPosition: 50,
      sliderColor: '#FFFFFF',
      showLabels: true,
      orientation: 'horizontal'
    }
  };
  return defaults[type] || {};
}

export default BuilderPage;
