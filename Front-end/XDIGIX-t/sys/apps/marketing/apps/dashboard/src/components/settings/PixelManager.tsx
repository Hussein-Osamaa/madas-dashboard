import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, db } from '../../lib/firebase';
import FullScreenLoader from '../common/FullScreenLoader';

// Legacy simple pixel data for single-pixel use cases
interface LegacyPixelData {
  metaPixelId?: string;
  googleTagId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  pinterestTagId?: string;
  customScript?: string;
}

interface PixelManagerProps {
  tenantId: string;
}

const PixelManager = ({ tenantId }: PixelManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pixelData, setPixelData] = useState<LegacyPixelData>({
    metaPixelId: '',
    googleTagId: '',
    tiktokPixelId: '',
    snapchatPixelId: '',
    pinterestTagId: '',
    customScript: '',
  });

  useEffect(() => {
    loadPixelData();
  }, [tenantId]);

  const loadPixelData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const pixelDocRef = doc(db, 'tenants', tenantId, 'pixels', 'config');
      const pixelDoc = await getDoc(pixelDocRef);
      
      if (pixelDoc.exists()) {
        const data = pixelDoc.data() as LegacyPixelData;
        setPixelData({
          metaPixelId: data.metaPixelId || '',
          googleTagId: data.googleTagId || '',
          tiktokPixelId: data.tiktokPixelId || '',
          snapchatPixelId: data.snapchatPixelId || '',
          pinterestTagId: data.pinterestTagId || '',
          customScript: data.customScript || '',
        });
      }
    } catch (error) {
      console.error('[PixelManager] Error loading pixel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) {
      alert('Tenant ID is required');
      return;
    }

    try {
      setSaving(true);
      const pixelDocRef = doc(db, 'tenants', tenantId, 'pixels', 'config');
      
      // Clean up empty strings
      const dataToSave: LegacyPixelData = {
        ...(pixelData.metaPixelId && { metaPixelId: pixelData.metaPixelId.trim() }),
        ...(pixelData.googleTagId && { googleTagId: pixelData.googleTagId.trim() }),
        ...(pixelData.tiktokPixelId && { tiktokPixelId: pixelData.tiktokPixelId.trim() }),
        ...(pixelData.snapchatPixelId && { snapchatPixelId: pixelData.snapchatPixelId.trim() }),
        ...(pixelData.pinterestTagId && { pinterestTagId: pixelData.pinterestTagId.trim() }),
        ...(pixelData.customScript && { customScript: pixelData.customScript.trim() }),
      };

      await setDoc(pixelDocRef, {
        ...dataToSave,
        updatedAt: new Date(),
      }, { merge: true });

      alert('Pixel settings saved successfully!');
    } catch (error) {
      console.error('[PixelManager] Error saving pixel data:', error);
      alert('Failed to save pixel settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FullScreenLoader message="Loading pixel settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-2">Pixel Manager</h2>
        <p className="text-sm text-madas-text/70">
          Configure tracking pixels and analytics scripts for your website.
        </p>
      </div>

      <section className="space-y-6">
        {/* Meta Pixel */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            Meta Pixel ID (Facebook Pixel)
          </label>
          <input
            type="text"
            value={pixelData.metaPixelId || ''}
            onChange={(e) => setPixelData({ ...pixelData, metaPixelId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your Meta Pixel ID (e.g., 123456789012345)"
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Find your Pixel ID in Meta Events Manager
          </p>
        </div>

        {/* Google Tag (GA4) */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            Google Tag ID (GA4)
          </label>
          <input
            type="text"
            value={pixelData.googleTagId || ''}
            onChange={(e) => setPixelData({ ...pixelData, googleTagId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your Google Tag ID (e.g., G-XXXXXXXXXX)"
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Find your Measurement ID in Google Analytics 4
          </p>
        </div>

        {/* TikTok Pixel */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            TikTok Pixel ID
          </label>
          <input
            type="text"
            value={pixelData.tiktokPixelId || ''}
            onChange={(e) => setPixelData({ ...pixelData, tiktokPixelId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your TikTok Pixel ID"
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Find your Pixel ID in TikTok Events Manager
          </p>
        </div>

        {/* Snapchat Pixel */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            Snapchat Pixel ID
          </label>
          <input
            type="text"
            value={pixelData.snapchatPixelId || ''}
            onChange={(e) => setPixelData({ ...pixelData, snapchatPixelId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your Snapchat Pixel ID"
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Find your Pixel ID in Snapchat Ads Manager
          </p>
        </div>

        {/* Pinterest Tag */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            Pinterest Tag ID
          </label>
          <input
            type="text"
            value={pixelData.pinterestTagId || ''}
            onChange={(e) => setPixelData({ ...pixelData, pinterestTagId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter your Pinterest Tag ID"
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Find your Tag ID in Pinterest Ads Manager
          </p>
        </div>

        {/* Custom Script */}
        <div>
          <label className="block text-sm font-medium text-madas-text/80 mb-2">
            Custom Script
          </label>
          <textarea
            value={pixelData.customScript || ''}
            onChange={(e) => setPixelData({ ...pixelData, customScript: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
            placeholder="Paste your custom tracking script here..."
            rows={8}
          />
          <p className="mt-1 text-xs text-madas-text/60">
            Add any custom tracking scripts or analytics code here
          </p>
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default PixelManager;

