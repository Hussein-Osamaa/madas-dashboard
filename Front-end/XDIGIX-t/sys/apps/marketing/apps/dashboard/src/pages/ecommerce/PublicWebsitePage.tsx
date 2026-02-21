import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, db, query, where, getDocs, doc, getDoc } from '../../lib/firebase';
import { exportWebsiteToHTML } from '../../utils/exportWebsite';
import { Section } from '../../types/builder';
import FullScreenLoader from '../../components/common/FullScreenLoader';

// Public website page - accessible without authentication
// This will be used for actual domain hosting
const PublicWebsitePage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams] = useSearchParams();
  const domain = searchParams.get('domain') || window.location.hostname;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const loadSite = async () => {
      try {
        let siteData: any = null;
        let businessId: string | null = null;

        // Try to find site by domain first
        if (domain && domain !== 'localhost' && !domain.includes('127.0.0.1')) {
          // Search all businesses for a site with this domain
          const businessesRef = collection(db, 'businesses');
          const businessesSnapshot = await getDocs(businessesRef);
          
          for (const businessDoc of businessesSnapshot.docs) {
            const sitesRef = collection(db, 'businesses', businessDoc.id, 'published_sites');
            const sitesQuery = query(
              sitesRef,
              where('status', '==', 'published')
            );
            const sitesSnapshot = await getDocs(sitesQuery);
            
            for (const siteDoc of sitesSnapshot.docs) {
              const data = siteDoc.data();
              // Check if domain matches customDomain or URL
              const siteDomain = data.customDomain || 
                                (data.url ? new URL(data.url).hostname : null);
              
              if (siteDomain && (domain.includes(siteDomain) || siteDomain.includes(domain))) {
                siteData = data;
                businessId = businessDoc.id;
                break;
              }
            }
            
            if (siteData) break;
          }
        }

        // If not found by domain, try by siteId
        if (!siteData && siteId) {
          const businessesRef = collection(db, 'businesses');
          const businessesSnapshot = await getDocs(businessesRef);
          
          for (const businessDoc of businessesSnapshot.docs) {
            try {
              const siteRef = doc(db, 'businesses', businessDoc.id, 'published_sites', siteId);
              const siteSnap = await getDoc(siteRef);
              
              if (siteSnap.exists()) {
                const data = siteSnap.data();
                if (data.status === 'published') {
                  siteData = data;
                  businessId = businessDoc.id;
                  break;
                }
              }
            } catch (err) {
              continue;
            }
          }
        }

        if (!siteData || !businessId) {
          setError('Website not found or not published');
          setLoading(false);
          return;
        }

        const sections: Section[] = siteData.sections || [];
        const siteName = siteData.name || 'My Store';
        const settings = siteData.settings || {};

        if (sections.length === 0) {
          setError('This website has no content yet.');
          setLoading(false);
          return;
        }

        // Generate HTML from sections
        const html = exportWebsiteToHTML(sections, siteName, settings, siteId || undefined);
        setHtmlContent(html);
      } catch (err) {
        console.error('Error loading site:', err);
        setError('Failed to load website. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadSite();
  }, [siteId, domain]);

  if (loading) {
    return <FullScreenLoader message="Loading website..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-base">
        <div className="text-center">
          <span className="material-icons text-6xl text-red-500 mb-4">error</span>
          <p className="text-lg font-medium text-primary mb-2">Error</p>
          <p className="text-sm text-madas-text/70">{error}</p>
        </div>
      </div>
    );
  }

  // Render the HTML directly (not in iframe for better SEO and performance)
  // Use a style tag to ensure proper rendering
  return (
    <>
      <style>{`
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
      <div 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{ width: '100%', minHeight: '100vh' }}
      />
    </>
  );
};

export default PublicWebsitePage;
