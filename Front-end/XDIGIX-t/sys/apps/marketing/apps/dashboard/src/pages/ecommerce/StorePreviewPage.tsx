import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { doc, db, getDoc } from '../../lib/firebase';
import { exportWebsiteToHTML } from '../../utils/exportWebsite';
import { Section } from '../../types/builder';
import FullScreenLoader from '../../components/common/FullScreenLoader';

const StorePreviewPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const { businessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const loadSite = async () => {
      if (!businessId || !siteId) {
        setError('Site ID is required');
        setLoading(false);
        return;
      }

      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);

        if (!siteSnap.exists()) {
          setError('Website not found');
          setLoading(false);
          return;
        }

        const data = siteSnap.data();
        const sections: Section[] = data.sections || [];
        const siteName = data.name || 'My Store';
        const settings = data.settings || {};

        if (sections.length === 0) {
          setError('This website has no content yet.');
          setLoading(false);
          return;
        }

        // Generate HTML from sections
        const html = exportWebsiteToHTML(sections, siteName, settings);
        setHtmlContent(html);
      } catch (err) {
        console.error('Error loading site:', err);
        setError('Failed to load website. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadSite();
  }, [businessId, siteId]);

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

  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-screen border-none"
      title="Website Preview"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
    />
  );
};

export default StorePreviewPage;

