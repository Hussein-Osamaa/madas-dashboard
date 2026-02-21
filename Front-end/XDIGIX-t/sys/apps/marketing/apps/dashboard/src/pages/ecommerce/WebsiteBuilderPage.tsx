import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, db, getDocs, getDoc, query, where, addDoc, updateDoc, doc, deleteDoc, writeBatch } from '../../lib/firebase';
import CreateSiteModal from '../../components/ecommerce/CreateSiteModal';
import { getDefaultPublishedSiteUrl } from '../../utils/siteUrls';

type Site = {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published';
  createdAt?: Date;
  updatedAt?: Date;
  url?: string;
  customDomain?: string;
};

const WebsiteBuilderPage = () => {
  const navigate = useNavigate();
  const { businessId, businessName } = useBusiness();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);

  useEffect(() => {
    const loadSites = async () => {
      if (!businessId) return;
      try {
        // Load both draft and published sites
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const snapshot = await getDocs(sitesRef);

        const loadedSites: Site[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || 'Untitled Site',
            description: data.description,
            status: (data.status as 'draft' | 'published') || 'draft',
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            url: data.url || data.previewUrl,
            customDomain: data.customDomain
          };
        });

        // Sort by updated date (most recent first)
        loadedSites.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });

        setSites(loadedSites);
      } catch (error) {
        console.error('Failed to load sites:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSites();
  }, [businessId]);

  const handleCreateSite = async (siteData: { name: string; description?: string }) => {
    if (!businessId || !user?.uid) return;

    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const newSite = {
        name: siteData.name,
        description: siteData.description || '',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [],
        settings: {
          theme: {
            primaryColor: '#27491F',
            secondaryColor: '#F0CAE1',
            backgroundColor: '#FFFFFF',
            textColor: '#171817'
          },
          seo: {
            title: siteData.name,
            description: siteData.description || '',
            keywords: []
          }
        },
        pages: ['home'],
        createdBy: user.uid
      };

      const docRef = await addDoc(sitesRef, newSite);

      // Open builder with the new site
      navigate(`/ecommerce/builder?siteId=${docRef.id}`);

      setShowCreateModal(false);
      // Reload sites
      const snapshot = await getDocs(sitesRef);
      const loadedSites: Site[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Untitled Site',
          description: data.description,
          status: (data.status as 'draft' | 'published') || 'draft',
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          url: data.url || data.previewUrl,
          customDomain: data.customDomain
        };
      });
      setSites(loadedSites);
    } catch (error) {
      console.error('Failed to create site:', error);
      alert('Failed to create site. Please try again.');
    }
  };

  const handleOpenBuilder = (siteId?: string) => {
    if (siteId) {
      navigate(`/ecommerce/builder?siteId=${siteId}`);
    } else {
      navigate('/ecommerce/builder');
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) return;
    if (!businessId) return;

    setDeleting(siteId);
    try {
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      await deleteDoc(siteRef);

      setSites((prev) => prev.filter((site) => site.id !== siteId));
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert('Failed to delete site. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handlePublishSite = async (siteId: string) => {
    if (!businessId) return;

    setPublishing(siteId);
    try {
      // First, unpublish all other published sites (only ONE site can be live at a time)
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const publishedSitesQuery = query(sitesRef, where('status', '==', 'published'));
      const publishedSitesSnapshot = await getDocs(publishedSitesQuery);
      
      if (!publishedSitesSnapshot.empty) {
        const batch = writeBatch(db);
        publishedSitesSnapshot.docs.forEach((siteDoc) => {
          if (siteDoc.id !== siteId) {
            batch.update(siteDoc.ref, { 
              status: 'draft',
              unpublishedAt: new Date(),
              unpublishedReason: 'auto_unpublished_new_site'
            });
          }
        });
        await batch.commit();
      }

      // Update all custom domains to point to this new site
      const domainsRef = collection(db, 'customDomains');
      const domainQuery = query(domainsRef, where('tenantId', '==', businessId));
      const domainsSnapshot = await getDocs(domainQuery);
      
      if (!domainsSnapshot.empty) {
        const domainBatch = writeBatch(db);
        domainsSnapshot.docs.forEach((domainDoc) => {
          if (domainDoc.data().siteId !== siteId) {
            domainBatch.update(domainDoc.ref, { 
              siteId: siteId,
              updatedAt: new Date()
            });
          }
        });
        await domainBatch.commit();
      }

      // Now publish the selected site
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      await updateDoc(siteRef, {
        status: 'published',
        publishedAt: new Date(),
        isActive: true,
        url: getDefaultPublishedSiteUrl(siteId),
        publicUrl: getDefaultPublishedSiteUrl(siteId),
        updatedAt: new Date()
      });

      // Update local state - unpublish others and publish selected
      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId
            ? { ...site, status: 'published' as const, url: getDefaultPublishedSiteUrl(siteId), updatedAt: new Date() }
            : { ...site, status: 'draft' as const, updatedAt: new Date() }
        )
      );
    } catch (error) {
      console.error('Failed to publish site:', error);
      alert('Failed to publish site. Please try again.');
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublishSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to unpublish this site? It will no longer be publicly accessible.')) return;
    if (!businessId) return;

    setUnpublishing(siteId);
    try {
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      await updateDoc(siteRef, {
        status: 'draft',
        updatedAt: new Date()
      });

      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId ? { ...site, status: 'draft' as const, updatedAt: new Date() } : site
        )
      );
    } catch (error) {
      console.error('Failed to unpublish site:', error);
      alert('Failed to unpublish site. Please try again.');
    } finally {
      setUnpublishing(null);
    }
  };

  const handleDuplicateSite = async (site: Site) => {
    if (!businessId || !user?.uid) return;

    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', site.id);
      const siteSnap = await getDoc(siteRef);
      const sourceData = siteSnap.data();
      const sectionsToCopy = sourceData?.sections || [];
      const settingsToCopy = sourceData?.settings || {
        theme: { primaryColor: '#27491F', secondaryColor: '#F0CAE1', backgroundColor: '#FFFFFF', textColor: '#171817' },
        seo: { title: `${site.name} (Copy)`, description: site.description || '', keywords: [] }
      };

      await addDoc(sitesRef, {
        name: `${site.name} (Copy)`,
        description: site.description,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: sectionsToCopy,
        settings: {
          ...settingsToCopy,
          seo: {
            ...settingsToCopy.seo,
            title: `${site.name} (Copy)`,
            description: site.description || ''
          }
        },
        pages: sourceData?.pages || ['home'],
        createdBy: user.uid
      });

      // Reload sites
      const snapshot = await getDocs(sitesRef);
      const loadedSites: Site[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Untitled Site',
          description: data.description,
          status: (data.status as 'draft' | 'published') || 'draft',
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          url: data.url || data.previewUrl,
          customDomain: data.customDomain
        };
      });
      loadedSites.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      setSites(loadedSites);
    } catch (error) {
      console.error('Failed to duplicate site:', error);
      alert('Failed to duplicate site. Please try again.');
    }
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Website Builder</h1>
          <p className="text-sm text-madas-text/70">Create and manage your websites</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md flex items-center gap-2"
        >
          <span className="material-icons text-base">add</span>
          Create New Site
        </button>
      </header>

      {/* Warning: Multiple Published Sites */}
      {!loading && sites.filter(s => s.status === 'published').length > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-icons text-amber-600 mt-0.5">warning</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Multiple Sites Published</p>
            <p className="text-sm text-amber-700 mt-1">
              You have {sites.filter(s => s.status === 'published').length} published sites. Only one site can be live at a time on your custom domain.
              Click <strong>Publish</strong> on the site you want to be active — the others will be automatically unpublished.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">web</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">No Websites Yet</p>
          <p className="text-sm text-madas-text/60 mb-6">
            Create your first website to get started with the builder.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md"
          >
            Create Your First Site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <article
              key={site.id}
              className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary truncate">{site.name}</h3>
                  {site.description && (
                    <p className="text-sm text-madas-text/70 mt-1 line-clamp-2">{site.description}</p>
                  )}
                </div>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    site.status === 'published'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {site.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {site.updatedAt && (
                  <div className="flex items-center gap-2 text-xs text-madas-text/60">
                    <span className="material-icons text-sm">schedule</span>
                    <span>Updated {new Date(site.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {site.url && (
                  <div className="flex items-center gap-2 text-xs text-madas-text/60">
                    <span className="material-icons text-sm">link</span>
                    <span className="truncate">{site.url}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenBuilder(site.id)}
                  className="flex-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
                >
                  <span className="material-icons text-base mr-1 align-middle">edit</span>
                  Edit
                </button>
                {site.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => handlePublishSite(site.id)}
                    disabled={publishing === site.id}
                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
                    title="Publish"
                  >
                    {publishing === site.id ? (
                      <span className="material-icons animate-spin text-base text-green-700">progress_activity</span>
                    ) : (
                      <span className="material-icons text-base text-green-700">publish</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnpublishSite(site.id)}
                    disabled={unpublishing === site.id}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-60"
                    title="Unpublish"
                  >
                    {unpublishing === site.id ? (
                      <span className="material-icons animate-spin text-base text-orange-700">progress_activity</span>
                    ) : (
                      <span className="material-icons text-base text-orange-700">unpublished</span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/website-settings?siteId=${site.id}`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Settings"
                >
                  <span className="material-icons text-base text-gray-700">settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateSite(site)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Duplicate"
                >
                  <span className="material-icons text-base text-gray-700">content_copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSite(site.id)}
                  disabled={deleting === site.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                  title="Delete"
                >
                  {deleting === site.id ? (
                    <span className="material-icons animate-spin text-base text-red-600">progress_activity</span>
                  ) : (
                    <span className="material-icons text-base text-red-600">delete</span>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="material-icons text-purple-600 text-2xl">view_module</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Templates</h3>
              <p className="text-sm text-madas-text/70">Start with a template</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/70 mb-4">
            Choose from professional templates designed for e-commerce stores.
          </p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/templates')}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            Browse Templates
          </button>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="material-icons text-blue-600 text-2xl">settings</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Settings</h3>
              <p className="text-sm text-madas-text/70">Configure your sites</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/70 mb-4">
            Manage SEO, analytics, and other website settings.
          </p>
          <button
            type="button"
            onClick={() => {
              if (sites.length > 0) {
                navigate(`/ecommerce/website-settings?siteId=${sites[0].id}`);
              } else {
                alert('Please create a site first');
              }
            }}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            Open Settings
          </button>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-icons text-green-600 text-2xl">storefront</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Visit Store</h3>
              <p className="text-sm text-madas-text/70">View published sites</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/70 mb-4">
            View and manage your published websites.
          </p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/visit-store')}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            View Stores
          </button>
        </article>
      </section>

      {/* Help Section */}
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/pages/Web-builder/QUICK_START.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-base transition-colors"
          >
            <span className="material-icons text-primary">help_outline</span>
            <div>
              <p className="text-sm font-medium text-primary">Quick Start Guide</p>
              <p className="text-xs text-madas-text/60">Get started in 5 minutes</p>
            </div>
          </a>
          <a
            href="/dashboard/pages/Web-builder/PRODUCTION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-base transition-colors"
          >
            <span className="material-icons text-primary">menu_book</span>
            <div>
              <p className="text-sm font-medium text-primary">Production Guide</p>
              <p className="text-xs text-madas-text/60">Deployment instructions</p>
            </div>
          </a>
          <a
            href="/dashboard/pages/Web-builder/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-base transition-colors"
          >
            <span className="material-icons text-primary">description</span>
            <div>
              <p className="text-sm font-medium text-primary">Documentation</p>
              <p className="text-xs text-madas-text/60">Full feature list</p>
            </div>
          </a>
        </div>
      </section>

      {/* Create Site Modal */}
      {showCreateModal && (
        <CreateSiteModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSite}
        />
      )}
    </div>
  );
};

export default WebsiteBuilderPage;
