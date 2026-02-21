import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { collection, db, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, getDoc } from '../../lib/firebase';
import { getPlanPermissions } from '@shared/lib/planPermissions';
import { useNavigate } from 'react-router-dom';

type SettingsTab = 'general' | 'business' | 'notifications' | 'security' | 'roles' | 'permissions' | 'integrations' | 'linked-businesses';

const SettingsPage = () => {
  const { businessId, businessName, plan, loading, refresh } = useBusiness();
  const { user } = useAuth();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { loading: rbacLoading } = useRBAC();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState<string>('USD');
  const [fiscalYearStart, setFiscalYearStart] = useState<string>('january');
  const [businessNameInput, setBusinessNameInput] = useState<string>('');

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'general', label: 'General', icon: 'tune' },
    { id: 'business', label: 'Business', icon: 'business' },
    { id: 'linked-businesses', label: 'Linked Inventories', icon: 'link' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'permissions', label: 'Page Access', icon: 'lock_open' },
    { id: 'roles', label: 'Roles & Permissions', icon: 'admin_panel_settings' },
    { id: 'integrations', label: 'Integrations', icon: 'extension' }
  ];

  // Load business settings when businessId is available
  useEffect(() => {
    const loadBusinessSettings = async () => {
      if (!businessId) return;
      
      try {
        const businessDocRef = doc(db, 'businesses', businessId);
        const businessDoc = await getDoc(businessDocRef);
        
        if (businessDoc.exists()) {
          const data = businessDoc.data();
          // Load currency from plan.currency or business.currency, default to USD
          const loadedCurrency = (data.plan as { currency?: string } | undefined)?.currency 
            || (data.currency as string | undefined) 
            || 'USD';
          setCurrency(loadedCurrency);
          
          // Load fiscal year start
          const loadedFiscalYear = (data.fiscalYearStart as string | undefined) || 'january';
          setFiscalYearStart(loadedFiscalYear);
          
          // Load business name
          const loadedBusinessName = data.businessName || data.name || businessName || '';
          setBusinessNameInput(loadedBusinessName);
        }
      } catch (error) {
        console.error('Error loading business settings:', error);
      }
    };
    
    loadBusinessSettings();
  }, [businessId, businessName]);

  // Save business settings handler
  const handleSaveBusinessSettings = useCallback(async () => {
    if (!businessId) {
      alert('Business ID is missing. Please refresh the page.');
      return;
    }

    try {
      setSaving(true);
      const businessDocRef = doc(db, 'businesses', businessId);
      
      // Update business document with currency and other settings
      await updateDoc(businessDocRef, {
        businessName: businessNameInput || businessName,
        currency: currency,
        fiscalYearStart: fiscalYearStart,
        // Update plan.currency as well for backward compatibility
        plan: {
          ...plan,
          currency: currency
        },
        updatedAt: new Date()
      });
      
      // Refresh business context to get updated values
      await refresh();
      
      alert('Business settings saved successfully!');
    } catch (error) {
      console.error('Error saving business settings:', error);
      alert('Failed to save business settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [businessId, businessNameInput, businessName, currency, fiscalYearStart, plan, refresh]);

  if (loading || rbacLoading) {
    return <FullScreenLoader message="Loading settings..." />;
  }

  return (
    <PermissionGuard
      permission="settings_general"
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">lock</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">Access Denied</p>
          <p className="text-sm text-madas-text/60">
            You don't have permission to access settings. Please contact your administrator.
          </p>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-8">
        <header>
          <h1 className="text-3xl font-semibold text-primary">Settings</h1>
          <p className="text-sm text-madas-text/70">Manage your account and business preferences.</p>
        </header>

        <div className="space-y-6">
          {/* Horizontal Tab Navigation */}
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

        {/* Main Content */}
        <main>
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-primary mb-2">General Settings</h2>
                  <p className="text-sm text-madas-text/70">Manage your account preferences and display settings.</p>
                </div>

                <section className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Display Name</label>
                    <input
                      type="text"
                      defaultValue={user?.displayName || ''}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue={user?.email || ''}
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-madas-text/60"
                    />
                    <p className="mt-1 text-xs text-madas-text/60">Email cannot be changed here. Contact support if needed.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Language</label>
                    <select className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent">
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Time Zone</label>
                    <select className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent">
                      <option value="UTC">UTC</option>
                      <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Dark Mode</p>
                      <p className="text-xs text-madas-text/60">Toggle dark theme for the dashboard</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                        isDark ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isDark ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <PermissionGuard
                permission="settings_general"
                fallback={
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">Access Restricted</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      You don't have permission to modify business settings.
                    </p>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-2">Business Settings</h2>
                    <p className="text-sm text-madas-text/70">Manage your business information and preferences.</p>
                  </div>

                <section className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={businessNameInput}
                      onChange={(e) => setBusinessNameInput(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Your business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Business ID</label>
                    <input
                      type="text"
                      value={businessId || ''}
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-madas-text/60 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Current Plan</label>
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        {plan?.type ? `${plan.type.charAt(0).toUpperCase()}${plan.type.slice(1)}` : 'Basic'} Plan
                        {plan?.status === 'trial' ? ' (Trial)' : ''}
                      </span>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => alert('Upgrade plan functionality coming soon')}
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EGP">EGP (E£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                    <p className="mt-1 text-xs text-madas-text/60">Select your business currency. This will be used across all financial reports and transactions.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Fiscal Year Start</label>
                    <select 
                      value={fiscalYearStart}
                      onChange={(e) => setFiscalYearStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="january">January</option>
                      <option value="april">April</option>
                      <option value="july">July</option>
                      <option value="october">October</option>
                    </select>
                  </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSaveBusinessSettings}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
              </PermissionGuard>
            )}

            {activeTab === 'notifications' && (
              <PermissionGuard
                permission="settings_general"
                fallback={
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">Access Restricted</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      You don't have permission to modify notification settings.
                    </p>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-2">Notification Settings</h2>
                    <p className="text-sm text-madas-text/70">Configure how and when you receive notifications.</p>
                  </div>

                <section className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Email Notifications</p>
                      <p className="text-xs text-madas-text/60">Receive notifications via email</p>
                    </div>
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Order Notifications</p>
                      <p className="text-xs text-madas-text/60">Get notified when new orders are placed</p>
                    </div>
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Low Stock Alerts</p>
                      <p className="text-xs text-madas-text/60">Receive alerts when inventory is running low</p>
                    </div>
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Payment Notifications</p>
                      <p className="text-xs text-madas-text/60">Get notified about payment updates</p>
                    </div>
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
              </PermissionGuard>
            )}

            {activeTab === 'security' && (
              <PermissionGuard
                permission="settings_general"
                fallback={
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">Access Restricted</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      You don't have permission to modify security settings.
                    </p>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-2">Security Settings</h2>
                    <p className="text-sm text-madas-text/70">Manage your account security and authentication.</p>
                  </div>

                <section className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Current Password</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">New Password</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Enter new password"
                    />
                    <p className="mt-1 text-xs text-madas-text/60">Password must be at least 8 characters long</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-madas-text/80">Two-Factor Authentication</p>
                      <p className="text-xs text-madas-text/60">Add an extra layer of security to your account</p>
                    </div>
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                      <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-madas-text/80 mb-3">Active Sessions</h3>
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-madas-text/80">Current Session</p>
                          <p className="text-xs text-madas-text/60">This device • {new Date().toLocaleString()}</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-sm text-red-600 hover:underline"
                      onClick={() => alert('View all sessions functionality coming soon')}
                    >
                      View All Sessions
                    </button>
                  </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
              </PermissionGuard>
            )}

            {activeTab === 'linked-businesses' && (
              <LinkedBusinessesTab businessId={businessId} />
            )}

            {activeTab === 'permissions' && (
              <PageAccessTab plan={plan} />
            )}

            {activeTab === 'roles' && (
              <RolesAndPermissionsTab businessId={businessId} businessName={businessName} plan={plan} />
            )}

            {activeTab === 'integrations' && (
              <PermissionGuard
                permission="settings_integrations"
                fallback={
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">Access Restricted</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      You don't have permission to modify integration settings.
                    </p>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-2">Integrations</h2>
                    <p className="text-sm text-madas-text/70">
                      Manage your third-party integrations and tracking pixels.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/settings/analytics')}
                      className="flex items-start space-x-4 p-6 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all text-left"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-icons text-primary text-2xl">analytics</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-madas-text/90 mb-1">Analytics</h3>
                        <p className="text-sm text-madas-text/60">
                          Manage tracking pixels including Meta, Google, TikTok, Snapchat, Pinterest, and custom scripts.
                        </p>
                      </div>
                      <span className="material-icons text-madas-text/40">chevron_right</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/settings/shipping')}
                      className="flex items-start space-x-4 p-6 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all text-left"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="material-icons text-blue-600 text-2xl">local_shipping</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-madas-text/90 mb-1">Shipping</h3>
                        <p className="text-sm text-madas-text/60">
                          Configure shipping carriers including Aramex, DHL, FedEx, UPS, and local providers.
                        </p>
                      </div>
                      <span className="material-icons text-madas-text/40">chevron_right</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/settings/payments')}
                      className="flex items-start space-x-4 p-6 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all text-left"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <span className="material-icons text-green-600 text-2xl">payments</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-madas-text/90 mb-1">Payment Methods</h3>
                        <p className="text-sm text-madas-text/60">
                          Configure payment gateways including Stripe, Paymob, Fawry, InstaPay, Vodafone Cash, and bank transfers.
                        </p>
                      </div>
                      <span className="material-icons text-madas-text/40">chevron_right</span>
                    </button>
                  </div>
                </div>
              </PermissionGuard>
            )}
          </div>
        </main>
      </div>
    </div>
    </PermissionGuard>
  );
};

// Linked Businesses Tab Component - Manage linked business inventories
type LinkedBusinessesTabProps = {
  businessId?: string;
};

const LinkedBusinessesTab = ({ businessId }: LinkedBusinessesTabProps) => {
  const { 
    linkedBusinesses, 
    removeLinkedBusiness, 
    role,
    incomingLinkRequests,
    outgoingLinkRequests,
    sendLinkRequest,
    approveLinkRequest,
    rejectLinkRequest,
    cancelLinkRequest,
    refreshLinkRequests
  } = useBusiness();
  const [newBusinessId, setNewBusinessId] = useState('');
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOwner = role === 'owner';

  const handleSendRequest = async () => {
    if (!newBusinessId.trim()) {
      setError('Please enter a Business ID');
      return;
    }

    if (newBusinessId.trim() === businessId) {
      setError('You cannot link your own business');
      return;
    }

    setSending(true);
    setError(null);
    setSuccessMessage(null);

    const result = await sendLinkRequest(newBusinessId.trim(), 'read');
    
    if (result.success) {
      setNewBusinessId('');
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setError(result.message);
    }
    
    setSending(false);
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    const success = await approveLinkRequest(requestId);
    if (!success) {
      alert('Failed to approve request. Please try again.');
    }
    setProcessingRequest(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this request?')) {
      return;
    }
    setProcessingRequest(requestId);
    const success = await rejectLinkRequest(requestId);
    if (!success) {
      alert('Failed to reject request. Please try again.');
    }
    setProcessingRequest(null);
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }
    setProcessingRequest(requestId);
    const success = await cancelLinkRequest(requestId);
    if (!success) {
      alert('Failed to cancel request. Please try again.');
    }
    setProcessingRequest(null);
  };

  const handleRemoveBusiness = async (idToRemove: string) => {
    if (!confirm('Are you sure you want to unlink this business? You will no longer have access to their inventory.')) {
      return;
    }

    setRemoving(idToRemove);
    await removeLinkedBusiness(idToRemove);
    setRemoving(null);
  };

  return (
    <PermissionGuard
      permission="settings_general"
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">Access Restricted</p>
          <p className="text-yellow-700 text-sm mt-1">
            You don't have permission to manage linked businesses.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-2">Linked Inventories</h2>
            <p className="text-sm text-madas-text/70">
              Link other businesses to view their inventory from your dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshLinkRequests()}
            className="p-2 rounded-lg hover:bg-gray-100 text-madas-text/60 transition-colors"
            title="Refresh requests"
          >
            <span className="material-icons text-xl">refresh</span>
          </button>
        </div>

        {/* Incoming Requests Section */}
        {incomingLinkRequests && incomingLinkRequests.length > 0 && (
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-orange-200 bg-orange-100">
              <div className="flex items-center gap-2">
                <span className="material-icons text-orange-600">notifications_active</span>
                <h3 className="text-lg font-semibold text-orange-800">Incoming Requests</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-600 text-white">
                  {incomingLinkRequests.length}
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Other businesses want to view your inventory
              </p>
            </div>
            <div className="divide-y divide-orange-200">
              {incomingLinkRequests.map((request) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="material-icons text-orange-600 text-lg">store</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-madas-text/90">{request.fromBusinessName}</h4>
                      <p className="text-xs text-madas-text/50">
                        Requested {request.requestedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {processingRequest === request.id ? (
                      <span className="material-icons text-base animate-spin text-gray-400">progress_activity</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(request.id)}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send Request Section */}
        {isOwner && (
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Request Access to Another Business</h3>
            <p className="text-sm text-madas-text/70 mb-4">
              Enter the Business ID of the business you want to link. They will receive a request and must approve it before you can view their inventory.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newBusinessId}
                onChange={(e) => {
                  setNewBusinessId(e.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                placeholder="Enter Business ID (e.g., abc123xyz...)"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={sending || !newBusinessId.trim()}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="material-icons text-base animate-spin">progress_activity</span>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="material-icons text-base">send</span>
                    Send Request
                  </span>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {successMessage && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Outgoing Requests (Pending) */}
        {outgoingLinkRequests && outgoingLinkRequests.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="material-icons text-blue-600">pending</span>
                <h3 className="text-lg font-semibold text-primary">Pending Requests</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {outgoingLinkRequests.length}
                </span>
              </div>
              <p className="text-sm text-madas-text/70 mt-1">
                Waiting for approval from other businesses
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {outgoingLinkRequests.map((request) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="material-icons text-blue-600 text-lg">hourglass_empty</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-madas-text/90">{request.toBusinessName}</h4>
                      <p className="text-xs text-madas-text/50">
                        Sent {request.requestedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                    {processingRequest === request.id ? (
                      <span className="material-icons text-base animate-spin text-gray-400">progress_activity</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(request.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        title="Cancel request"
                      >
                        <span className="material-icons text-base">close</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Business ID Section */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <span className="material-icons text-blue-600 text-xl mt-0.5">info</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Share Your Business ID</h3>
              <p className="text-sm text-blue-700 mb-3">
                Share this Business ID with other businesses that want to request access to your inventory:
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-3">
                <code className="flex-1 text-sm text-blue-900 font-mono break-all">{businessId || 'Loading...'}</code>
                <button
                  type="button"
                  onClick={() => {
                    if (businessId) {
                      navigator.clipboard.writeText(businessId);
                      alert('Business ID copied to clipboard!');
                    }
                  }}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                  title="Copy Business ID"
                >
                  <span className="material-icons text-base">content_copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Businesses List */}
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="material-icons text-green-600">link</span>
              <h3 className="text-lg font-semibold text-primary">Linked Businesses</h3>
            </div>
            <p className="text-sm text-madas-text/70 mt-1">
              {linkedBusinesses?.length || 0} business{(linkedBusinesses?.length || 0) !== 1 ? 'es' : ''} linked
            </p>
          </div>
          
          {!linkedBusinesses || linkedBusinesses.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-icons text-5xl text-madas-text/20 mb-4 block">link_off</span>
              <p className="text-madas-text/70 mb-2">No linked businesses yet</p>
              <p className="text-sm text-madas-text/50">
                Send a request above to start viewing other inventories
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {linkedBusinesses.map((business) => (
                <div key={business.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="material-icons text-green-600 text-lg">store</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-madas-text/90">{business.name}</h4>
                      <p className="text-xs text-madas-text/50 font-mono">{business.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      {business.accessType === 'readwrite' ? 'Read & Write' : 'Read Only'}
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBusiness(business.id)}
                        disabled={removing === business.id}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-60"
                        title="Unlink business"
                      >
                        {removing === business.id ? (
                          <span className="material-icons text-base animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-icons text-base">link_off</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">How Linked Inventories Work</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-madas-text/90">Get the Business ID</p>
                <p className="text-sm text-madas-text/60">Ask the other business owner to share their Business ID from their Settings page.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-madas-text/90">Send a Request</p>
                <p className="text-sm text-madas-text/60">Enter their Business ID and send a link request. They will be notified and can approve or reject it.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-madas-text/90">Wait for Approval</p>
                <p className="text-sm text-madas-text/60">Once they approve your request, the link will be established and you can view their inventory.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">4</span>
              </div>
              <div>
                <p className="font-medium text-madas-text/90">View Their Inventory</p>
                <p className="text-sm text-madas-text/60">Switch between inventories from the Products page using the business selector dropdown.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

// Page Access Tab Component - Shows which pages are accessible based on plan
type PageAccessTabProps = {
  plan?: { type?: string; status?: string };
};

const PageAccessTab = ({ plan }: PageAccessTabProps) => {
  const planType = plan?.type || 'basic';
  const planPermissions = getPlanPermissions(planType);

  // Map pages/features to their required permissions
  const pageAccess = [
    {
      category: 'Core Features',
      pages: [
        { name: 'Dashboard', icon: 'dashboard', permission: 'dashboard_view', route: '/' },
        { name: 'Orders', icon: 'receipt_long', permission: 'order_view', route: '/orders' },
        { name: 'Scan Log', icon: 'qr_code_scanner', permission: 'scan_log', route: '/orders/scan-log' },
        { name: 'POS System', icon: 'point_of_sale', permission: 'pos_view', route: '/pos' },
      ]
    },
    {
      category: 'Inventory',
      pages: [
        { name: 'Products', icon: 'inventory', permission: 'product_view', route: '/inventory/products' },
        { name: 'Collections', icon: 'collections', permission: 'collection_view', route: '/inventory/collections' },
        { name: 'Low Stock', icon: 'warning', permission: 'low_stock_view', route: '/inventory/low-stock' },
        { name: 'Reviews', icon: 'rate_review', permission: 'reviews_view', route: '/inventory/reviews' },
      ]
    },
    {
      category: 'Customers',
      pages: [
        { name: 'Customers', icon: 'group', permission: 'customer_view', route: '/customers' },
      ]
    },
    {
      category: 'Finance',
      pages: [
        { name: 'Finance Overview', icon: 'account_balance', permission: 'finance_view', route: '/finance/overview' },
        { name: 'Transactions', icon: 'sync_alt', permission: 'finance_view', route: '/finance/transactions' },
        { name: 'Payments', icon: 'credit_score', permission: 'finance_view', route: '/finance/payments' },
        { name: 'Expenses', icon: 'receipt', permission: 'finance_expenses', route: '/finance/expenses' },
        { name: 'Accounts', icon: 'account_balance_wallet', permission: 'finance_view', route: '/finance/accounts' },
        { name: 'Budgets', icon: 'bookmark', permission: 'finance_view', route: '/finance/budgets' },
        { name: 'Reports', icon: 'assessment', permission: 'finance_reports', route: '/finance/reports' },
        { name: 'Taxes', icon: 'request_quote', permission: 'finance_view', route: '/finance/taxes' },
        { name: 'Capital Return', icon: 'savings', permission: 'finance_view', route: '/finance/capital' },
        { name: 'Audit Log', icon: 'fact_check', permission: 'finance_view', route: '/finance/audit' },
      ]
    },
    {
      category: 'E-commerce',
      pages: [
        { name: 'Website Builder', icon: 'web', permission: 'website_builder', route: '/ecommerce/website-builder' },
        { name: 'Templates', icon: 'view_module', permission: 'website_templates', route: '/ecommerce/templates' },
        { name: 'Visit Store', icon: 'shopping_bag', permission: 'website_builder', route: '/ecommerce/visit-store' },
        { name: 'Custom Domains', icon: 'language', permission: 'website_settings', route: '/ecommerce/custom-domains' },
      ]
    },
    {
      category: 'Management',
      pages: [
        { name: 'Staff Management', icon: 'people', permission: 'staff_view', route: '/rbac/users' },
        { name: 'Roles & Permissions', icon: 'admin_panel_settings', permission: 'roles_view', route: '/rbac/roles' },
      ]
    },
    {
      category: 'Advanced Features',
      pages: [
        { name: 'API Access', icon: 'api', permission: 'api_access', route: '#' },
        { name: 'Multi-Location', icon: 'location_on', permission: 'multi_location_manage', route: '#' },
        { name: 'Custom Integrations', icon: 'extension', permission: 'custom_integrations', route: '#' },
      ]
    },
  ];

  const hasAccess = (permission: string) => {
    return planPermissions.includes(permission);
  };

  const getPlanDisplayName = () => {
    const type = planType.charAt(0).toUpperCase() + planType.slice(1);
    return `${type} Plan${plan?.status === 'trial' ? ' (Trial)' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-2">Page Access</h2>
        <p className="text-sm text-madas-text/70">
          View which pages and features are available in your <strong>{getPlanDisplayName()}</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-madas-text/80">Current Plan</p>
            <p className="text-lg font-semibold text-primary mt-1">{getPlanDisplayName()}</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Upgrade plan functionality coming soon')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {pageAccess.map((category) => {
          const accessibleCount = category.pages.filter((page) => hasAccess(page.permission)).length;
          const totalCount = category.pages.length;

          return (
            <div key={category.category} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">{category.category}</h3>
                <span className="text-sm text-madas-text/60">
                  {accessibleCount} of {totalCount} available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.pages.map((page) => {
                  const accessible = hasAccess(page.permission);

                  return (
                    <div
                      key={page.name}
                      className={`rounded-lg border p-4 transition-all ${
                        accessible
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            accessible ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <span className="material-icons text-xl">{page.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4
                              className={`text-sm font-semibold ${
                                accessible ? 'text-madas-text/90' : 'text-madas-text/50'
                              }`}
                            >
                              {page.name}
                            </h4>
                            {accessible ? (
                              <span className="flex-shrink-0 ml-2">
                                <span className="material-icons text-green-600 text-base">check_circle</span>
                              </span>
                            ) : (
                              <span className="flex-shrink-0 ml-2">
                                <span className="material-icons text-gray-400 text-base">lock</span>
                              </span>
                            )}
                          </div>
                          {!accessible && (
                            <p className="text-xs text-madas-text/50 mt-1">
                              Upgrade plan to access
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start space-x-3">
          <span className="material-icons text-blue-600">info</span>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">About Page Access</p>
            <p className="text-xs text-blue-700">
              Page access is determined by your subscription plan. Some features may require upgrading to a higher plan.
              Contact support if you need access to specific features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Roles & Permissions Tab Component
type RolesAndPermissionsTabProps = {
  businessId?: string;
  businessName?: string;
  plan?: { type?: string; status?: string };
};

const RolesAndPermissionsTab = ({ businessId, businessName, plan }: RolesAndPermissionsTabProps) => {
  const { getPermissions } = useRBAC();
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [planPermissions, setPlanPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneCode: '+20',
    phoneNumber: '',
    role: 'administrator',
    showCustomPermissions: false,
    customPermissions: [] as string[]
  });
  const [editStaffData, setEditStaffData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneCode: '+20',
    phoneNumber: '',
    role: 'staff',
    permissions: [] as string[]
  });
  const [permissionSearch, setPermissionSearch] = useState('');

  // Get plan-based permissions
  useEffect(() => {
    if (plan?.type) {
      const perms = getPlanPermissions(plan.type);
      setPlanPermissions(perms);
    }
  }, [plan]);

  // Define permission categories for the edit modal - based on actual system pages
  const permissionCategories = useMemo(() => [
    {
      name: 'Dashboard',
      permissions: [
        { key: 'dashboard_view', label: 'View Dashboard' }
      ]
    },
    {
      name: 'Orders',
      permissions: [
        { key: 'order_view', label: 'View Orders' },
        { key: 'order_create', label: 'Create Orders' },
        { key: 'order_update', label: 'Update Orders' },
        { key: 'order_delete', label: 'Delete Orders' },
        { key: 'scan_log', label: 'View Scan Log' }
      ]
    },
    {
      name: 'POS',
      permissions: [
        { key: 'pos_view', label: 'View POS' },
        { key: 'pos_access', label: 'Access POS System' }
      ]
    },
    {
      name: 'Customers',
      permissions: [
        { key: 'customer_view', label: 'View Customers' },
        { key: 'customer_create', label: 'Create Customers' },
        { key: 'customer_update', label: 'Update Customers' },
        { key: 'customer_delete', label: 'Delete Customers' }
      ]
    },
    {
      name: 'Product',
      permissions: [
        { key: 'product_view', label: 'View Products' },
        { key: 'product_create', label: 'Create New Product' },
        { key: 'product_update', label: 'Update Product' },
        { key: 'product_delete', label: 'Delete Product' },
        { key: 'product_import', label: 'Import Products' },
        { key: 'product_export', label: 'Export Products' }
      ]
    },
    {
      name: 'Collection',
      permissions: [
        { key: 'collection_view', label: 'View Collections' },
        { key: 'collection_create', label: 'Create New Collection' },
        { key: 'collection_update', label: 'Update Collection' },
        { key: 'collection_delete', label: 'Delete Collection' }
      ]
    },
    {
      name: 'Inventory',
      permissions: [
        { key: 'low_stock_view', label: 'View Low Stock' },
        { key: 'reviews_view', label: 'View Reviews' },
        { key: 'reviews_manage', label: 'Manage Reviews' }
      ]
    },
    {
      name: 'Finance',
      permissions: [
        { key: 'finance_view', label: 'View Finance Overview' },
        { key: 'finance_expenses', label: 'Manage Expenses' },
        { key: 'finance_reports', label: 'View Reports' },
        { key: 'finance_deposit', label: 'Deposit Money' },
        { key: 'finance_insights', label: 'View Insights' }
      ]
    },
    {
      name: 'E-commerce',
      permissions: [
        { key: 'website_builder', label: 'Website Builder' },
        { key: 'website_templates', label: 'View Templates' },
        { key: 'website_settings', label: 'Website Settings' }
      ]
    },
    {
      name: 'Staff Management',
      permissions: [
        { key: 'staff_view', label: 'View Staff' },
        { key: 'staff_create', label: 'Create Staff' },
        { key: 'staff_update', label: 'Update Staff' },
        { key: 'staff_delete', label: 'Delete Staff' },
        { key: 'roles_view', label: 'View Roles & Permissions' }
      ]
    },
    {
      name: 'Settings',
      permissions: [
        { key: 'settings_general', label: 'General Settings' },
        { key: 'settings_shipping', label: 'Shipping Settings' },
        { key: 'settings_payments', label: 'Payment Settings' },
        { key: 'settings_integrations', label: 'Integrations' }
      ]
    },
    {
      name: 'Analytics',
      permissions: [
        { key: 'analytics_view', label: 'View Analytics' }
      ]
    }
  ], []);

  // Define all system pages with their required permissions
  // This maps routes to the permissions needed to access them
  const systemPages = useMemo(() => {
    const planType = plan?.type || 'basic';
    const planPerms = getPlanPermissions(planType);

    const pages = [
      {
        route: '/',
        name: 'Dashboard',
        icon: 'dashboard',
        category: 'Core',
        description: 'Main dashboard overview',
        requiredPermissions: ['dashboard_view'],
        accessible: planPerms.includes('dashboard_view')
      },
      {
        route: '/orders',
        name: 'Orders',
        icon: 'receipt_long',
        category: 'Core',
        description: 'View and manage orders',
        requiredPermissions: ['order_view'],
        accessible: planPerms.includes('order_view')
      },
      {
        route: '/orders/scan-log',
        name: 'Scan Log',
        icon: 'qr_code_scanner',
        category: 'Core',
        description: 'View barcode scan history',
        requiredPermissions: ['scan_log'],
        accessible: planPerms.includes('scan_log')
      },
      {
        route: '/pos',
        name: 'POS System',
        icon: 'point_of_sale',
        category: 'Core',
        description: 'Point of sale interface',
        requiredPermissions: ['pos_view', 'pos_access'],
        accessible: planPerms.includes('pos_view') || planPerms.includes('pos_access')
      },
      {
        route: '/customers',
        name: 'Customers',
        icon: 'group',
        category: 'Customers',
        description: 'Manage customer database',
        requiredPermissions: ['customer_view'],
        accessible: planPerms.includes('customer_view')
      },
      {
        route: '/inventory/products',
        name: 'Products',
        icon: 'inventory',
        category: 'Inventory',
        description: 'Manage product catalog',
        requiredPermissions: ['product_view'],
        accessible: planPerms.includes('product_view')
      },
      {
        route: '/inventory/collections',
        name: 'Collections',
        icon: 'collections',
        category: 'Inventory',
        description: 'Manage product collections',
        requiredPermissions: ['collection_view'],
        accessible: planPerms.includes('collection_view')
      },
      {
        route: '/inventory/low-stock',
        name: 'Low Stock',
        icon: 'warning',
        category: 'Inventory',
        description: 'View low stock alerts',
        requiredPermissions: ['low_stock_view'],
        accessible: planPerms.includes('low_stock_view')
      },
      {
        route: '/inventory/reviews',
        name: 'Product Reviews',
        icon: 'rate_review',
        category: 'Inventory',
        description: 'Manage product reviews',
        requiredPermissions: ['reviews_view'],
        accessible: planPerms.includes('reviews_view')
      },
      {
        route: '/finance/overview',
        name: 'Finance Overview',
        icon: 'account_balance',
        category: 'Finance',
        description: 'Financial dashboard and summary',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/transactions',
        name: 'Transactions',
        icon: 'sync_alt',
        category: 'Finance',
        description: 'View all financial transactions',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/payments',
        name: 'Payments',
        icon: 'credit_score',
        category: 'Finance',
        description: 'Manage payments and receipts',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/expenses',
        name: 'Expenses',
        icon: 'receipt',
        category: 'Finance',
        description: 'Track and manage expenses',
        requiredPermissions: ['finance_expenses'],
        accessible: planPerms.includes('finance_expenses')
      },
      {
        route: '/finance/accounts',
        name: 'Accounts',
        icon: 'account_balance_wallet',
        category: 'Finance',
        description: 'Manage financial accounts',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/budgets',
        name: 'Budgets',
        icon: 'bookmark',
        category: 'Finance',
        description: 'Create and track budgets',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/reports',
        name: 'Reports',
        icon: 'assessment',
        category: 'Finance',
        description: 'Financial reports and analytics',
        requiredPermissions: ['finance_reports'],
        accessible: planPerms.includes('finance_reports')
      },
      {
        route: '/finance/taxes',
        name: 'Taxes',
        icon: 'request_quote',
        category: 'Finance',
        description: 'Manage tax settings and calculations',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/capital',
        name: 'Capital Return',
        icon: 'savings',
        category: 'Finance',
        description: 'Track capital return from orders',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/finance/audit',
        name: 'Audit Log',
        icon: 'fact_check',
        category: 'Finance',
        description: 'View financial audit trail',
        requiredPermissions: ['finance_view'],
        accessible: planPerms.includes('finance_view')
      },
      {
        route: '/ecommerce/website-builder',
        name: 'Website Builder',
        icon: 'web',
        category: 'E-commerce',
        description: 'Build and customize your website',
        requiredPermissions: ['website_builder'],
        accessible: planPerms.includes('website_builder')
      },
      {
        route: '/ecommerce/templates',
        name: 'Templates',
        icon: 'view_module',
        category: 'E-commerce',
        description: 'Browse website templates',
        requiredPermissions: ['website_templates'],
        accessible: planPerms.includes('website_templates')
      },
      {
        route: '/ecommerce/visit-store',
        name: 'Visit Store',
        icon: 'shopping_bag',
        category: 'E-commerce',
        description: 'Preview your online store',
        requiredPermissions: ['website_builder'],
        accessible: planPerms.includes('website_builder')
      },
      {
        route: '/ecommerce/custom-domains',
        name: 'Custom Domains',
        icon: 'language',
        category: 'E-commerce',
        description: 'Connect custom domain to your store',
        requiredPermissions: ['website_settings'],
        accessible: planPerms.includes('website_settings')
      },
      {
        route: '/rbac/users',
        name: 'Staff Management',
        icon: 'people',
        category: 'Management',
        description: 'Manage staff members and permissions',
        requiredPermissions: ['staff_view'],
        accessible: planPerms.includes('staff_view')
      },
      {
        route: '/rbac/roles',
        name: 'Roles & Permissions',
        icon: 'admin_panel_settings',
        category: 'Management',
        description: 'Configure roles and access levels',
        requiredPermissions: ['roles_view'],
        accessible: planPerms.includes('roles_view')
      },
      {
        route: '/settings',
        name: 'Settings',
        icon: 'settings',
        category: 'Management',
        description: 'System and business settings',
        requiredPermissions: ['settings_general'],
        accessible: planPerms.includes('settings_general')
      }
    ];

    return pages;
  }, [plan]);

  // Load staff, roles, and permissions
  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId]);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      
      // Load staff members
      const staffRef = collection(db, 'businesses', businessId, 'staff');
      const staffSnapshot = await getDocs(staffRef);
      const staff = staffSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaffMembers(staff);

      // Load permissions
      const permissionsData = await getPermissions();
      
      console.log('[SettingsPage] Loaded permissions:', permissionsData);
      console.log('[SettingsPage] Permissions count:', permissionsData?.length || 0);
      
      // Show all permissions in the edit modal (not filtered by plan)
      // Plan filtering is done at the checkbox level
      if (!permissionsData || permissionsData.length === 0) {
        console.warn('[SettingsPage] No permissions found in database. Permissions may need to be initialized.');
        console.warn('[SettingsPage] Run the RBAC initialization script to create permissions.');
      }
      setAvailablePermissions(permissionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load staff and roles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [businessId, plan, getPermissions]);

  // Map role to permissions
  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'administrator':
        return ['*']; // All permissions
      case 'posstaff':
        return ['order_view', 'order_create', 'product_view', 'collection_view', 'discount_create'];
      case 'marketing_manager':
        return ['product_view', 'discount_view', 'collection_view', 'navigation_view'];
      case 'website_manager':
        return ['product_view', 'product_create', 'product_edit', 'product_delete', 'collection_view', 'collection_create', 'collection_edit', 'collection_delete', 'discount_view', 'discount_create', 'discount_edit', 'discount_delete', 'customer_view', 'order_view', 'order_create', 'order_edit'];
      case 'products_manager':
        return ['product_view', 'product_create', 'product_delete'];
      default:
        return [];
    }
  };

  const handleSendInvitation = useCallback(async () => {
    if (!businessId || !inviteData.email || !inviteData.firstName || !inviteData.lastName) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      // Get permissions based on role
      const permissions = inviteData.role === 'other' 
        ? inviteData.customPermissions // Use custom permissions if "Other" is selected
        : getRolePermissions(inviteData.role);

      // Create staff invitation in Firestore
      const staffRef = collection(db, 'businesses', businessId, 'staff');
      const inviteDocRef = await addDoc(staffRef, {
        email: inviteData.email,
        name: `${inviteData.firstName} ${inviteData.lastName}`,
        firstName: inviteData.firstName,
        lastName: inviteData.lastName,
        phoneCode: inviteData.phoneCode,
        phoneNumber: inviteData.phoneNumber,
        role: inviteData.role,
        approved: false,
        invitedBy: user?.uid,
        invitedAt: new Date(),
        permissions: permissions, // Save permissions based on role
        createdAt: new Date()
      });

      // Send the actual invitation email
      const staffName = `${inviteData.firstName} ${inviteData.lastName}`;
      const inviterName = user?.displayName || user?.email?.split('@')[0] || 'Your Team';
      const baseUrl = window.location.origin;
      const setupUrl = `${baseUrl}/setup-password?email=${encodeURIComponent(inviteData.email)}&business=${encodeURIComponent(businessName || 'Your Business')}&businessId=${encodeURIComponent(businessId)}&role=${encodeURIComponent(inviteData.role)}&invitation=${inviteDocRef.id}`;

      // Always use production Cloud Functions for email (requires email credentials)
      const apiUrl = 'https://us-central1-madas-store.cloudfunctions.net/api/api/send-invitation';

      try {
        const emailResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            toEmail: inviteData.email,
            staffName: staffName,
            businessName: businessName || 'Your Business',
            role: inviteData.role,
            inviterName: inviterName,
            businessId: businessId,
            setupUrl: setupUrl
          })
        });

        const emailResult = await emailResponse.json();

        if (emailResult.success) {
          alert(`✅ Staff added and invitation email sent to ${inviteData.email}!`);
        } else {
          alert(`✅ Staff added, but email failed: ${emailResult.message}. Please share login link manually:\n\n${setupUrl}`);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        alert(`✅ Staff added, but couldn't send email. Please share this link manually:\n\n${setupUrl}`);
      }

      setShowInviteModal(false);
      setInviteData({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        phoneCode: '+20', 
        phoneNumber: '', 
        role: 'administrator',
        showCustomPermissions: false,
        customPermissions: []
      });
      loadData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  }, [businessId, businessName, inviteData, user?.uid, user?.displayName, user?.email, loadData]);


  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-madas-text/70">Loading staff members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-2">Staff Management</h2>
        <p className="text-sm text-madas-text/70">
          Manage staff invitations and control their access to pages based on your subscription plan.
        </p>
      </div>

      {/* Staff Members Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-primary">Staff Members</h3>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">person_add</span>
            Invite Staff
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No staff members yet. Invite someone to get started.
                  </td>
                </tr>
              ) : (
                staffMembers.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {staff.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {staff.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {staff.role || 'staff'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          staff.approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {staff.approved ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setEditingStaff(staff);
                            // Load staff permissions - handle both array and object formats
                            // Array format: ["order_view", "order_create"] (new format, matches old HTML page)
                            // Object format: { orders: ["view", "create"] } (legacy format)
                            let permissionKeys: string[] = [];
                            const staffPermissions = staff.permissions;
                            
                            if (Array.isArray(staffPermissions)) {
                              // Already in array format
                              permissionKeys = staffPermissions;
                            } else if (staffPermissions && typeof staffPermissions === 'object') {
                              // Object format - convert to array (matches old HTML page logic lines 1581-1585)
                              Object.entries(staffPermissions).forEach(([section, actions]) => {
                                if (Array.isArray(actions)) {
                                  actions.forEach((action) => {
                                    // Check if action is already a permission key or just an action
                                    if (typeof action === 'string' && action.includes('_')) {
                                      // Already a permission key like "order_view"
                                      permissionKeys.push(action);
                                    } else {
                                      // Just an action like "view", convert to permission key
                                      permissionKeys.push(`${section}_${action}`);
                                    }
                                  });
                                }
                              });
                            }
                            
                            // Parse name into first and last name
                            const nameParts = (staff.name || '').split(' ');
                            const firstName = staff.firstName || nameParts[0] || '';
                            const lastName = staff.lastName || nameParts.slice(1).join(' ') || '';
                            
                            setEditStaffData({
                              firstName: firstName,
                              lastName: lastName,
                              email: staff.email || '',
                              phoneCode: staff.phoneCode || '+20',
                              phoneNumber: staff.phoneNumber || '',
                              role: staff.role || 'staff',
                              permissions: permissionKeys
                            });
                            setShowEditStaffModal(true);
                          }}
                          className="text-primary hover:text-primary-dark"
                          title="Edit"
                        >
                          <span className="material-icons text-base">edit</span>
                        </button>
                        {!staff.approved && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Approve ${staff.name || staff.email}?`)) {
                                try {
                                  const staffRef = doc(db, 'businesses', businessId!, 'staff', staff.id);
                                  await updateDoc(staffRef, { approved: true });
                                  await loadData();
                                  alert('Staff member approved successfully!');
                                } catch (error) {
                                  console.error('Error approving staff:', error);
                                  alert('Failed to approve staff member.');
                                }
                              }
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <span className="material-icons text-base">check_circle</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to remove ${staff.name || staff.email}? This action cannot be undone.`)) {
                              try {
                                const staffRef = doc(db, 'businesses', businessId!, 'staff', staff.id);
                                await deleteDoc(staffRef);
                                await loadData();
                                alert('Staff member removed successfully!');
                              } catch (error) {
                                console.error('Error removing staff:', error);
                                alert('Failed to remove staff member.');
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          <span className="material-icons text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-xl font-semibold text-primary mb-6">Add staff</h3>
            <div className="space-y-6">
              {/* Personal Information */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      First Name
                </label>
                <input
                  type="text"
                      value={inviteData.firstName}
                      onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={inviteData.lastName}
                      onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">
                    Email Address
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Email Address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                    Phone Number
                </label>
                  <div className="flex gap-2">
                <select
                      value={inviteData.phoneCode}
                      onChange={(e) => setInviteData({ ...inviteData, phoneCode: e.target.value })}
                      className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                </select>
                    <input
                      type="tel"
                      value={inviteData.phoneNumber}
                      onChange={(e) => setInviteData({ ...inviteData, phoneNumber: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Phone Number"
                    />
              </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <h4 className="text-sm font-semibold text-madas-text/90 mb-4">
                  Select a Role for the staff you're inviting
                </h4>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="administrator"
                      checked={inviteData.role === 'administrator'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: false })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">Administrator</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Can Access Everything</div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="posstaff"
                      checked={inviteData.role === 'posstaff'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: false })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">POSstaff</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Can Create Discounts, View Collections and Products</div>
                      <a href="#" className="text-xs text-blue-600 hover:underline mt-1 block">Can sell offline through POS Application</a>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="marketing_manager"
                      checked={inviteData.role === 'marketing_manager'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: false })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">Marketing Manager</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Can View Products, Discounts, Collections and Navigation</div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="website_manager"
                      checked={inviteData.role === 'website_manager'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: false })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">Website Manager</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Can Access Everything in Products, Collections, Discounts, Customers and Orders</div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="products_manager"
                      checked={inviteData.role === 'products_manager'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: false })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">Products Manager</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Can Create, View and Delete Products</div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="other"
                      checked={inviteData.role === 'other'}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value, showCustomPermissions: true, customPermissions: [] })}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-madas-text/90">Other</div>
                      <div className="text-xs text-madas-text/60 mt-0.5">Assign Permissions separately below</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Permissions Section (shown when "Other" is selected) */}
              {inviteData.showCustomPermissions && inviteData.role === 'other' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-madas-text/80 mb-3">
                    Assign Permissions
                  </label>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                    {systemPages
                      .filter((page) => page.accessible)
                      .map((page) => {
                        const hasAllPagePermissions = page.requiredPermissions.every((perm) =>
                          inviteData.customPermissions.includes(perm)
                        );
                        return (
                          <label
                            key={page.route}
                            className={`flex items-start space-x-3 p-2 rounded-lg border-2 transition-all cursor-pointer ${
                              hasAllPagePermissions
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-primary'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasAllPagePermissions}
                              onChange={() => {
                                let newPermissions: string[];
                                if (hasAllPagePermissions) {
                                  // Remove all permissions for this page
                                  newPermissions = inviteData.customPermissions.filter(
                                    (p) => !page.requiredPermissions.includes(p)
                                  );
                                } else {
                                  // Add all required permissions for this page
                                  newPermissions = [...new Set([...inviteData.customPermissions, ...page.requiredPermissions])];
                                }
                                setInviteData({ ...inviteData, customPermissions: newPermissions });
                              }}
                              className="mt-1 h-4 w-4 rounded border-2 border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-madas-text/90">{page.name}</div>
                              <div className="text-xs text-madas-text/60 mt-0.5">{page.description}</div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteData({ 
                      firstName: '', 
                      lastName: '', 
                      email: '', 
                      phoneCode: '+20', 
                      phoneNumber: '', 
                      role: 'administrator',
                      showCustomPermissions: false,
                      customPermissions: []
                    });
                  }}
                  className="rounded-lg border border-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-base transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendInvitation}
                  className="rounded-lg bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  Save change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaffModal && editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-semibold text-primary mb-6 flex-shrink-0">Edit staff</h3>
            <div className="space-y-8 overflow-y-auto flex-1 pr-2">
              {/* Personal Information Section */}
              <div>
                <h4 className="text-sm font-semibold text-madas-text/90 mb-4">Personal Information</h4>
            <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                        First Name
                </label>
                <input
                  type="text"
                        value={editStaffData.firstName}
                        onChange={(e) => setEditStaffData({ ...editStaffData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editStaffData.lastName}
                        onChange={(e) => setEditStaffData({ ...editStaffData, lastName: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      Email Address
                </label>
                <input
                  type="email"
                  value={editStaffData.email}
                  onChange={(e) => setEditStaffData({ ...editStaffData, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-gray-50"
                      placeholder="Email Address"
                  disabled
                />
                <p className="mt-1 text-xs text-madas-text/60">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                      Phone Number
                </label>
                    <div className="flex gap-2">
                <select
                        value={editStaffData.phoneCode}
                        onChange={(e) => setEditStaffData({ ...editStaffData, phoneCode: e.target.value })}
                        className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="+20">🇪🇬 +20</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+966">🇸🇦 +966</option>
                </select>
                      <input
                        type="tel"
                        value={editStaffData.phoneNumber}
                        onChange={(e) => setEditStaffData({ ...editStaffData, phoneNumber: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Staff Permissions Section */}
              <div>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h4 className="text-sm font-semibold text-madas-text/90">Edit Staff Permissions</h4>
                    <button
                      type="button"
                      onClick={() => {
                      // Get all permissions from all categories
                      const allPermissions: string[] = [];
                      permissionCategories.forEach((category) => {
                        category.permissions.forEach((perm) => {
                          allPermissions.push(perm.key);
                        });
                      });
                      setEditStaffData({ ...editStaffData, permissions: allPermissions });
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-base text-madas-text/80 transition-colors"
                    >
                      Select All
                    </button>
                </div>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {permissionCategories.map((category) => {
                    const categoryPermissions = category.permissions.map((p) => p.key);
                    const allCategorySelected = categoryPermissions.every((key) =>
                      editStaffData.permissions.includes(key)
                    );
                    const someCategorySelected = categoryPermissions.some((key) =>
                      editStaffData.permissions.includes(key)
                    );
                      
                      return (
                      <div key={category.name} className="border border-gray-200 rounded-lg p-4 space-y-3">
                        {/* Category Header with Select All */}
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allCategorySelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = someCategorySelected && !allCategorySelected;
                              }
                            }}
                            onChange={() => {
                              let newPermissions: string[];
                              if (allCategorySelected) {
                                // Deselect all in category
                                newPermissions = editStaffData.permissions.filter(
                                  (p) => !categoryPermissions.includes(p)
                                );
                                  } else {
                                // Select all in category
                                newPermissions = [...new Set([...editStaffData.permissions, ...categoryPermissions])];
                              }
                              setEditStaffData({ ...editStaffData, permissions: newPermissions });
                            }}
                            className="h-4 w-4 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                            style={{ accentColor: '#9333ea' }}
                          />
                          <span className="font-medium text-sm text-madas-text/90">
                            {category.name} (Select all)
                          </span>
                        </label>

                        {/* Sub-permissions */}
                        <div className="ml-7 space-y-2">
                          {category.permissions.map((permission) => {
                            const isChecked = editStaffData.permissions.includes(permission.key);
                              return (
                                <label
                                key={permission.key}
                                className="flex items-center space-x-3 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                    let newPermissions: string[];
                                    if (isChecked) {
                                      newPermissions = editStaffData.permissions.filter(
                                        (p) => p !== permission.key
                                      );
                                    } else {
                                      newPermissions = [...editStaffData.permissions, permission.key];
                                    }
                                      setEditStaffData({ ...editStaffData, permissions: newPermissions });
                                    }}
                                  className="h-4 w-4 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                                  style={{ accentColor: '#9333ea' }}
                                />
                                <span className="text-sm text-madas-text/70">{permission.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStaffModal(false);
                    setEditingStaff(null);
                    setEditStaffData({ 
                      firstName: '', 
                      lastName: '', 
                      email: '', 
                      phoneCode: '+20', 
                      phoneNumber: '', 
                      role: 'staff', 
                      permissions: [] 
                    });
                    setPermissionSearch('');
                  }}
                  className="rounded-lg border border-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-base transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editStaffData.firstName || !editStaffData.lastName) {
                      alert('Please fill in all required fields.');
                      return;
                    }
                    try {
                      const staffRef = doc(db, 'businesses', businessId!, 'staff', editingStaff.id);

                      await updateDoc(staffRef, {
                        name: `${editStaffData.firstName} ${editStaffData.lastName}`,
                        firstName: editStaffData.firstName,
                        lastName: editStaffData.lastName,
                        phoneCode: editStaffData.phoneCode,
                        phoneNumber: editStaffData.phoneNumber,
                        role: editStaffData.role,
                        permissions: editStaffData.permissions,
                        updatedAt: new Date()
                      });
                      alert('Staff member updated successfully!');
                      setShowEditStaffModal(false);
                      setEditingStaff(null);
                      setEditStaffData({ 
                        firstName: '', 
                        lastName: '', 
                        email: '', 
                        phoneCode: '+20', 
                        phoneNumber: '', 
                        role: 'staff', 
                        permissions: [] 
                      });
                      setPermissionSearch('');
                      await loadData();
                    } catch (error) {
                      console.error('Error updating staff:', error);
                      alert('Failed to update staff member. Please try again.');
                    }
                  }}
                  className="rounded-lg bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  Save change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;



