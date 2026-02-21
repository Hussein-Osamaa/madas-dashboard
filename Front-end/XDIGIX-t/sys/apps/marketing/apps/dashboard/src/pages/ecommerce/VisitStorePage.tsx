import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { collection, db, getDocs, query, where } from '../../lib/firebase';
import { getCustomDomainUrl, getDefaultPublishedSiteUrl } from '../../utils/siteUrls';

type PublishedSite = {
  id: string;
  name: string;
  url: string;
  status: 'published' | 'draft';
  publishedAt?: Date;
  customDomain?: string;
  slug?: string;
};

const VisitStorePage = () => {
  const navigate = useNavigate();
  const { businessId } = useBusiness();
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSites = async () => {
      if (!businessId) return;
      try {
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const sitesQuery = query(sitesRef, where('status', '==', 'published'));
        const snapshot = await getDocs(sitesQuery);

        const loadedSites: PublishedSite[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'My Store',
            url: data.url || data.previewUrl || '',
            status: data.status || 'published',
            publishedAt: data.publishedAt?.toDate?.() || new Date(),
            customDomain: data.customDomain,
            slug: data.slug
          };
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


  return (
    <div className="space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Visit Store</h1>
        <p className="text-sm text-madas-text/70">View and manage your published stores</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">storefront</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">No Published Stores</p>
          <p className="text-sm text-madas-text/60 mb-6">
            Publish your website from the Website Builder to view it here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="rounded-lg bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md"
          >
            Go to Website Builder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <article
              key={site.id}
              className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-icons text-primary text-2xl">store</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary truncate">{site.name}</h3>
                  <p className="text-xs text-madas-text/60">Published Store</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {site.customDomain ? (
                  <>
                    <div className="rounded-lg border border-gray-200 bg-base/40 p-3">
                      <p className="text-xs text-madas-text/60 mb-1">Custom Domain</p>
                      <p className="text-sm font-medium text-primary truncate">{site.customDomain}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs text-blue-800">
                        <strong>DNS Setup Required:</strong> Point your domain's A record or CNAME to this hosting service.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-base/40 p-3">
                    <p className="text-xs text-madas-text/60 mb-1">Published URL</p>
                    <p className="text-sm font-medium text-primary truncate break-all">
                      {getDefaultPublishedSiteUrl(site.id, site.slug)}
                    </p>
                  </div>
                )}

                {site.publishedAt && (
                  <div className="flex items-center gap-2 text-xs text-madas-text/60">
                    <span className="material-icons text-sm">schedule</span>
                    <span>Published {new Date(site.publishedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = site.customDomain
                      ? getCustomDomainUrl(site.customDomain)
                      : getDefaultPublishedSiteUrl(site.id, site.slug);
                    window.open(url, '_blank');
                  }}
                  className="flex-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors shadow-sm"
                >
                  <span className="material-icons text-base mr-1 align-middle">open_in_new</span>
                  Visit Store
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/preview/${site.id}`)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text/70 hover:bg-base transition-colors"
                  title="Preview in Dashboard"
                >
                  <span className="material-icons text-base">preview</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-base transition-colors text-left"
          >
            <span className="material-icons text-primary">web</span>
            <div>
              <p className="text-sm font-medium text-primary">Website Builder</p>
              <p className="text-xs text-madas-text/60">Create or edit your store</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/custom-domains')}
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-base transition-colors text-left"
          >
            <span className="material-icons text-primary">language</span>
            <div>
              <p className="text-sm font-medium text-primary">Custom Domains</p>
              <p className="text-xs text-madas-text/60">Connect your domain</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => window.open('/pages/Web-builder/website-settings.html', '_blank')}
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-base transition-colors text-left"
          >
            <span className="material-icons text-primary">settings</span>
            <div>
              <p className="text-sm font-medium text-primary">Store Settings</p>
              <p className="text-xs text-madas-text/60">Configure your store</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};

export default VisitStorePage;

