import { useState, useEffect, useCallback } from 'react';
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

/* ─── tiny toast ─────────────────────────────────────────────────── */
type ToastKind = 'success' | 'error' | 'info';
function showToast(message: string, kind: ToastKind = 'info') {
  const colors: Record<ToastKind, string> = {
    success: '#15803d',
    error:   '#dc2626',
    info:    '#1d4ed8',
  };
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    background: colors[kind], color: '#fff',
    padding: '12px 20px', borderRadius: '10px',
    fontSize: '14px', fontWeight: '500',
    boxShadow: '0 4px 20px rgba(0,0,0,.18)',
    transition: 'opacity .3s',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

/* ─── confirm dialog (non-blocking) ─────────────────────────────── */
function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9998',
      background: 'rgba(0,0,0,.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    });
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:380px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,.18);">
        <p style="font-size:15px;color:#1a1a1a;margin:0 0 20px;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="cancel" style="padding:8px 20px;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:14px;">Cancel</button>
          <button id="confirm" style="padding:8px 20px;border-radius:8px;border:none;background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm')!.addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('#cancel')!.addEventListener('click',  () => { overlay.remove(); resolve(false); });
  });
}

/* ─── helpers ────────────────────────────────────────────────────── */
function parseSite(docSnap: { id: string; data: () => Record<string, unknown> }): Site {
  const data = docSnap.data() as Record<string, any>;
  return {
    id:          docSnap.id,
    name:        (data.name as string) || 'Untitled Site',
    description: data.description as string | undefined,
    status:      ((data.status as string) === 'published' ? 'published' : 'draft'),
    createdAt:   data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt:   data.updatedAt?.toDate?.() ?? data.updatedAt,
    url:         (data.url as string) || (data.previewUrl as string),
    customDomain: data.customDomain as string | undefined,
  };
}

function sortByUpdated(sites: Site[]) {
  return [...sites].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });
}

/* ─── component ──────────────────────────────────────────────────── */
const WebsiteBuilderPage = () => {
  const navigate = useNavigate();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [publishing,  setPublishing]  = useState<string | null>(null);
  const [unpublishing,setUnpublishing]= useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* ── load sites (single source of truth) ─── */
  const loadSites = useCallback(async () => {
    if (!businessId) return;
    try {
      const snapshot = await getDocs(collection(db, 'businesses', businessId, 'published_sites'));
      setSites(sortByUpdated(snapshot.docs.map(parseSite)));
    } catch {
      showToast('Failed to load sites', 'error');
    }
  }, [businessId]);

  useEffect(() => {
    setLoading(true);
    void loadSites().finally(() => setLoading(false));
  }, [loadSites]);

  /* ── create ─── */
  const handleCreateSite = async (siteData: { name: string; description?: string }) => {
    if (!businessId || !user?.uid) return;
    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const docRef = await addDoc(sitesRef, {
        name: siteData.name,
        description: siteData.description || '',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [],
        settings: {
          theme: { primaryColor: '#27491F', secondaryColor: '#F0CAE1', backgroundColor: '#FFFFFF', textColor: '#171817' },
          seo:   { title: siteData.name, description: siteData.description || '', keywords: [] },
        },
        pages: ['home'],
        createdBy: user.uid,
      });
      setShowCreateModal(false);
      navigate(`/ecommerce/builder?siteId=${docRef.id}`);
    } catch {
      showToast('Failed to create site. Please try again.', 'error');
    }
  };

  /* ── delete ─── */
  const handleDeleteSite = async (siteId: string) => {
    if (!await showConfirm('Delete this site? This cannot be undone.')) return;
    if (!businessId) return;
    setDeleting(siteId);
    try {
      await deleteDoc(doc(db, 'businesses', businessId, 'published_sites', siteId));
      setSites((prev) => prev.filter((s) => s.id !== siteId));
      showToast('Site deleted', 'success');
    } catch {
      showToast('Failed to delete site', 'error');
    } finally {
      setDeleting(null);
    }
  };

  /* ── publish ─── */
  const handlePublishSite = async (siteId: string) => {
    if (!businessId) return;
    setPublishing(siteId);
    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');

      // Unpublish all other sites
      const publishedSnap = await getDocs(query(sitesRef, where('status', '==', 'published')));
      if (!publishedSnap.empty) {
        const batch = writeBatch(db);
        publishedSnap.docs.forEach((d) => {
          if (d.id !== siteId) batch.update(d.ref, { status: 'draft', unpublishedAt: new Date(), unpublishedReason: 'auto_unpublished_new_site' });
        });
        await batch.commit();
      }

      // Reroute custom domains
      const domainsSnap = await getDocs(query(collection(db, 'customDomains'), where('tenantId', '==', businessId)));
      if (!domainsSnap.empty) {
        const domBatch = writeBatch(db);
        domainsSnap.docs.forEach((d) => { if (d.data().siteId !== siteId) domBatch.update(d.ref, { siteId, updatedAt: new Date() }); });
        await domBatch.commit();
      }

      // Publish selected site
      const siteUrl = getDefaultPublishedSiteUrl(siteId);
      await updateDoc(doc(db, 'businesses', businessId, 'published_sites', siteId), {
        status: 'published', publishedAt: new Date(), isActive: true,
        url: siteUrl, publicUrl: siteUrl, updatedAt: new Date(),
      });

      setSites((prev) =>
        sortByUpdated(prev.map((s) =>
          s.id === siteId
            ? { ...s, status: 'published' as const, url: siteUrl, updatedAt: new Date() }
            : { ...s, status: 'draft'     as const, updatedAt: new Date() }
        ))
      );
      showToast('Site published successfully!', 'success');
    } catch {
      showToast('Failed to publish site', 'error');
    } finally {
      setPublishing(null);
    }
  };

  /* ── unpublish ─── */
  const handleUnpublishSite = async (siteId: string) => {
    if (!await showConfirm('Unpublish this site? It will no longer be publicly accessible.')) return;
    if (!businessId) return;
    setUnpublishing(siteId);
    try {
      await updateDoc(doc(db, 'businesses', businessId, 'published_sites', siteId), { status: 'draft', updatedAt: new Date() });
      setSites((prev) => prev.map((s) => s.id === siteId ? { ...s, status: 'draft' as const, updatedAt: new Date() } : s));
      showToast('Site unpublished', 'info');
    } catch {
      showToast('Failed to unpublish site', 'error');
    } finally {
      setUnpublishing(null);
    }
  };

  /* ── duplicate ─── */
  const handleDuplicateSite = async (site: Site) => {
    if (!businessId || !user?.uid) return;
    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const siteSnap = await getDoc(doc(db, 'businesses', businessId, 'published_sites', site.id));
      const src = siteSnap.data() as Record<string, any> | undefined;
      await addDoc(sitesRef, {
        name: `${site.name} (Copy)`,
        description: site.description,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: src?.sections || [],
        settings: {
          ...(src?.settings || {}),
          seo: { ...(src?.settings?.seo || {}), title: `${site.name} (Copy)`, description: site.description || '' },
        },
        pages: src?.pages || ['home'],
        createdBy: user.uid,
      });
      await loadSites();
      showToast('Site duplicated', 'success');
    } catch {
      showToast('Failed to duplicate site', 'error');
    }
  };

  /* ── derived ─── */
  const publishedCount = sites.filter((s) => s.status === 'published').length;
  const publishedSite  = sites.find((s) => s.status === 'published');
  const filtered = search.trim()
    ? sites.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : sites;

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 px-6 py-8">

      {/* Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Website Builder</h1>
          <p className="text-sm text-madas-text/70 mt-0.5">
            {loading ? 'Loading…' : `${sites.length} site${sites.length !== 1 ? 's' : ''} · ${publishedCount} live`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sites.length > 4 && (
            <input
              type="search"
              placeholder="Search sites…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-madas-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <span className="material-icons text-base">add</span>
            New Site
          </button>
        </div>
      </header>

      {/* Multi-publish warning */}
      {!loading && publishedCount > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-icons text-amber-600 mt-0.5">warning</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Multiple Sites Published</p>
            <p className="text-sm text-amber-700 mt-1">
              {publishedCount} published sites — only one can be live on your custom domain.
              Click <strong>Publish</strong> on the one you want active; the rest will be unpublished automatically.
            </p>
          </div>
        </div>
      )}

      {/* Sites grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-icons text-7xl text-madas-text/20 mb-4">web</span>
          <p className="text-xl font-semibold text-madas-text/60 mb-2">No websites yet</p>
          <p className="text-sm text-madas-text/50 mb-6 max-w-xs">
            Create your first site and customise it with our drag-and-drop builder.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md"
          >
            Create Your First Site
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-madas-text/50 py-10">No sites match "{search}"</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((site) => (
            <article
              key={site.id}
              className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-primary truncate">{site.name}</h3>
                  {site.description && (
                    <p className="text-xs text-madas-text/60 mt-1 line-clamp-2">{site.description}</p>
                  )}
                </div>
                <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  site.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {site.status === 'published' ? '● Live' : 'Draft'}
                </span>
              </div>

              {/* Meta */}
              <div className="space-y-1 mb-4 flex-1">
                {site.updatedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-madas-text/50">
                    <span className="material-icons text-sm">schedule</span>
                    <span>Updated {new Date(site.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {site.url && (
                  <div className="flex items-center gap-1.5 text-xs text-madas-text/50">
                    <span className="material-icons text-sm">link</span>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {site.url}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {/* Edit — primary */}
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/builder?siteId=${site.id}`)}
                  className="flex-1 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-sm">edit</span>
                  Edit
                </button>

                {/* View live (only when published) */}
                {site.status === 'published' && site.url && (
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100 transition-colors"
                    title="View live site"
                  >
                    <span className="material-icons text-base">open_in_new</span>
                  </a>
                )}

                {/* Publish / Unpublish */}
                {site.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => handlePublishSite(site.id)}
                    disabled={!!publishing}
                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
                    title="Publish"
                  >
                    {publishing === site.id
                      ? <span className="material-icons animate-spin text-base">progress_activity</span>
                      : <span className="material-icons text-base">publish</span>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnpublishSite(site.id)}
                    disabled={!!unpublishing}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-60"
                    title="Unpublish"
                  >
                    {unpublishing === site.id
                      ? <span className="material-icons animate-spin text-base">progress_activity</span>
                      : <span className="material-icons text-base">unpublished</span>}
                  </button>
                )}

                {/* Settings */}
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/website-settings?siteId=${site.id}`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Settings"
                >
                  <span className="material-icons text-base">settings</span>
                </button>

                {/* Duplicate */}
                <button
                  type="button"
                  onClick={() => handleDuplicateSite(site)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Duplicate"
                >
                  <span className="material-icons text-base">content_copy</span>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteSite(site.id)}
                  disabled={deleting === site.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                  title="Delete"
                >
                  {deleting === site.id
                    ? <span className="material-icons animate-spin text-base">progress_activity</span>
                    : <span className="material-icons text-base">delete</span>}
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
              <h3 className="text-base font-semibold text-primary">Templates</h3>
              <p className="text-xs text-madas-text/60">Start with a template</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/60 mb-4">
            Choose from professional templates designed for e-commerce stores.
          </p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/templates')}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
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
              <h3 className="text-base font-semibold text-primary">Settings</h3>
              <p className="text-xs text-madas-text/60">Configure your sites</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/60 mb-4">
            Manage SEO, analytics, and other website settings.
          </p>
          <button
            type="button"
            disabled={sites.length === 0}
            onClick={() => navigate(`/ecommerce/website-settings?siteId=${(publishedSite ?? sites[0]).id}`)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sites.length === 0 ? 'No sites yet' : 'Open Settings'}
          </button>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-icons text-green-600 text-2xl">storefront</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">Visit Store</h3>
              <p className="text-xs text-madas-text/60">View published sites</p>
            </div>
          </div>
          <p className="text-sm text-madas-text/60 mb-4">
            View and manage your published websites.
          </p>
          {publishedSite?.url ? (
            <a
              href={publishedSite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors text-center"
            >
              Open Live Site ↗
            </a>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/ecommerce/visit-store')}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
            >
              View Stores
            </button>
          )}
        </article>
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
