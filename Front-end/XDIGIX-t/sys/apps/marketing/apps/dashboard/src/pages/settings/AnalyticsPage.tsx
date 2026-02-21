import { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { doc, getDoc, setDoc, db } from '../../lib/firebase';
import { PixelData, PixelItem, CustomScriptItem } from '../../utils/pixelScripts';
import MetaPixelTab from '../../components/settings/pixels/MetaPixelTab';
import GoogleTagTab from '../../components/settings/pixels/GoogleTagTab';
import TikTokPixelTab from '../../components/settings/pixels/TikTokPixelTab';
import SnapchatPixelTab from '../../components/settings/pixels/SnapchatPixelTab';
import PinterestTagTab from '../../components/settings/pixels/PinterestTagTab';
import CustomScriptTab from '../../components/settings/pixels/CustomScriptTab';

type PixelTab = 'meta' | 'google' | 'tiktok' | 'snapchat' | 'pinterest' | 'custom';

const AnalyticsPage = () => {
  const { businessId, loading } = useBusiness();
  const { loading: rbacLoading } = useRBAC();
  const [activeTab, setActiveTab] = useState<PixelTab>('meta');
  const [pixelData, setPixelData] = useState<PixelData>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs: Array<{ id: PixelTab; label: string; icon: string }> = [
    { id: 'meta', label: 'Meta Pixel', icon: 'facebook' },
    { id: 'google', label: 'Google Tag', icon: 'analytics' },
    { id: 'tiktok', label: 'TikTok Pixel', icon: 'video_library' },
    { id: 'snapchat', label: 'Snapchat Pixel', icon: 'camera_alt' },
    { id: 'pinterest', label: 'Pinterest Tag', icon: 'bookmark' },
    { id: 'custom', label: 'Custom Scripts', icon: 'code' }
  ];

  useEffect(() => {
    if (businessId) {
      loadPixelData();
    }
  }, [businessId]);

  const loadPixelData = async () => {
    if (!businessId) {
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      const pixelDocRef = doc(db, 'tenants', businessId, 'pixels', 'config');
      const pixelDoc = await getDoc(pixelDocRef);
      
      if (pixelDoc.exists()) {
        const data = pixelDoc.data() as PixelData & { [key: string]: unknown };
        // Convert Firestore timestamps to Date objects if needed
        const convertDate = (val: unknown): Date => {
          if (val instanceof Date) return val;
          if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
            return (val as { toDate: () => Date }).toDate();
          }
          return new Date();
        };
        const processedData: PixelData = {
          ...data,
          metaPixels: data.metaPixels?.map(p => ({
            ...p,
            createdAt: convertDate(p.createdAt)
          })),
          googleTags: data.googleTags?.map(t => ({
            ...t,
            createdAt: convertDate(t.createdAt)
          })),
          tiktokPixels: data.tiktokPixels?.map(p => ({
            ...p,
            createdAt: convertDate(p.createdAt)
          })),
          snapchatPixels: data.snapchatPixels?.map(p => ({
            ...p,
            createdAt: convertDate(p.createdAt)
          })),
          pinterestTags: data.pinterestTags?.map(t => ({
            ...t,
            createdAt: convertDate(t.createdAt)
          })),
          customScripts: data.customScripts?.map(s => ({
            ...s,
            createdAt: convertDate(s.createdAt)
          })),
        };
        setPixelData(processedData);
      } else {
        setPixelData({});
      }
    } catch (error) {
      console.error('[AnalyticsPage] Error loading pixel data:', error);
      setPixelData({});
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async (updatedData: Partial<PixelData>): Promise<boolean> => {
    if (!businessId) {
      alert('Business ID is required');
      return false;
    }

    try {
      setSaving(true);
      const pixelDocRef = doc(db, 'tenants', businessId, 'pixels', 'config');
      
      const dataToSave = {
        ...pixelData,
        ...updatedData,
        updatedAt: new Date(),
      };

      await setDoc(pixelDocRef, dataToSave, { merge: true });
      setPixelData(dataToSave);
      
      return true;
    } catch (error) {
      console.error('[AnalyticsPage] Error saving pixel data:', error);
      alert('Failed to save pixel settings. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading || rbacLoading || loadingData) {
    return <FullScreenLoader message="Loading analytics settings..." />;
  }

  return (
    <PermissionGuard
      permission="settings_integrations"
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">lock</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">Access Denied</p>
          <p className="text-sm text-madas-text/60">
            You don't have permission to access analytics settings. Please contact your administrator.
          </p>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-8">
        <header>
          <h1 className="text-3xl font-semibold text-primary">Analytics</h1>
          <p className="text-sm text-madas-text/70">Manage tracking pixels and analytics scripts for your website.</p>
        </header>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <nav className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-base hover:text-primary'
                }`}
              >
                <span className="material-icons text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <main>
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              {activeTab === 'meta' && (
                <MetaPixelTab
                  pixels={pixelData.metaPixels || []}
                  onSave={(pixels) => handleSave({ metaPixels: pixels })}
                  saving={saving}
                />
              )}

              {activeTab === 'google' && (
                <GoogleTagTab
                  tags={pixelData.googleTags || []}
                  onSave={(tags) => handleSave({ googleTags: tags })}
                  saving={saving}
                />
              )}

              {activeTab === 'tiktok' && (
                <TikTokPixelTab
                  pixels={pixelData.tiktokPixels || []}
                  onSave={(pixels) => handleSave({ tiktokPixels: pixels })}
                  saving={saving}
                />
              )}

              {activeTab === 'snapchat' && (
                <SnapchatPixelTab
                  pixels={pixelData.snapchatPixels || []}
                  onSave={(pixels) => handleSave({ snapchatPixels: pixels })}
                  saving={saving}
                />
              )}

              {activeTab === 'pinterest' && (
                <PinterestTagTab
                  tags={pixelData.pinterestTags || []}
                  onSave={(tags) => handleSave({ pinterestTags: tags })}
                  saving={saving}
                />
              )}

              {activeTab === 'custom' && (
                <CustomScriptTab
                  scripts={pixelData.customScripts || []}
                  onSave={(scripts) => handleSave({ customScripts: scripts })}
                  saving={saving}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default AnalyticsPage;

