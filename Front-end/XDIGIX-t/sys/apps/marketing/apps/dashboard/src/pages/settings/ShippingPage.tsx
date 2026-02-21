import { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { doc, getDoc, setDoc, db } from '../../lib/firebase';

type ShippingTab = 'bosta' | 'aramex' | 'dhl' | 'fedex' | 'ups' | 'local' | 'regions';

interface ShippingProvider {
  enabled: boolean;
  accountNumber?: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  testMode?: boolean;
  defaultService?: string;
}

interface BostaProvider {
  enabled: boolean;
  apiKey?: string;
  businessId?: string;
  countryId?: string;
  testMode?: boolean;
  defaultPickupLocationId?: string;
  webhookUrl?: string;
}

interface ShippingRegion {
  id: string;
  name: string;
  countries: string[];
  governorates: string[];
  enabled: boolean;
  shippingRate: number;
  freeShippingThreshold?: number;
  estimatedDays: string;
  priority: number;
}

interface ShippingException {
  id: string;
  name: string;
  type: 'product' | 'category' | 'location' | 'weight';
  condition: string;
  action: 'block' | 'surcharge' | 'free' | 'custom_rate';
  value?: number;
  enabled: boolean;
}

interface RegionsData {
  enabled: boolean;
  regions: ShippingRegion[];
  exceptions: ShippingException[];
  defaultRate: number;
  defaultEstimatedDays: string;
}

interface ShippingData {
  bosta?: BostaProvider;
  aramex?: ShippingProvider;
  dhl?: ShippingProvider;
  fedex?: ShippingProvider;
  ups?: ShippingProvider;
  local?: {
    enabled: boolean;
    providers: Array<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      zones: string[];
      flatRate?: number;
      active: boolean;
    }>;
  };
  regions?: RegionsData;
  updatedAt?: Date;
}

const ShippingPage = () => {
  const { businessId, loading } = useBusiness();
  const { loading: rbacLoading } = useRBAC();
  const [activeTab, setActiveTab] = useState<ShippingTab>('regions');
  const [shippingData, setShippingData] = useState<ShippingData>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs: Array<{ id: ShippingTab; label: string; icon: string; color: string }> = [
    { id: 'regions', label: 'Regions & Exceptions', icon: 'public', color: 'text-blue-600' },
    { id: 'bosta', label: 'Bosta', icon: 'local_shipping', color: 'text-red-600' },
    { id: 'aramex', label: 'Aramex', icon: 'flight_takeoff', color: 'text-orange-600' },
    { id: 'dhl', label: 'DHL', icon: 'local_shipping', color: 'text-yellow-600' },
    { id: 'fedex', label: 'FedEx', icon: 'flight', color: 'text-purple-600' },
    { id: 'ups', label: 'UPS', icon: 'inventory_2', color: 'text-amber-700' },
    { id: 'local', label: 'Local Providers', icon: 'delivery_dining', color: 'text-green-600' }
  ];

  useEffect(() => {
    if (businessId) {
      loadShippingData();
    }
  }, [businessId]);

  const loadShippingData = async () => {
    if (!businessId) {
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      const shippingDocRef = doc(db, 'tenants', businessId, 'settings', 'shipping');
      const shippingDoc = await getDoc(shippingDocRef);

      if (shippingDoc.exists()) {
        setShippingData(shippingDoc.data() as ShippingData);
      } else {
        setShippingData({
          bosta: { enabled: false, testMode: true, countryId: '60e4482c7cb7d4bc4849c4d5' },
          aramex: { enabled: false, testMode: true },
          dhl: { enabled: false, testMode: true },
          fedex: { enabled: false, testMode: true },
          ups: { enabled: false, testMode: true },
          local: { enabled: false, providers: [] },
          regions: { enabled: true, regions: [], exceptions: [], defaultRate: 50, defaultEstimatedDays: '3-5 days' }
        });
      }
    } catch (error) {
      console.error('[ShippingPage] Error loading shipping data:', error);
      setShippingData({});
    } finally {
      setLoadingData(false);
    }
  };

  // Sanitize data to remove undefined values (Firebase doesn't accept undefined)
  const sanitizeData = <T extends Record<string, unknown>>(obj: T): T => {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue; // Skip undefined values
      }
      
      if (value === null) {
        result[key] = null; // Keep null values
      } else if (Array.isArray(value)) {
        // Sanitize arrays
        result[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? sanitizeData(item as Record<string, unknown>)
            : item
        );
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        // Recursively sanitize nested objects
        result[key] = sanitizeData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    
    return result as T;
  };

  const handleSave = async (provider: ShippingTab, data: ShippingProvider | BostaProvider | ShippingData['local'] | RegionsData) => {
    if (!businessId) {
      alert('Business ID is required');
      return;
    }

    try {
      setSaving(true);
      const shippingDocRef = doc(db, 'tenants', businessId, 'settings', 'shipping');

      const updatedData = {
        ...shippingData,
        [provider]: data,
        updatedAt: new Date()
      };

      // Sanitize data to remove undefined values before saving
      const sanitizedData = sanitizeData(updatedData as Record<string, unknown>);

      await setDoc(shippingDocRef, sanitizedData, { merge: true });
      setShippingData(updatedData);
      alert('Shipping settings saved successfully!');
    } catch (error) {
      console.error('[ShippingPage] Error saving shipping data:', error);
      alert('Failed to save shipping settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || rbacLoading || loadingData) {
    return <FullScreenLoader message="Loading shipping settings..." />;
  }

  return (
    <PermissionGuard
      permission="settings_shipping"
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">lock</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">Access Denied</p>
          <p className="text-sm text-madas-text/60">
            You don't have permission to access shipping settings. Please contact your administrator.
          </p>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-8">
        <header>
          <h1 className="text-3xl font-semibold text-primary">Shipping Integrations</h1>
          <p className="text-sm text-madas-text/70">Configure shipping carriers and delivery providers for your store.</p>
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
                <span className={`material-icons text-base ${activeTab === tab.id ? 'text-white' : tab.color}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <main>
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              {activeTab === 'bosta' && (
                <BostaTab
                  data={shippingData.bosta || { enabled: false, testMode: true, countryId: '60e4482c7cb7d4bc4849c4d5' }}
                  onSave={(data) => handleSave('bosta', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'aramex' && (
                <AramexTab
                  data={shippingData.aramex || { enabled: false, testMode: true }}
                  onSave={(data) => handleSave('aramex', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'dhl' && (
                <DHLTab
                  data={shippingData.dhl || { enabled: false, testMode: true }}
                  onSave={(data) => handleSave('dhl', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'fedex' && (
                <FedExTab
                  data={shippingData.fedex || { enabled: false, testMode: true }}
                  onSave={(data) => handleSave('fedex', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'ups' && (
                <UPSTab
                  data={shippingData.ups || { enabled: false, testMode: true }}
                  onSave={(data) => handleSave('ups', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'local' && (
                <LocalProvidersTab
                  data={shippingData.local || { enabled: false, providers: [] }}
                  onSave={(data) => handleSave('local', data)}
                  saving={saving}
                />
              )}

              {activeTab === 'regions' && (
                <RegionsTab
                  data={shippingData.regions || { enabled: true, regions: [], exceptions: [], defaultRate: 50, defaultEstimatedDays: '3-5 days' }}
                  onSave={(data) => handleSave('regions', data)}
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

// Bosta Tab Component
interface BostaTabProps {
  data: BostaProvider;
  onSave: (data: BostaProvider) => void;
  saving: boolean;
}

// Bosta Logo SVG Component
const BostaLogo = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 111 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273ZM30.2116 19.9649L24.715 16.8069L30.2116 13.6488V19.9649ZM16.8458 3.66139L28.7485 10.5302L16.8458 17.399L4.90345 10.5302L16.8458 3.66139ZM3.44032 13.6093L8.93695 16.7674L3.44032 19.9255V13.6093ZM16.8458 29.9129L4.90345 23.0441L12.3377 18.7412L15.8176 20.7545C16.134 20.9124 16.4503 21.0308 16.8062 21.0308C17.1621 21.0308 17.4785 20.9518 17.7948 20.7545L21.2747 18.7412L28.709 23.0441L16.8458 29.9129Z" fill="#E30613"/>
    <path d="M65.6826 11.7934C61.57 11.7934 58.7229 14.5962 58.7229 18.6228C58.7229 22.6493 61.57 25.4521 65.6431 25.4521C69.7556 25.4521 72.6028 22.6493 72.6028 18.6228C72.6028 14.5962 69.7556 11.7934 65.6826 11.7934ZM65.6826 22.3335C63.5472 22.3335 62.2027 20.8729 62.2027 18.6228C62.2027 16.3726 63.5868 14.912 65.6826 14.912C67.7389 14.912 69.1625 16.4121 69.1625 18.6228C69.1229 20.8334 67.7389 22.3335 65.6826 22.3335Z" fill="#E30613"/>
    <path d="M80.2743 17.2016C78.653 16.9648 77.2294 16.7674 77.2294 15.6621C77.2294 15.1094 77.6249 14.3988 79.4439 14.3988C80.907 14.3988 81.9747 15.0304 82.2911 16.1358L85.415 15.4252C84.7428 13.0567 82.6865 11.7539 79.6416 11.7539C76.2408 11.7539 73.9473 13.333 73.9473 15.7015C73.9473 19.0175 76.8735 19.4123 79.2462 19.7676C80.907 20.0044 82.3701 20.2018 82.3701 21.3861C82.3701 22.0177 81.8956 22.7677 79.6416 22.7677C77.9412 22.7677 76.7944 22.1361 76.4385 20.9913L73.3146 21.6229C74.0264 24.0704 76.1617 25.3731 79.5625 25.3731C83.3192 25.3731 85.6918 23.7941 85.6918 21.2676C85.7314 17.9911 82.7261 17.5569 80.2743 17.2016Z" fill="#E30613"/>
    <path d="M92.2562 22.4914C91.228 22.4914 90.6348 21.7808 90.6348 20.5571V15.0305H95.9338V12.1487H90.6348V8.12217H87.1945V20.5965C87.1945 23.7151 88.9344 25.4916 91.9398 25.4916C94.5497 25.4916 96.2501 24.3073 96.8433 22.0966L94.0752 21.2282C93.7588 22.0177 93.1261 22.4914 92.2562 22.4914Z" fill="#E30613"/>
    <path d="M107.639 13.8067L107.52 13.6488C106.65 12.425 105.227 11.7934 103.328 11.7934C99.8486 11.7934 97.3573 14.6752 97.3573 18.6227C97.3573 22.6098 99.8486 25.4916 103.249 25.4916C105.147 25.4916 106.571 24.8205 107.481 23.5178L107.599 23.3599V23.3993L108.271 25.1363H111V12.1882H108.271L107.639 13.8067ZM104.159 22.3335C102.142 22.3335 100.798 20.8729 100.798 18.5833C100.798 16.3332 102.103 14.8725 104.159 14.8725C106.215 14.8725 107.56 16.3332 107.56 18.5833C107.56 20.8334 106.176 22.3335 104.159 22.3335Z" fill="#E30613"/>
    <path d="M51.4863 11.7937C49.6673 11.7937 48.2832 12.4253 47.3737 13.649L47.176 13.9254V8.16189H43.7357V25.1365H46.4642L47.176 23.3206L47.2946 23.4785C48.2437 24.8207 49.6673 25.4918 51.5258 25.4918C55.0057 25.4918 57.4179 22.689 57.4179 18.6625C57.3783 14.5965 54.9662 11.7937 51.4863 11.7937ZM50.6163 22.3337C49.0346 22.3337 47.176 21.7021 47.176 18.5835C47.176 16.2939 48.5205 14.8333 50.6559 14.8333C52.6331 14.8333 53.938 16.3334 53.938 18.5835C53.8985 20.8337 52.5935 22.3337 50.6163 22.3337Z" fill="#E30613"/>
  </svg>
);

const BostaTab = ({ data, onSave, saving }: BostaTabProps) => {
  const [formData, setFormData] = useState<BostaProvider>(data);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleTestApiKey = async () => {
    if (!formData.apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { testBostaApiKey } = await import('../../services/bostaService');
      const result = await testBostaApiKey(formData.apiKey);
      setTestResult({ success: result.valid, message: result.message });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Test failed' 
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center p-2">
            <BostaLogo className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Bosta Integration</h2>
            <p className="text-sm text-madas-text/60">Connect your Bosta account for shipping in Egypt & KSA</p>
            <a 
              href="https://bosta.co" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-red-600 hover:underline"
            >
              Learn more at bosta.co
            </a>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-blue-600">info</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">API Documentation</p>
                <p className="text-xs">
                  Base URL: <code className="bg-blue-100 px-1 rounded">https://app.bosta.co/api/v2/</code>
                </p>
                <p className="text-xs mt-1">
                  Authentication: Bearer token in Authorization header
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-madas-text/80 mb-2">API Key *</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={formData.apiKey || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, apiKey: e.target.value });
                    setTestResult(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
                  placeholder="Enter your Bosta API key"
                />
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={testing || !formData.apiKey}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-madas-text hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {testing ? (
                    <>
                      <span className="material-icons text-base animate-spin">progress_activity</span>
                      Testing...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-base">check_circle</span>
                      Test Key
                    </>
                  )}
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 p-2 rounded-lg text-sm flex items-center gap-2 ${
                  testResult.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className="material-icons text-base">
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  {testResult.message}
                </div>
              )}
              <p className="mt-1 text-xs text-madas-text/50">
                Get your API key from Bosta dashboard → Settings → API Keys
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Business ID</label>
              <input
                type="text"
                value={formData.businessId || ''}
                onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Your Bosta business ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Country</label>
              <select
                value={formData.countryId || '60e4482c7cb7d4bc4849c4d5'}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="60e4482c7cb7d4bc4849c4d5">🇪🇬 Egypt</option>
                <option value="eF-3f9FZr">🇸🇦 Saudi Arabia (KSA)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Default Pickup Location ID</label>
              <input
                type="text"
                value={formData.defaultPickupLocationId || ''}
                onChange={(e) => setFormData({ ...formData, defaultPickupLocationId: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Pickup location ID from Bosta"
              />
              <p className="mt-1 text-xs text-madas-text/50">
                Configure pickup locations in your Bosta dashboard
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Webhook URL (Optional)</label>
              <input
                type="url"
                value={formData.webhookUrl || ''}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://your-domain.com/webhooks/bosta"
              />
              <p className="mt-1 text-xs text-madas-text/50">
                Receive delivery status updates
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bosta-test"
                checked={formData.testMode || false}
                onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="bosta-test" className="text-sm text-madas-text/70">Test Mode (Sandbox)</label>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-madas-text/80 mb-2">Available Services</h4>
            <ul className="text-xs text-madas-text/60 space-y-1">
              <li className="flex items-center gap-2">
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                Delivery creation & tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                Pickup scheduling
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                COD (Cash on Delivery) support
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                Real-time delivery status webhooks
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-green-500 text-sm">check_circle</span>
                AWB (Airway Bill) generation
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// Aramex Tab Component
interface ProviderTabProps {
  data: ShippingProvider;
  onSave: (data: ShippingProvider) => void;
  saving: boolean;
}

const AramexTab = ({ data, onSave, saving }: ProviderTabProps) => {
  const [formData, setFormData] = useState<ShippingProvider>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-red-600">flight_takeoff</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Aramex Integration</h2>
            <p className="text-sm text-madas-text/60">Connect your Aramex account for shipping services</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter Aramex account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Username</label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Password</label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Default Service</label>
              <select
                value={formData.defaultService || ''}
                onChange={(e) => setFormData({ ...formData, defaultService: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select service</option>
                <option value="express">Express</option>
                <option value="economy">Economy</option>
                <option value="domestic">Domestic</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aramex-test"
                checked={formData.testMode || false}
                onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="aramex-test" className="text-sm text-madas-text/70">Test Mode (Sandbox)</label>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// DHL Tab Component
const DHLTab = ({ data, onSave, saving }: ProviderTabProps) => {
  const [formData, setFormData] = useState<ShippingProvider>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-yellow-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-yellow-600">local_shipping</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">DHL Integration</h2>
            <p className="text-sm text-madas-text/60">Connect your DHL Express account</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter DHL account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">API Key</label>
              <input
                type="text"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret || ''}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter API secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Default Service</label>
              <select
                value={formData.defaultService || ''}
                onChange={(e) => setFormData({ ...formData, defaultService: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select service</option>
                <option value="express-worldwide">Express Worldwide</option>
                <option value="express-9">Express 9:00</option>
                <option value="express-12">Express 12:00</option>
                <option value="economy">Economy Select</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dhl-test"
                checked={formData.testMode || false}
                onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="dhl-test" className="text-sm text-madas-text/70">Test Mode (Sandbox)</label>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// FedEx Tab Component
const FedExTab = ({ data, onSave, saving }: ProviderTabProps) => {
  const [formData, setFormData] = useState<ShippingProvider>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-purple-600">flight</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">FedEx Integration</h2>
            <p className="text-sm text-madas-text/60">Connect your FedEx account for shipping</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter FedEx account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">API Key</label>
              <input
                type="text"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret || ''}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter API secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Default Service</label>
              <select
                value={formData.defaultService || ''}
                onChange={(e) => setFormData({ ...formData, defaultService: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select service</option>
                <option value="priority-overnight">Priority Overnight</option>
                <option value="standard-overnight">Standard Overnight</option>
                <option value="express-saver">Express Saver</option>
                <option value="ground">FedEx Ground</option>
                <option value="international-priority">International Priority</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fedex-test"
                checked={formData.testMode || false}
                onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="fedex-test" className="text-sm text-madas-text/70">Test Mode (Sandbox)</label>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// UPS Tab Component
const UPSTab = ({ data, onSave, saving }: ProviderTabProps) => {
  const [formData, setFormData] = useState<ShippingProvider>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-amber-700">inventory_2</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">UPS Integration</h2>
            <p className="text-sm text-madas-text/60">Connect your UPS account for shipping services</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter UPS account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Username</label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Password</label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Access License Number</label>
              <input
                type="text"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter access license number"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-madas-text/80 mb-2">Default Service</label>
              <select
                value={formData.defaultService || ''}
                onChange={(e) => setFormData({ ...formData, defaultService: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select service</option>
                <option value="next-day-air">Next Day Air</option>
                <option value="2nd-day-air">2nd Day Air</option>
                <option value="ground">UPS Ground</option>
                <option value="3-day-select">3 Day Select</option>
                <option value="worldwide-express">Worldwide Express</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ups-test"
                checked={formData.testMode || false}
                onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="ups-test" className="text-sm text-madas-text/70">Test Mode (Sandbox)</label>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// Local Providers Tab Component
interface LocalProvidersTabProps {
  data: NonNullable<ShippingData['local']>;
  onSave: (data: NonNullable<ShippingData['local']>) => void;
  saving: boolean;
}

const LocalProvidersTab = ({ data, onSave, saving }: LocalProvidersTabProps) => {
  const [formData, setFormData] = useState(data);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    phone: '',
    email: '',
    zones: '',
    flatRate: ''
  });

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.phone) {
      alert('Please fill in provider name and phone number');
      return;
    }

    const provider = {
      id: Date.now().toString(),
      name: newProvider.name,
      phone: newProvider.phone,
      email: newProvider.email || undefined,
      zones: newProvider.zones.split(',').map((z) => z.trim()).filter(Boolean),
      flatRate: newProvider.flatRate ? parseFloat(newProvider.flatRate) : undefined,
      active: true
    };

    const updated = {
      ...formData,
      providers: [...formData.providers, provider]
    };
    setFormData(updated);
    setShowAddModal(false);
    setNewProvider({ name: '', phone: '', email: '', zones: '', flatRate: '' });
  };

  const handleRemoveProvider = (id: string) => {
    const updated = {
      ...formData,
      providers: formData.providers.filter((p) => p.id !== id)
    };
    setFormData(updated);
  };

  const handleToggleProvider = (id: string) => {
    const updated = {
      ...formData,
      providers: formData.providers.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    };
    setFormData(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-green-600">delivery_dining</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Local Delivery Providers</h2>
            <p className="text-sm text-madas-text/60">Manage your local delivery partners and couriers</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-madas-text/80">Delivery Partners</h3>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-[#1f3c19] transition-colors"
            >
              <span className="material-icons text-sm">add</span>
              Add Provider
            </button>
          </div>

          {formData.providers.length === 0 ? (
            <div className="text-center py-8 text-madas-text/50">
              <span className="material-icons text-4xl mb-2">local_shipping</span>
              <p>No local providers added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    provider.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      provider.active ? 'bg-green-200' : 'bg-gray-200'
                    }`}>
                      <span className={`material-icons ${provider.active ? 'text-green-700' : 'text-gray-500'}`}>
                        delivery_dining
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-madas-text/90">{provider.name}</h4>
                      <p className="text-sm text-madas-text/60">{provider.phone}</p>
                      {provider.zones.length > 0 && (
                        <p className="text-xs text-madas-text/50">Zones: {provider.zones.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.flatRate && (
                      <span className="text-sm text-madas-text/70 mr-2">
                        ${provider.flatRate.toFixed(2)} flat
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleProvider(provider.id)}
                      className={`p-2 rounded-lg ${
                        provider.active
                          ? 'text-green-600 hover:bg-green-100'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <span className="material-icons text-base">
                        {provider.active ? 'toggle_on' : 'toggle_off'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveProvider(provider.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                    >
                      <span className="material-icons text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-primary mb-4">Add Local Provider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Provider Name *</label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Fast Local Delivery"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={newProvider.phone}
                  onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="+20 123 456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newProvider.email}
                  onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="provider@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Delivery Zones (comma separated)</label>
                <input
                  type="text"
                  value={newProvider.zones}
                  onChange={(e) => setNewProvider({ ...newProvider, zones: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Cairo, Giza, Alexandria"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Flat Rate (Optional)</label>
                <input
                  type="number"
                  value={newProvider.flatRate}
                  onChange={(e) => setNewProvider({ ...newProvider, flatRate: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="50.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewProvider({ name: '', phone: '', email: '', zones: '', flatRate: '' });
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProvider}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-[#1f3c19]"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Regions & Exceptions Tab Props
interface RegionsTabProps {
  data: RegionsData;
  onSave: (data: RegionsData) => void;
  saving: boolean;
}

// Egypt Governorates
const egyptGovernorates = [
  'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Dakahlia', 'Sharqia', 'Gharbia',
  'Monufia', 'Beheira', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia',
  'Suez', 'North Sinai', 'South Sinai', 'Red Sea', 'Fayoum', 'Beni Suef',
  'Minya', 'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'New Valley', 'Matrouh'
];

const RegionsTab = ({ data, onSave, saving }: RegionsTabProps) => {
  const [formData, setFormData] = useState<RegionsData>(data);
  const [showAddRegionModal, setShowAddRegionModal] = useState(false);
  const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<ShippingRegion | null>(null);
  const [editingException, setEditingException] = useState<ShippingException | null>(null);

  const [newRegion, setNewRegion] = useState<Partial<ShippingRegion>>({
    name: '',
    countries: ['Egypt'],
    governorates: [],
    enabled: true,
    shippingRate: 50,
    freeShippingThreshold: undefined,
    estimatedDays: '3-5 days',
    priority: 1
  });

  const [newException, setNewException] = useState<Partial<ShippingException>>({
    name: '',
    type: 'location',
    condition: '',
    action: 'surcharge',
    value: 0,
    enabled: true
  });

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleAddRegion = () => {
    if (!newRegion.name || newRegion.governorates?.length === 0) {
      alert('Please enter a region name and select at least one governorate');
      return;
    }

    const region: ShippingRegion = {
      id: editingRegion?.id || `region-${Date.now()}`,
      name: newRegion.name || '',
      countries: newRegion.countries || ['Egypt'],
      governorates: newRegion.governorates || [],
      enabled: newRegion.enabled ?? true,
      shippingRate: newRegion.shippingRate || 50,
      freeShippingThreshold: newRegion.freeShippingThreshold,
      estimatedDays: newRegion.estimatedDays || '3-5 days',
      priority: newRegion.priority || 1
    };

    let updatedRegions: ShippingRegion[];
    if (editingRegion) {
      updatedRegions = formData.regions.map(r => r.id === editingRegion.id ? region : r);
    } else {
      updatedRegions = [...formData.regions, region];
    }

    setFormData({ ...formData, regions: updatedRegions });
    setShowAddRegionModal(false);
    setEditingRegion(null);
    setNewRegion({
      name: '',
      countries: ['Egypt'],
      governorates: [],
      enabled: true,
      shippingRate: 50,
      freeShippingThreshold: undefined,
      estimatedDays: '3-5 days',
      priority: 1
    });
  };

  const handleAddException = () => {
    if (!newException.name || !newException.condition) {
      alert('Please enter an exception name and condition');
      return;
    }

    const exception: ShippingException = {
      id: editingException?.id || `exception-${Date.now()}`,
      name: newException.name || '',
      type: newException.type || 'location',
      condition: newException.condition || '',
      action: newException.action || 'surcharge',
      value: newException.value,
      enabled: newException.enabled ?? true
    };

    let updatedExceptions: ShippingException[];
    if (editingException) {
      updatedExceptions = formData.exceptions.map(e => e.id === editingException.id ? exception : e);
    } else {
      updatedExceptions = [...formData.exceptions, exception];
    }

    setFormData({ ...formData, exceptions: updatedExceptions });
    setShowAddExceptionModal(false);
    setEditingException(null);
    setNewException({
      name: '',
      type: 'location',
      condition: '',
      action: 'surcharge',
      value: 0,
      enabled: true
    });
  };

  const handleDeleteRegion = (regionId: string) => {
    if (confirm('Are you sure you want to delete this region?')) {
      setFormData({
        ...formData,
        regions: formData.regions.filter(r => r.id !== regionId)
      });
    }
  };

  const handleDeleteException = (exceptionId: string) => {
    if (confirm('Are you sure you want to delete this exception?')) {
      setFormData({
        ...formData,
        exceptions: formData.exceptions.filter(e => e.id !== exceptionId)
      });
    }
  };

  const handleEditRegion = (region: ShippingRegion) => {
    setEditingRegion(region);
    setNewRegion(region);
    setShowAddRegionModal(true);
  };

  const handleEditException = (exception: ShippingException) => {
    setEditingException(exception);
    setNewException(exception);
    setShowAddExceptionModal(true);
  };

  const toggleGovernorate = (gov: string) => {
    const current = newRegion.governorates || [];
    if (current.includes(gov)) {
      setNewRegion({ ...newRegion, governorates: current.filter(g => g !== gov) });
    } else {
      setNewRegion({ ...newRegion, governorates: [...current, gov] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="material-icons text-3xl text-blue-600">public</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Shipping Regions & Exceptions</h2>
            <p className="text-sm text-madas-text/60">Define shipping zones, rates, and special rules</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {formData.enabled && (
        <div className="space-y-6 pt-4 border-t border-gray-100">
          {/* Default Settings */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-madas-text mb-3">Default Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Default Shipping Rate</label>
                <input
                  type="number"
                  min="0"
                  value={formData.defaultRate}
                  onChange={(e) => setFormData({ ...formData, defaultRate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Default Estimated Delivery</label>
                <input
                  type="text"
                  value={formData.defaultEstimatedDays}
                  onChange={(e) => setFormData({ ...formData, defaultEstimatedDays: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="3-5 days"
                />
              </div>
            </div>
          </div>

          {/* Regions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-madas-text">Shipping Regions</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingRegion(null);
                  setNewRegion({
                    name: '',
                    countries: ['Egypt'],
                    governorates: [],
                    enabled: true,
                    shippingRate: 50,
                    freeShippingThreshold: undefined,
                    estimatedDays: '3-5 days',
                    priority: 1
                  });
                  setShowAddRegionModal(true);
                }}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-[#1f3c19]"
              >
                <span className="material-icons text-base">add</span>
                Add Region
              </button>
            </div>

            {formData.regions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <span className="material-icons text-4xl text-madas-text/30 mb-2">map</span>
                <p className="text-sm text-madas-text/60">No shipping regions defined</p>
                <p className="text-xs text-madas-text/40 mt-1">Add regions to set different rates per area</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${region.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="font-medium text-madas-text">{region.name}</p>
                        <p className="text-xs text-madas-text/60">
                          {region.governorates.slice(0, 3).join(', ')}
                          {region.governorates.length > 3 && ` +${region.governorates.length - 3} more`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">{region.shippingRate} EGP</p>
                        <p className="text-xs text-madas-text/50">{region.estimatedDays}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditRegion(region)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <span className="material-icons text-sm text-madas-text/60">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRegion(region.id)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <span className="material-icons text-sm text-red-500">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exceptions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-madas-text">Shipping Exceptions</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingException(null);
                  setNewException({
                    name: '',
                    type: 'location',
                    condition: '',
                    action: 'surcharge',
                    value: 0,
                    enabled: true
                  });
                  setShowAddExceptionModal(true);
                }}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-[#1f3c19]"
              >
                <span className="material-icons text-base">add</span>
                Add Exception
              </button>
            </div>

            {formData.exceptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <span className="material-icons text-4xl text-madas-text/30 mb-2">rule</span>
                <p className="text-sm text-madas-text/60">No shipping exceptions defined</p>
                <p className="text-xs text-madas-text/40 mt-1">Add rules for special cases like remote areas or heavy items</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.exceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${exception.enabled ? 'bg-orange-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="font-medium text-madas-text">{exception.name}</p>
                        <p className="text-xs text-madas-text/60">
                          {exception.type}: {exception.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        exception.action === 'block' ? 'bg-red-100 text-red-600' :
                        exception.action === 'free' ? 'bg-green-100 text-green-600' :
                        exception.action === 'surcharge' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {exception.action === 'block' ? 'Blocked' :
                         exception.action === 'free' ? 'Free Shipping' :
                         exception.action === 'surcharge' ? `+${exception.value} EGP` :
                         `${exception.value} EGP`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditException(exception)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <span className="material-icons text-sm text-madas-text/60">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteException(exception.id)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <span className="material-icons text-sm text-red-500">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onSave(formData)}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Region Modal */}
      {showAddRegionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-primary mb-4">
              {editingRegion ? 'Edit Region' : 'Add Shipping Region'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Region Name *</label>
                <input
                  type="text"
                  value={newRegion.name || ''}
                  onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Greater Cairo, Delta Region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                  Select Governorates * ({newRegion.governorates?.length || 0} selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2 grid grid-cols-2 gap-1">
                  {egyptGovernorates.map((gov) => (
                    <label
                      key={gov}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                        newRegion.governorates?.includes(gov)
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-gray-50 text-madas-text/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newRegion.governorates?.includes(gov) || false}
                        onChange={() => toggleGovernorate(gov)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {gov}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-1">Shipping Rate (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRegion.shippingRate || 0}
                    onChange={(e) => setNewRegion({ ...newRegion, shippingRate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-1">Estimated Delivery</label>
                  <input
                    type="text"
                    value={newRegion.estimatedDays || ''}
                    onChange={(e) => setNewRegion({ ...newRegion, estimatedDays: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="3-5 days"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-1">Free Shipping Above (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRegion.freeShippingThreshold || ''}
                    onChange={(e) => setNewRegion({ ...newRegion, freeShippingThreshold: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-1">Priority</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRegion.priority || 1}
                    onChange={(e) => setNewRegion({ ...newRegion, priority: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="regionEnabled"
                  checked={newRegion.enabled ?? true}
                  onChange={(e) => setNewRegion({ ...newRegion, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="regionEnabled" className="text-sm text-madas-text/80">Enable this region</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddRegionModal(false);
                  setEditingRegion(null);
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRegion}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-[#1f3c19]"
              >
                {editingRegion ? 'Update Region' : 'Add Region'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Exception Modal */}
      {showAddExceptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-primary mb-4">
              {editingException ? 'Edit Exception' : 'Add Shipping Exception'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Exception Name *</label>
                <input
                  type="text"
                  value={newException.name || ''}
                  onChange={(e) => setNewException({ ...newException, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Remote Area Surcharge, Heavy Items"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Exception Type</label>
                <select
                  value={newException.type || 'location'}
                  onChange={(e) => setNewException({ ...newException, type: e.target.value as ShippingException['type'] })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="location">Location Based</option>
                  <option value="product">Product Based</option>
                  <option value="category">Category Based</option>
                  <option value="weight">Weight Based</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Condition *</label>
                <input
                  type="text"
                  value={newException.condition || ''}
                  onChange={(e) => setNewException({ ...newException, condition: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={
                    newException.type === 'location' ? 'e.g., North Sinai, South Sinai' :
                    newException.type === 'weight' ? 'e.g., > 10kg' :
                    newException.type === 'category' ? 'e.g., Furniture, Electronics' :
                    'e.g., SKU-001, SKU-002'
                  }
                />
                <p className="text-xs text-madas-text/50 mt-1">
                  {newException.type === 'location' && 'Enter governorate names separated by commas'}
                  {newException.type === 'weight' && 'Use > or < with weight in kg'}
                  {newException.type === 'category' && 'Enter category names separated by commas'}
                  {newException.type === 'product' && 'Enter product SKUs separated by commas'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-1">Action</label>
                <select
                  value={newException.action || 'surcharge'}
                  onChange={(e) => setNewException({ ...newException, action: e.target.value as ShippingException['action'] })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="surcharge">Add Surcharge</option>
                  <option value="custom_rate">Custom Rate</option>
                  <option value="free">Free Shipping</option>
                  <option value="block">Block Shipping</option>
                </select>
              </div>

              {(newException.action === 'surcharge' || newException.action === 'custom_rate') && (
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-1">
                    {newException.action === 'surcharge' ? 'Surcharge Amount (EGP)' : 'Custom Rate (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newException.value || 0}
                    onChange={(e) => setNewException({ ...newException, value: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exceptionEnabled"
                  checked={newException.enabled ?? true}
                  onChange={(e) => setNewException({ ...newException, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="exceptionEnabled" className="text-sm text-madas-text/80">Enable this exception</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddExceptionModal(false);
                  setEditingException(null);
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddException}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-[#1f3c19]"
              >
                {editingException ? 'Update Exception' : 'Add Exception'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingPage;

