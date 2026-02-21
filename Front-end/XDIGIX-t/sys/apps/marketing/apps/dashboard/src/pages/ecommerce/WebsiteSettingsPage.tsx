import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { doc, db, getDoc, updateDoc, storage, ref, uploadBytes, getDownloadURL } from '../../lib/firebase';
import FullScreenLoader from '../../components/common/FullScreenLoader';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

type PageContent = {
  enabled: boolean;
  title: string;
  content: string;
  lastUpdated?: string;
  faqItems?: FAQItem[];
};

type SiteSettings = {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    discountColor: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    twitterSite?: string;
    canonicalUrl?: string;
    robots?: string;
    favicon?: string;
    googleSiteVerification?: string;
  };
  analytics: {
    enabled: boolean;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    custom?: Array<{
      id: string;
      name: string;
      url: string;
      icon: string; // Font Awesome class like 'fa-brands fa-snapchat'
    }>;
  };
  customCode: {
    headCode?: string;
    bodyCode?: string;
  };
  deliveryInfo?: {
    freeDeliveryText?: string;
    freeDeliveryThreshold?: number;
    standardDeliveryText?: string;
    returnsText?: string;
    freeDeliveryLink?: string;
    standardDeliveryLink?: string;
  };
  pages: {
    aboutUs: PageContent;
    privacyPolicy: PageContent;
    termsOfService: PageContent;
    faq: PageContent;
    shippingPolicy: PageContent;
    returnPolicy: PageContent;
  };
};

const defaultPageContent: PageContent = {
  enabled: false,
  title: '',
  content: ''
};

const WebsiteSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const siteId = searchParams.get('siteId');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'seo' | 'pages' | 'analytics' | 'advanced'>('general');
  const [previewPage, setPreviewPage] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [settings, setSettings] = useState<SiteSettings>({
    theme: {
      primaryColor: '#27491F',
      secondaryColor: '#F0CAE1',
      backgroundColor: '#FFFFFF',
      textColor: '#171817',
      discountColor: '#dc2626'
    },
    seo: {
      title: '',
      description: '',
      keywords: [],
      ogImage: '',
      ogTitle: '',
      googleSiteVerification: '',
      ogDescription: '',
      twitterCard: 'summary_large_image',
      twitterSite: '',
      canonicalUrl: '',
      robots: 'index, follow',
      favicon: ''
    },
    analytics: {
      enabled: false,
      googleAnalyticsId: '',
      facebookPixelId: ''
    },
    socialLinks: {},
    customCode: {},
    deliveryInfo: {
      freeDeliveryText: 'Free Delivery over {amount}',
      freeDeliveryThreshold: 500,
      standardDeliveryText: 'Standard Delivery: within 2-5 Business Days',
      returnsText: 'Secure transactions with hassle free 14 days returns.',
      freeDeliveryLink: '',
      standardDeliveryLink: ''
    },
    pages: {
      aboutUs: { ...defaultPageContent, title: 'About Us' },
      privacyPolicy: { ...defaultPageContent, title: 'Privacy Policy' },
      termsOfService: { ...defaultPageContent, title: 'Terms of Service' },
      faq: { ...defaultPageContent, title: 'Frequently Asked Questions' },
      shippingPolicy: { ...defaultPageContent, title: 'Shipping Policy' },
      returnPolicy: { ...defaultPageContent, title: 'Return Policy' }
    }
  });
  const [keywordsInput, setKeywordsInput] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!businessId || !siteId) {
        setLoading(false);
        return;
      }

      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const siteSettings = data.settings || {};
          setSiteName(data.name || 'My Store');
          
          setSettings({
            theme: {
              primaryColor: siteSettings.theme?.primaryColor || '#27491F',
              secondaryColor: siteSettings.theme?.secondaryColor || '#F0CAE1',
              backgroundColor: siteSettings.theme?.backgroundColor || '#FFFFFF',
              textColor: siteSettings.theme?.textColor || '#171817',
              discountColor: siteSettings.theme?.discountColor || '#dc2626'
            },
            seo: {
              title: siteSettings.seo?.title || data.name || '',
              description: siteSettings.seo?.description || '',
              keywords: siteSettings.seo?.keywords || [],
              ogImage: siteSettings.seo?.ogImage || '',
              ogTitle: siteSettings.seo?.ogTitle || '',
              ogDescription: siteSettings.seo?.ogDescription || '',
              twitterCard: siteSettings.seo?.twitterCard || 'summary_large_image',
              twitterSite: siteSettings.seo?.twitterSite || '',
              canonicalUrl: siteSettings.seo?.canonicalUrl || '',
              robots: siteSettings.seo?.robots || 'index, follow',
              favicon: siteSettings.seo?.favicon || '',
              googleSiteVerification: siteSettings.seo?.googleSiteVerification || ''
            },
            analytics: {
              enabled: siteSettings.analytics?.enabled || false,
              googleAnalyticsId: siteSettings.analytics?.googleAnalyticsId || '',
              facebookPixelId: siteSettings.analytics?.facebookPixelId || ''
            },
            socialLinks: siteSettings.socialLinks || {},
            customCode: siteSettings.customCode || {},
            deliveryInfo: {
              freeDeliveryText: siteSettings.deliveryInfo?.freeDeliveryText ?? 'Free Delivery over {amount}',
              freeDeliveryThreshold: siteSettings.deliveryInfo?.freeDeliveryThreshold ?? 500,
              standardDeliveryText: siteSettings.deliveryInfo?.standardDeliveryText ?? 'Standard Delivery: within 2-5 Business Days',
              returnsText: siteSettings.deliveryInfo?.returnsText ?? 'Secure transactions with hassle free 14 days returns.',
              freeDeliveryLink: siteSettings.deliveryInfo?.freeDeliveryLink ?? '',
              standardDeliveryLink: siteSettings.deliveryInfo?.standardDeliveryLink ?? ''
            },
            pages: {
              aboutUs: siteSettings.pages?.aboutUs || { ...defaultPageContent, title: 'About Us' },
              privacyPolicy: siteSettings.pages?.privacyPolicy || { ...defaultPageContent, title: 'Privacy Policy' },
              termsOfService: siteSettings.pages?.termsOfService || { ...defaultPageContent, title: 'Terms of Service' },
              faq: siteSettings.pages?.faq || { ...defaultPageContent, title: 'Frequently Asked Questions' },
              shippingPolicy: siteSettings.pages?.shippingPolicy || { ...defaultPageContent, title: 'Shipping Policy' },
              returnPolicy: siteSettings.pages?.returnPolicy || { ...defaultPageContent, title: 'Return Policy' }
            }
          });

          setKeywordsInput((siteSettings.seo?.keywords || []).join(', '));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [businessId, siteId]);

  const handleSave = async () => {
    if (!businessId || !siteId) return;

    setSaving(true);
    try {
      const keywords = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const updatedSettings: SiteSettings = {
        ...settings,
        seo: {
          ...settings.seo,
          keywords
        }
      };

      const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
      await updateDoc(siteRef, {
        settings: updatedSettings,
        updatedAt: new Date()
      });

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePageSetting = (page: keyof SiteSettings['pages'], field: keyof PageContent, value: any) => {
    setSettings(prev => ({
      ...prev,
      pages: {
        ...prev.pages,
        [page]: {
          ...prev.pages[page],
          [field]: value,
          lastUpdated: new Date().toISOString()
        }
      }
    }));
  };

  const openPreview = (pageKey: string) => {
    const baseUrl = `https://xdigix.com/site/${siteId}`;
    const pageUrls: Record<string, string> = {
      aboutUs: `${baseUrl}/about-us`,
      privacyPolicy: `${baseUrl}/privacy-policy`,
      termsOfService: `${baseUrl}/terms-of-service`,
      faq: `${baseUrl}/faq`,
      shippingPolicy: `${baseUrl}/shipping-policy`,
      returnPolicy: `${baseUrl}/return-policy`
    };
    window.open(pageUrls[pageKey], '_blank');
  };

  // Handle favicon upload
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId || !siteId) return;
    
    // Validate file type
    const validTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'image/jpeg', 'image/gif'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      alert('Please upload a valid image file (PNG, ICO, SVG, JPG, or GIF)');
      return;
    }
    
    // Validate file size (max 500KB for favicon)
    if (file.size > 500 * 1024) {
      alert('Favicon should be less than 500KB');
      return;
    }
    
    setUploadingFavicon(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.substring(file.name.lastIndexOf('.')) || '.png';
      const fileName = `${timestamp}-favicon${ext}`;
      const storageRef = ref(storage, `businesses/${businessId}/website-images/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setSettings((prev) => ({
        ...prev,
        seo: { ...prev.seo, favicon: downloadURL }
      }));
    } catch (error) {
      console.error('Error uploading favicon:', error);
      alert('Failed to upload favicon. Please try again.');
    } finally {
      setUploadingFavicon(false);
    }
  };

  if (loading) {
    return <FullScreenLoader message="Loading settings..." />;
  }

  if (!siteId) {
    return (
      <div className="space-y-6 px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-800">No site selected. Please select a site from the website builder.</p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="mt-4 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
          >
            Go to Website Builder
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: 'palette' },
    { id: 'seo', label: 'SEO', icon: 'search' },
    { id: 'pages', label: 'Pages', icon: 'description' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'advanced', label: 'Advanced', icon: 'code' }
  ];

  const pageConfigs = [
    { key: 'aboutUs', label: 'About Us', icon: 'info', description: 'Tell your story and brand mission' },
    { key: 'privacyPolicy', label: 'Privacy Policy', icon: 'privacy_tip', description: 'How you handle customer data' },
    { key: 'termsOfService', label: 'Terms of Service', icon: 'gavel', description: 'Legal terms for using your store' },
    { key: 'faq', label: 'FAQ', icon: 'help', description: 'Frequently asked questions' },
    { key: 'shippingPolicy', label: 'Shipping Policy', icon: 'local_shipping', description: 'Shipping information and rates' },
    { key: 'returnPolicy', label: 'Return Policy', icon: 'assignment_return', description: 'Return and refund policies' }
  ];

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Website Settings</h1>
          <p className="text-sm text-madas-text/70">Configure your website settings for <span className="font-medium">{siteName}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open(`https://xdigix.com/site/${siteId}`, '_blank')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">visibility</span>
            Preview Site
          </button>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">arrow_back</span>
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-white px-6 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="material-icons animate-spin text-base">progress_activity</span>
                Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-madas-text/60 hover:text-madas-text/80 hover:border-gray-300'
              }`}
            >
              <span className="material-icons text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              {/* Theme Settings */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4">Theme Colors</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryColor: e.target.value }
                          }))
                        }
                        className="w-16 h-10 rounded border border-gray-200"
                      />
                      <input
                        type="text"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryColor: e.target.value }
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.secondaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, secondaryColor: e.target.value }
                          }))
                        }
                        className="w-16 h-10 rounded border border-gray-200"
                      />
                      <input
                        type="text"
                        value={settings.theme.secondaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, secondaryColor: e.target.value }
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.backgroundColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, backgroundColor: e.target.value }
                          }))
                        }
                        className="w-16 h-10 rounded border border-gray-200"
                      />
                      <input
                        type="text"
                        value={settings.theme.backgroundColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, backgroundColor: e.target.value }
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.textColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, textColor: e.target.value }
                          }))
                        }
                        className="w-16 h-10 rounded border border-gray-200"
                      />
                      <input
                        type="text"
                        value={settings.theme.textColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, textColor: e.target.value }
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1 text-red-500">local_offer</span>
                      Discount/Sale Price Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.discountColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, discountColor: e.target.value }
                          }))
                        }
                        className="w-16 h-10 rounded border border-gray-200"
                      />
                      <input
                        type="text"
                        value={settings.theme.discountColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, discountColor: e.target.value }
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Color for sale prices and discount badges</p>
                  </div>
                </div>
              </section>

              {/* Social Links */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4">Social Media Links</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">facebook</span>
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.facebook || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                        }))
                      }
                      placeholder="https://facebook.com/yourpage"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">photo_camera</span>
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.instagram || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                        }))
                      }
                      placeholder="https://instagram.com/yourpage"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">tag</span>
                      Twitter/X
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.twitter || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                        }))
                      }
                      placeholder="https://twitter.com/yourpage"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">smart_display</span>
                      TikTok
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.tiktok || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, tiktok: e.target.value }
                        }))
                      }
                      placeholder="https://tiktok.com/@yourpage"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">play_circle</span>
                      YouTube
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.youtube || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                        }))
                      }
                      placeholder="https://youtube.com/@yourchannel"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-base align-middle mr-1">work</span>
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={settings.socialLinks.linkedin || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                        }))
                      }
                      placeholder="https://linkedin.com/company/yourcompany"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Custom Social Links */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-madas-text">Custom Social Links</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newCustomLink = {
                          id: Date.now().toString(),
                          name: '',
                          url: '',
                          icon: 'fa-brands fa-'
                        };
                        setSettings((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...prev.socialLinks,
                            custom: [...(prev.socialLinks.custom || []), newCustomLink]
                          }
                        }));
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      <span className="material-icons text-sm">add</span>
                      Add Social Link
                    </button>
                  </div>
                  
                  {(settings.socialLinks.custom || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <span className="material-icons text-4xl mb-2">share</span>
                      <p className="text-sm">No custom social links added yet</p>
                      <p className="text-xs mt-1">Click "Add Social Link" to add platforms like Snapchat, WhatsApp, etc.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(settings.socialLinks.custom || []).map((link, index) => (
                        <div key={link.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {link.icon && link.icon !== 'fa-brands fa-' ? (
                                <i className={`${link.icon} text-lg text-gray-600`}></i>
                              ) : (
                                <span className="material-icons text-gray-400">link</span>
                              )}
                              <span className="font-medium text-sm">{link.name || 'New Link'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSettings((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...prev.socialLinks,
                                    custom: (prev.socialLinks.custom || []).filter((_, i) => i !== index)
                                  }
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <span className="material-icons text-sm">delete</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Platform Name</label>
                              <input
                                type="text"
                                value={link.name}
                                onChange={(e) => {
                                  const newCustom = [...(settings.socialLinks.custom || [])];
                                  newCustom[index] = { ...newCustom[index], name: e.target.value };
                                  setSettings((prev) => ({
                                    ...prev,
                                    socialLinks: { ...prev.socialLinks, custom: newCustom }
                                  }));
                                }}
                                placeholder="Snapchat"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">URL</label>
                              <input
                                type="url"
                                value={link.url}
                                onChange={(e) => {
                                  const newCustom = [...(settings.socialLinks.custom || [])];
                                  newCustom[index] = { ...newCustom[index], url: e.target.value };
                                  setSettings((prev) => ({
                                    ...prev,
                                    socialLinks: { ...prev.socialLinks, custom: newCustom }
                                  }));
                                }}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Font Awesome Icon
                                <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">
                                  (Browse)
                                </a>
                              </label>
                              <input
                                type="text"
                                value={link.icon}
                                onChange={(e) => {
                                  const newCustom = [...(settings.socialLinks.custom || [])];
                                  newCustom[index] = { ...newCustom[index], icon: e.target.value };
                                  setSettings((prev) => ({
                                    ...prev,
                                    socialLinks: { ...prev.socialLinks, custom: newCustom }
                                  }));
                                }}
                                placeholder="fa-brands fa-snapchat"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2">
                            Examples: fa-brands fa-snapchat, fa-brands fa-whatsapp, fa-brands fa-pinterest, fa-brands fa-discord
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Product Page - Delivery & Returns */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
                  <span className="material-icons">local_shipping</span>
                  Product Page - Delivery & Returns
                </h2>
                <p className="text-sm text-madas-text/70 mb-4">
                  Edit the delivery and returns text shown on each product page.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Free Delivery Text</label>
                    <input
                      type="text"
                      value={settings.deliveryInfo?.freeDeliveryText || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliveryInfo: {
                            ...prev.deliveryInfo,
                            freeDeliveryText: e.target.value,
                            freeDeliveryThreshold: prev.deliveryInfo?.freeDeliveryThreshold ?? 500,
                            standardDeliveryText: prev.deliveryInfo?.standardDeliveryText ?? '',
                            returnsText: prev.deliveryInfo?.returnsText ?? ''
                          }
                        }))
                      }
                      placeholder="Free Delivery over {amount}"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {'{amount}'} as placeholder for threshold with currency</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Free Delivery Threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={settings.deliveryInfo?.freeDeliveryThreshold ?? 500}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliveryInfo: {
                            ...prev.deliveryInfo,
                            freeDeliveryThreshold: parseInt(e.target.value, 10) || 500,
                            freeDeliveryText: prev.deliveryInfo?.freeDeliveryText ?? '',
                            standardDeliveryText: prev.deliveryInfo?.standardDeliveryText ?? '',
                            returnsText: prev.deliveryInfo?.returnsText ?? ''
                          }
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Standard Delivery Text</label>
                    <input
                      type="text"
                      value={settings.deliveryInfo?.standardDeliveryText || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliveryInfo: {
                            ...prev.deliveryInfo,
                            standardDeliveryText: e.target.value,
                            freeDeliveryText: prev.deliveryInfo?.freeDeliveryText ?? '',
                            freeDeliveryThreshold: prev.deliveryInfo?.freeDeliveryThreshold ?? 500,
                            returnsText: prev.deliveryInfo?.returnsText ?? ''
                          }
                        }))
                      }
                      placeholder="Standard Delivery: within 2-5 Business Days"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Returns & Secure Transaction Text</label>
                    <input
                      type="text"
                      value={settings.deliveryInfo?.returnsText || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliveryInfo: {
                            ...prev.deliveryInfo,
                            returnsText: e.target.value,
                            freeDeliveryText: prev.deliveryInfo?.freeDeliveryText ?? '',
                            freeDeliveryThreshold: prev.deliveryInfo?.freeDeliveryThreshold ?? 500,
                            standardDeliveryText: prev.deliveryInfo?.standardDeliveryText ?? ''
                          }
                        }))
                      }
                      placeholder="Secure transactions with hassle free 14 days returns."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <>
              {/* Basic SEO */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4">Basic SEO</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Page Title</label>
                    <input
                      type="text"
                      value={settings.seo.title}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, title: e.target.value }
                        }))
                      }
                      placeholder="My Website"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="text-xs text-madas-text/60 mt-1">Recommended: 50-60 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Meta Description</label>
                    <textarea
                      value={settings.seo.description}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, description: e.target.value }
                        }))
                      }
                      placeholder="A brief description of your website"
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                    <p className="text-xs text-madas-text/60 mt-1">Recommended: 150-160 characters ({settings.seo.description.length}/160)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Canonical URL</label>
                    <input
                      type="url"
                      value={settings.seo.canonicalUrl || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, canonicalUrl: e.target.value }
                        }))
                      }
                      placeholder="https://yoursite.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Robots</label>
                    <select
                      value={settings.seo.robots || 'index, follow'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, robots: e.target.value }
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="index, follow">Index, Follow (Recommended)</option>
                      <option value="noindex, follow">No Index, Follow</option>
                      <option value="index, nofollow">Index, No Follow</option>
                      <option value="noindex, nofollow">No Index, No Follow</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-sm mr-1 align-middle">verified</span>
                      Google Site Verification
                    </label>
                    <input
                      type="text"
                      value={settings.seo.googleSiteVerification || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, googleSiteVerification: e.target.value }
                        }))
                      }
                      placeholder="Enter verification code (e.g., XM31uZKfuHTzY...)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                    />
                    <p className="text-xs text-madas-text/60 mt-1">
                      Get this from Google Search Console → Settings → Ownership verification → HTML tag
                    </p>
                  </div>
                </div>
              </section>

              {/* Open Graph / Social */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4">Social Media Preview</h2>
                <p className="text-sm text-madas-text/60 mb-4">Control how your website appears when shared on social media</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">OG Title</label>
                    <input
                      type="text"
                      value={settings.seo.ogTitle || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, ogTitle: e.target.value }
                        }))
                      }
                      placeholder="Leave empty to use page title"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">OG Description</label>
                    <textarea
                      value={settings.seo.ogDescription || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, ogDescription: e.target.value }
                        }))
                      }
                      placeholder="Leave empty to use meta description"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">OG Image URL</label>
                    <input
                      type="url"
                      value={settings.seo.ogImage || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, ogImage: e.target.value }
                        }))
                      }
                      placeholder="https://yoursite.com/og-image.jpg"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="text-xs text-madas-text/60 mt-1">Recommended: 1200x630 pixels</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Twitter Card Type</label>
                    <select
                      value={settings.seo.twitterCard || 'summary_large_image'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, twitterCard: e.target.value }
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary with Large Image</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      <span className="material-icons text-sm mr-1 align-middle">tab</span>
                      Favicon (Tab Icon)
                    </label>
                    <div className="flex items-start gap-4">
                      {/* Favicon Preview */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                          {settings.seo.favicon ? (
                            <img 
                              src={settings.seo.favicon} 
                              alt="Favicon" 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="material-icons text-2xl text-gray-300">image</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${uploadingFavicon ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span className="material-icons text-sm">{uploadingFavicon ? 'hourglass_empty' : 'upload'}</span>
                            <span className="text-sm">{uploadingFavicon ? 'Uploading...' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/png,image/x-icon,image/ico,image/svg+xml,image/jpeg,.ico"
                              onChange={handleFaviconUpload}
                              disabled={uploadingFavicon}
                              className="hidden"
                            />
                          </label>
                          {settings.seo.favicon && (
                            <button
                              type="button"
                              onClick={() => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, favicon: '' } }))}
                              className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove favicon"
                            >
                              <span className="material-icons text-sm">delete</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-madas-text/60">
                          Recommended: 32x32 or 64x64 pixels, PNG or ICO format
                        </p>
                        {/* URL Input as alternative */}
                        <input
                          type="url"
                          value={settings.seo.favicon || ''}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, favicon: e.target.value }
                            }))
                          }
                          placeholder="Or paste image URL..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SEO Preview */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-primary mb-4">Google Search Preview</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-blue-800 text-lg hover:underline cursor-pointer truncate">
                    {settings.seo.title || 'Page Title'}
                  </p>
                  <p className="text-green-700 text-sm">
                    {settings.seo.canonicalUrl || `https://xdigix.com/site/${siteId}`}
                  </p>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {settings.seo.description || 'Add a meta description to see how your page will appear in search results.'}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <span className="material-icons text-base align-middle mr-1">info</span>
                  Enable pages to create dedicated pages for your store. These pages will be automatically linked in your footer.
                </p>
              </div>
              
              {pageConfigs.map(({ key, label, icon, description }) => {
                const pageKey = key as keyof SiteSettings['pages'];
                const page = settings.pages[pageKey];
                const isFAQ = key === 'faq';
                
                // FAQ Item Management
                const addFAQItem = () => {
                  const currentItems = page.faqItems || [];
                  const newItem: FAQItem = {
                    id: `faq-${Date.now()}`,
                    question: '',
                    answer: ''
                  };
                  updatePageSetting(pageKey, 'faqItems', [...currentItems, newItem]);
                };

                const updateFAQItem = (itemId: string, field: 'question' | 'answer', value: string) => {
                  const currentItems = page.faqItems || [];
                  const updatedItems = currentItems.map(item =>
                    item.id === itemId ? { ...item, [field]: value } : item
                  );
                  updatePageSetting(pageKey, 'faqItems', updatedItems);
                };

                const removeFAQItem = (itemId: string) => {
                  const currentItems = page.faqItems || [];
                  updatePageSetting(pageKey, 'faqItems', currentItems.filter(item => item.id !== itemId));
                };

                const moveFAQItem = (index: number, direction: 'up' | 'down') => {
                  const currentItems = [...(page.faqItems || [])];
                  const newIndex = direction === 'up' ? index - 1 : index + 1;
                  if (newIndex < 0 || newIndex >= currentItems.length) return;
                  [currentItems[index], currentItems[newIndex]] = [currentItems[newIndex], currentItems[index]];
                  updatePageSetting(pageKey, 'faqItems', currentItems);
                };
                
                return (
                  <div key={key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${page.enabled ? 'bg-primary/10' : 'bg-gray-100'}`}>
                          <span className={`material-icons ${page.enabled ? 'text-primary' : 'text-gray-400'}`}>{icon}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-primary">{label}</h3>
                          <p className="text-xs text-madas-text/60">{description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {page.enabled && (
                          <button
                            type="button"
                            onClick={() => openPreview(key)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-madas-text/70 hover:bg-gray-100 transition-colors flex items-center gap-1"
                          >
                            <span className="material-icons text-sm">visibility</span>
                            Preview
                          </button>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.enabled}
                            onChange={(e) => updatePageSetting(pageKey, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                    
                    {page.enabled && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-madas-text/80 mb-2">Page Title</label>
                          <input
                            type="text"
                            value={page.title}
                            onChange={(e) => updatePageSetting(pageKey, 'title', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                        
                        {/* FAQ Page - Special Editor */}
                        {isFAQ ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-madas-text/80">Questions & Answers</label>
                              <button
                                type="button"
                                onClick={addFAQItem}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-[#1f3c19] transition-colors"
                              >
                                <span className="material-icons text-sm">add</span>
                                Add Question
                              </button>
                            </div>
                            
                            {(!page.faqItems || page.faqItems.length === 0) && (
                              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <span className="material-icons text-4xl text-gray-300 mb-2">help_outline</span>
                                <p className="text-sm text-madas-text/50">No questions added yet</p>
                                <button
                                  type="button"
                                  onClick={addFAQItem}
                                  className="mt-3 text-sm text-primary font-medium hover:underline"
                                >
                                  + Add your first question
                                </button>
                              </div>
                            )}
                            
                            {page.faqItems?.map((item, index) => (
                              <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                                  <span className="text-xs font-medium text-madas-text/60">Question {index + 1}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveFAQItem(index, 'up')}
                                      disabled={index === 0}
                                      className="p-1 text-madas-text/40 hover:text-madas-text/70 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <span className="material-icons text-sm">keyboard_arrow_up</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveFAQItem(index, 'down')}
                                      disabled={index === (page.faqItems?.length || 0) - 1}
                                      className="p-1 text-madas-text/40 hover:text-madas-text/70 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <span className="material-icons text-sm">keyboard_arrow_down</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeFAQItem(item.id)}
                                      className="p-1 text-red-400 hover:text-red-600"
                                    >
                                      <span className="material-icons text-sm">delete</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="p-4 space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-madas-text/60 mb-1">Question</label>
                                    <input
                                      type="text"
                                      value={item.question}
                                      onChange={(e) => updateFAQItem(item.id, 'question', e.target.value)}
                                      placeholder="Enter your question..."
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-madas-text/60 mb-1">Answer</label>
                                    <textarea
                                      value={item.answer}
                                      onChange={(e) => updateFAQItem(item.id, 'answer', e.target.value)}
                                      placeholder="Enter the answer..."
                                      rows={3}
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Other Pages - Standard Content Editor */
                          <div>
                            <label className="block text-sm font-medium text-madas-text/80 mb-2">Content</label>
                            <textarea
                              value={page.content}
                              onChange={(e) => updatePageSetting(pageKey, 'content', e.target.value)}
                              placeholder={`Write your ${label.toLowerCase()} content here... You can use basic HTML tags for formatting.`}
                              rows={10}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y font-mono"
                            />
                            <p className="text-xs text-madas-text/60 mt-1">
                              Supports HTML: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;
                            </p>
                          </div>
                        )}
                        
                        {page.lastUpdated && (
                          <p className="text-xs text-madas-text/50">
                            Last updated: {new Date(page.lastUpdated).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary mb-4">Analytics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-madas-text/80">Enable Analytics</p>
                    <p className="text-xs text-madas-text/60">Track website visitors and behavior</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.analytics.enabled}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          analytics: { ...prev.analytics, enabled: e.target.checked }
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.analytics.enabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-madas-text/80 mb-2">
                        <span className="material-icons text-base align-middle mr-1 text-orange-500">analytics</span>
                        Google Analytics ID
                      </label>
                      <input
                        type="text"
                        value={settings.analytics.googleAnalyticsId || ''}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            analytics: { ...prev.analytics, googleAnalyticsId: e.target.value }
                          }))
                        }
                        placeholder="G-XXXXXXXXXX"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-madas-text/80 mb-2">
                        <span className="material-icons text-base align-middle mr-1 text-blue-600">facebook</span>
                        Facebook Pixel ID
                      </label>
                      <input
                        type="text"
                        value={settings.analytics.facebookPixelId || ''}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            analytics: { ...prev.analytics, facebookPixelId: e.target.value }
                          }))
                        }
                        placeholder="123456789012345"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-primary mb-4">Custom Code</h2>
              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <span className="material-icons text-base align-middle mr-1">warning</span>
                  Be careful when adding custom code. Invalid code may break your website.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Head Code</label>
                  <textarea
                    value={settings.customCode.headCode || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        customCode: { ...prev.customCode, headCode: e.target.value }
                      }))
                    }
                    placeholder="<!-- Custom code for <head> section -->"
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                  />
                  <p className="text-xs text-madas-text/60 mt-1">Code added to the &lt;head&gt; section. Good for meta tags, fonts, styles.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">Body Code</label>
                  <textarea
                    value={settings.customCode.bodyCode || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        customCode: { ...prev.customCode, bodyCode: e.target.value }
                      }))
                    }
                    placeholder="<!-- Custom code before </body> -->"
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                  />
                  <p className="text-xs text-madas-text/60 mt-1">Code added before &lt;/body&gt; tag. Good for scripts, chat widgets.</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sticky top-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/builder?siteId=${siteId}`)}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
                >
                  <span className="material-icons text-base mr-2 align-middle">edit</span>
                  Open Builder
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/ecommerce/templates?siteId=${siteId}`)}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
                >
                  <span className="material-icons text-base mr-2 align-middle">view_module</span>
                  Browse Templates
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/ecommerce/visit-store')}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
                >
                  <span className="material-icons text-base mr-2 align-middle">storefront</span>
                  View Published Sites
                </button>
              </div>
            </div>

            {/* Enabled Pages */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">Enabled Pages</h3>
              <div className="space-y-2">
                {pageConfigs.filter(p => settings.pages[p.key as keyof SiteSettings['pages']].enabled).length === 0 ? (
                  <p className="text-sm text-madas-text/50 text-center py-4">No pages enabled yet</p>
                ) : (
                  pageConfigs
                    .filter(p => settings.pages[p.key as keyof SiteSettings['pages']].enabled)
                    .map(({ key, label, icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openPreview(key)}
                        className="w-full text-left rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors flex items-center justify-between"
                      >
                        <span>
                          <span className="material-icons text-base mr-2 align-middle">{icon}</span>
                          {label}
                        </span>
                        <span className="material-icons text-base text-madas-text/40">open_in_new</span>
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* SEO Score */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">SEO Score</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`material-icons text-lg ${settings.seo.title ? 'text-green-500' : 'text-red-500'}`}>
                    {settings.seo.title ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="text-sm text-madas-text/70">Page Title</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-icons text-lg ${settings.seo.description ? 'text-green-500' : 'text-red-500'}`}>
                    {settings.seo.description ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="text-sm text-madas-text/70">Meta Description</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-icons text-lg ${keywordsInput ? 'text-green-500' : 'text-yellow-500'}`}>
                    {keywordsInput ? 'check_circle' : 'warning'}
                  </span>
                  <span className="text-sm text-madas-text/70">Keywords</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-icons text-lg ${settings.seo.ogImage ? 'text-green-500' : 'text-yellow-500'}`}>
                    {settings.seo.ogImage ? 'check_circle' : 'warning'}
                  </span>
                  <span className="text-sm text-madas-text/70">Social Image</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WebsiteSettingsPage;
