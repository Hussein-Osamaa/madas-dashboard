import { useEffect, useState } from 'react';
import { Section } from '../../types/builder';
import { getDefaultPublishedSiteUrl } from '../../utils/siteUrls';

type Props = {
  open: boolean;
  onClose: () => void;
  onPublish: (options: { status: 'draft' | 'published'; customDomain?: string }) => Promise<void>;
  siteId: string;
  siteName: string;
  currentStatus: 'draft' | 'published';
  sections: Section[];
};

const PublishModal = ({ open, onClose, onPublish, siteId, siteName, currentStatus, sections }: Props) => {
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published'>(currentStatus);
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    if (!open) return;
    setPublishStatus(currentStatus);
    setCustomDomain('');
  }, [open, currentStatus]);

  if (!open) return null;

  const handlePublish = async () => {
    if (sections.length === 0) {
      alert('Please add at least one section before publishing.');
      return;
    }

    setPublishing(true);
    try {
      await onPublish({
        status: publishStatus,
        customDomain: customDomain || undefined
      });
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const defaultUrl = getDefaultPublishedSiteUrl(siteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-primary">Publish Website</h2>
          <p className="text-sm text-madas-text/70 mt-1">Configure publishing options for "{siteName}"</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Status</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-base transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={publishStatus === 'draft'}
                  onChange={() => setPublishStatus('draft')}
                  className="text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-medium text-primary">Draft</p>
                  <p className="text-xs text-madas-text/60">Save as draft (not visible to public)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-base transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={publishStatus === 'published'}
                  onChange={() => setPublishStatus('published')}
                  className="text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-medium text-primary">Published</p>
                  <p className="text-xs text-madas-text/60">Make website visible to public</p>
                </div>
              </label>
            </div>
          </div>

          {publishStatus === 'published' && (
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="mystore.com or shop.example.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-madas-text/60 mt-1">
                Leave empty to use the default URL: {defaultUrl}
              </p>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>DNS Setup Required:</strong> If you enter a domain, you’ll see DNS records in <strong>E-commerce → Custom Domains</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> {sections.length} section{sections.length !== 1 ? 's' : ''} will be published.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2 text-sm font-medium text-madas-text/70 hover:text-primary transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="px-6 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-[#1f3c19] transition-colors disabled:opacity-60"
          >
            {publishing ? (
              <span className="flex items-center gap-2">
                <span className="material-icons animate-spin text-base">progress_activity</span>
                Publishing...
              </span>
            ) : (
              publishStatus === 'published' ? 'Publish Now' : 'Save as Draft'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;

