import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { doc, getDoc, setDoc, db } from '../../lib/firebase';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentTab = 'overview' | 'cod' | 'stripe' | 'paymob' | 'fawry' | 'instapay' | 'vodafone_cash' | 'bank_transfer';

interface PaymentMethodBase {
  enabled: boolean;
  testMode?: boolean;
}

interface CODSettings extends PaymentMethodBase {
  verificationRequired?: boolean;
  maxOrderAmount?: number;
  instructions?: string;
}

interface StripeSettings extends PaymentMethodBase {
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  currency?: string;
}

interface PaymobSettings extends PaymentMethodBase {
  apiKey?: string;
  integrationId?: string;
  iframeId?: string;
  hmacSecret?: string;
}

interface FawrySettings extends PaymentMethodBase {
  merchantCode?: string;
  securityKey?: string;
  returnUrl?: string;
}

interface InstapaySettings extends PaymentMethodBase {
  accountName?: string;
  accountNumber?: string;
  instructions?: string;
}

interface VodafoneCashSettings extends PaymentMethodBase {
  phoneNumber?: string;
  instructions?: string;
}

interface BankTransferSettings extends PaymentMethodBase {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  instructions?: string;
}

interface PaymentsData {
  cod?: CODSettings;
  stripe?: StripeSettings;
  paymob?: PaymobSettings;
  fawry?: FawrySettings;
  instapay?: InstapaySettings;
  vodafone_cash?: VodafoneCashSettings;
  bank_transfer?: BankTransferSettings;
  updatedAt?: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sanitizeData = <T extends Record<string, unknown>>(obj: T): T => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) { result[key] = null; }
    else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null ? sanitizeData(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeData(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
};

// ─── Component ───────────────────────────────────────────────────────────────

const PaymentsPage = () => {
  const { businessId, loading } = useBusiness();
  const { loading: rbacLoading } = useRBAC();

  const [activeTab, setActiveTab] = useState<PaymentTab>('overview');
  const [data, setData] = useState<PaymentsData>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs: Array<{ id: PaymentTab; label: string; icon: string; color: string }> = [
    { id: 'overview', label: 'Overview', icon: 'dashboard', color: 'text-primary' },
    { id: 'cod', label: 'Cash on Delivery', icon: 'payments', color: 'text-green-600' },
    { id: 'stripe', label: 'Stripe', icon: 'credit_card', color: 'text-indigo-600' },
    { id: 'paymob', label: 'Paymob', icon: 'account_balance', color: 'text-blue-600' },
    { id: 'fawry', label: 'Fawry', icon: 'store', color: 'text-yellow-600' },
    { id: 'instapay', label: 'InstaPay', icon: 'phone_iphone', color: 'text-purple-600' },
    { id: 'vodafone_cash', label: 'Vodafone Cash', icon: 'smartphone', color: 'text-red-600' },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: 'account_balance_wallet', color: 'text-teal-600' }
  ];

  const loadData = useCallback(async () => {
    if (!businessId) { setLoadingData(false); return; }
    try {
      setLoadingData(true);
      const ref = doc(db, 'tenants', businessId, 'settings', 'payments');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setData(snap.data() as PaymentsData);
      } else {
        setData({
          cod: { enabled: true },
          stripe: { enabled: false, testMode: true },
          paymob: { enabled: false, testMode: true },
          fawry: { enabled: false, testMode: true },
          instapay: { enabled: false },
          vodafone_cash: { enabled: false },
          bank_transfer: { enabled: false }
        });
      }
    } catch (err) {
      console.error('[PaymentsPage] Error loading:', err);
    } finally {
      setLoadingData(false);
    }
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (provider: PaymentTab, providerData: Record<string, unknown>) => {
    if (!businessId) return;
    try {
      setSaving(true);
      const ref = doc(db, 'tenants', businessId, 'settings', 'payments');
      const updated = { ...data, [provider]: providerData, updatedAt: new Date() };
      await setDoc(ref, sanitizeData(updated as Record<string, unknown>), { merge: true });
      setData(updated);
      alert('Payment settings saved successfully!');
    } catch (err) {
      console.error('[PaymentsPage] Error saving:', err);
      alert('Failed to save payment settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || rbacLoading || loadingData) {
    return <FullScreenLoader message="Loading payment settings..." />;
  }

  return (
    <PermissionGuard
      permission="settings_integrations"
      fallback={
        <div className="p-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">Access Restricted</p>
            <p className="text-yellow-700 text-sm mt-1">You don't have permission to modify payment settings.</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-lg p-1.5 text-madas-text/50 hover:bg-base transition-colors"
            >
              <span className="material-icons text-xl">arrow_back</span>
            </button>
            <h1 className="text-3xl font-semibold text-primary">Payment Methods</h1>
          </div>
          <p className="text-sm text-madas-text/70 ml-10">
            Configure payment gateways and methods for your store.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 text-madas-text hover:bg-base'
              )}
            >
              <span className={clsx('material-icons text-base', activeTab === tab.id ? 'text-white' : tab.color)}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          {activeTab === 'overview' && (
            <OverviewTab data={data} onSelect={setActiveTab} tabs={tabs} />
          )}
          {activeTab === 'cod' && (
            <ProviderForm
              title="Cash on Delivery"
              description="Allow customers to pay when they receive their order."
              icon="payments"
              iconColor="bg-green-100 text-green-600"
              data={data.cod || { enabled: true }}
              saving={saving}
              onSave={(d) => handleSave('cod', d)}
              fields={[
                { key: 'instructions', label: 'Instructions for Customer', type: 'textarea', placeholder: 'e.g. Please have the exact amount ready' },
                { key: 'maxOrderAmount', label: 'Maximum Order Amount (0 = no limit)', type: 'number', placeholder: '0' },
                { key: 'verificationRequired', label: 'Require phone verification', type: 'toggle' }
              ]}
            />
          )}
          {activeTab === 'stripe' && (
            <ProviderForm
              title="Stripe"
              description="Accept credit/debit cards via Stripe."
              icon="credit_card"
              iconColor="bg-indigo-100 text-indigo-600"
              data={data.stripe || { enabled: false, testMode: true }}
              saving={saving}
              onSave={(d) => handleSave('stripe', d)}
              hasTestMode
              fields={[
                { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_...' },
                { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_...' },
                { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
                { key: 'currency', label: 'Currency Code', type: 'text', placeholder: 'EGP' }
              ]}
            />
          )}
          {activeTab === 'paymob' && (
            <ProviderForm
              title="Paymob"
              description="Accept online payments through Paymob Accept."
              icon="account_balance"
              iconColor="bg-blue-100 text-blue-600"
              data={data.paymob || { enabled: false, testMode: true }}
              saving={saving}
              onSave={(d) => handleSave('paymob', d)}
              hasTestMode
              fields={[
                { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Paymob API key' },
                { key: 'integrationId', label: 'Integration ID', type: 'text', placeholder: 'e.g. 123456' },
                { key: 'iframeId', label: 'iFrame ID', type: 'text', placeholder: 'e.g. 789012' },
                { key: 'hmacSecret', label: 'HMAC Secret', type: 'password', placeholder: 'Your HMAC secret' }
              ]}
            />
          )}
          {activeTab === 'fawry' && (
            <ProviderForm
              title="Fawry"
              description="Accept payments through Fawry reference numbers."
              icon="store"
              iconColor="bg-yellow-100 text-yellow-600"
              data={data.fawry || { enabled: false, testMode: true }}
              saving={saving}
              onSave={(d) => handleSave('fawry', d)}
              hasTestMode
              fields={[
                { key: 'merchantCode', label: 'Merchant Code', type: 'text', placeholder: 'Your Fawry merchant code' },
                { key: 'securityKey', label: 'Security Key', type: 'password', placeholder: 'Your security key' },
                { key: 'returnUrl', label: 'Return URL', type: 'text', placeholder: 'https://yourstore.com/checkout/success' }
              ]}
            />
          )}
          {activeTab === 'instapay' && (
            <ProviderForm
              title="InstaPay"
              description="Accept instant bank transfers via InstaPay."
              icon="phone_iphone"
              iconColor="bg-purple-100 text-purple-600"
              data={data.instapay || { enabled: false }}
              saving={saving}
              onSave={(d) => handleSave('instapay', d)}
              fields={[
                { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Your name as registered' },
                { key: 'accountNumber', label: 'InstaPay Address / IPA', type: 'text', placeholder: 'e.g. yourname@instapay' },
                { key: 'instructions', label: 'Instructions for Customer', type: 'textarea', placeholder: 'e.g. Send payment to the address above and include your order number' }
              ]}
            />
          )}
          {activeTab === 'vodafone_cash' && (
            <ProviderForm
              title="Vodafone Cash"
              description="Accept mobile wallet payments via Vodafone Cash."
              icon="smartphone"
              iconColor="bg-red-100 text-red-600"
              data={data.vodafone_cash || { enabled: false }}
              saving={saving}
              onSave={(d) => handleSave('vodafone_cash', d)}
              fields={[
                { key: 'phoneNumber', label: 'Vodafone Cash Number', type: 'text', placeholder: '01xx xxx xxxx' },
                { key: 'instructions', label: 'Instructions for Customer', type: 'textarea', placeholder: 'e.g. Send payment to this number and include your order ID as reference' }
              ]}
            />
          )}
          {activeTab === 'bank_transfer' && (
            <ProviderForm
              title="Bank Transfer"
              description="Accept direct bank wire transfers."
              icon="account_balance_wallet"
              iconColor="bg-teal-100 text-teal-600"
              data={data.bank_transfer || { enabled: false }}
              saving={saving}
              onSave={(d) => handleSave('bank_transfer', d)}
              fields={[
                { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g. CIB, NBE, QNB' },
                { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name on account' },
                { key: 'accountNumber', label: 'Account Number', type: 'text', placeholder: 'Your bank account number' },
                { key: 'iban', label: 'IBAN', type: 'text', placeholder: 'EG...' },
                { key: 'swiftCode', label: 'SWIFT / BIC Code', type: 'text', placeholder: 'e.g. CIBEEGCX' },
                { key: 'instructions', label: 'Instructions for Customer', type: 'textarea', placeholder: 'e.g. Transfer to the above account and email us the receipt' }
              ]}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  );
};

// ─── Overview Tab ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  data: PaymentsData;
  onSelect: (tab: PaymentTab) => void;
  tabs: Array<{ id: PaymentTab; label: string; icon: string; color: string }>;
}

const OverviewTab = ({ data, onSelect, tabs }: OverviewTabProps) => {
  const methods = tabs.filter(t => t.id !== 'overview');

  const isEnabled = (id: PaymentTab): boolean => {
    const d = data[id as keyof PaymentsData] as PaymentMethodBase | undefined;
    return d?.enabled ?? false;
  };

  const enabledCount = methods.filter(m => isEnabled(m.id)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Payment Methods Overview</h2>
          <p className="text-sm text-madas-text/60 mt-1">
            {enabledCount} of {methods.length} payment methods enabled
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map(method => {
          const enabled = isEnabled(method.id);
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id)}
              className={clsx(
                'flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
                enabled
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              )}
            >
              <div className={clsx(
                'flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center',
                enabled ? 'bg-green-100' : 'bg-gray-100'
              )}>
                <span className={clsx('material-icons text-xl', enabled ? 'text-green-600' : 'text-gray-400')}>
                  {method.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-madas-text/90 text-sm">{method.label}</h3>
                  {enabled && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <span className="material-icons text-[10px]">check_circle</span>
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-madas-text/50 mt-0.5">
                  {enabled ? 'Enabled — click to configure' : 'Not configured — click to set up'}
                </p>
              </div>
              <span className="material-icons text-madas-text/30 text-lg mt-1">chevron_right</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Provider Form ───────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'textarea' | 'toggle';
  placeholder?: string;
}

interface ProviderFormProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  data: Record<string, unknown>;
  saving: boolean;
  hasTestMode?: boolean;
  fields: FieldDef[];
  onSave: (data: Record<string, unknown>) => void;
}

const ProviderForm = ({ title, description, icon, iconColor, data, saving, hasTestMode, fields, onSave }: ProviderFormProps) => {
  const [local, setLocal] = useState<Record<string, unknown>>(data);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => { setLocal(data); }, [data]);

  const set = (key: string, value: unknown) => setLocal(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={clsx('flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center', iconColor)}>
            <span className="material-icons text-3xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
            <p className="text-sm text-madas-text/60 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
        <div>
          <p className="font-medium text-madas-text/90">Enable {title}</p>
          <p className="text-xs text-madas-text/50">Show this payment method to customers at checkout</p>
        </div>
        <button
          type="button"
          onClick={() => set('enabled', !local.enabled)}
          className={clsx(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            local.enabled ? 'bg-green-500' : 'bg-gray-300'
          )}
        >
          <span className={clsx(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform',
            local.enabled ? 'translate-x-5' : 'translate-x-0'
          )} />
        </button>
      </div>

      {/* Test mode toggle */}
      {hasTestMode && (
        <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-4">
          <div>
            <p className="font-medium text-madas-text/90">Test Mode</p>
            <p className="text-xs text-madas-text/50">Use sandbox/test credentials for development</p>
          </div>
          <button
            type="button"
            onClick={() => set('testMode', !local.testMode)}
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              local.testMode ? 'bg-orange-500' : 'bg-gray-300'
            )}
          >
            <span className={clsx(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform',
              local.testMode ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {fields.map(field => {
          if (field.type === 'toggle') {
            return (
              <div key={field.key} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-madas-text/80">{field.label}</p>
                <button
                  type="button"
                  onClick={() => set(field.key, !local[field.key])}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    local[field.key] ? 'bg-primary' : 'bg-gray-300'
                  )}
                >
                  <span className={clsx(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform',
                    local[field.key] ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-madas-text/80 mb-1.5">{field.label}</label>
                <textarea
                  value={(local[field.key] as string) || ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            );
          }

          const isPassword = field.type === 'password';
          const visible = showSecrets[field.key];

          return (
            <div key={field.key}>
              <label className="block text-sm font-medium text-madas-text/80 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={isPassword && !visible ? 'password' : field.type === 'number' ? 'number' : 'text'}
                  value={(local[field.key] as string | number) ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10"
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-madas-text/40 hover:text-madas-text/70"
                  >
                    <span className="material-icons text-lg">{visible ? 'visibility_off' : 'visibility'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(local)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="material-icons text-base animate-spin">progress_activity</span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-icons text-base">save</span>
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentsPage;
