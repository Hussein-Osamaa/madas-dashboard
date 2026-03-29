import { useState, useEffect, useCallback, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useRBAC } from '../../contexts/RBACContext';
import PermissionGuard from '../../components/rbac/PermissionGuard';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { doc, getDoc, setDoc, db } from '../../lib/backend';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type ExternalWebsiteConfig = {
  enabled: boolean;
  name: string;
  baseUrl: string;
  api: {
    enabled: boolean;
    apiToken: string;
  };
  webhook: {
    enabled: boolean;
    secret: string;
    events: string[];
  };
  allowedOrigins: string[];
  updatedAt?: string;
};

type ToastState = {
  message: string;
  type: 'success' | 'error' | 'warning';
} | null;

const EMPTY_CONFIG: ExternalWebsiteConfig = {
  enabled: false,
  name: '',
  baseUrl: '',
  api: { enabled: false, apiToken: '' },
  webhook: { enabled: false, secret: '', events: ['order.created', 'order.updated', 'inventory.updated'] },
  allowedOrigins: [],
};

const ALL_WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order created', description: 'Fires when a new order is placed' },
  { id: 'order.updated', label: 'Order updated', description: 'Fires when an order status changes' },
  { id: 'inventory.updated', label: 'Inventory updated', description: 'Fires when product stock changes' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSecureToken(length = 44): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function getExternalApiBaseUrl(businessId: string): string {
  const env = import.meta.env.VITE_API_BACKEND_URL as string | undefined;
  let origin = 'https://xdigix-os-production.up.railway.app';
  if (typeof env === 'string' && env.trim()) {
    const raw = env.trim().replace(/\/$/, '').replace(/\/api.*$/i, '');
    if (raw.startsWith('http')) origin = raw;
    else if (raw) origin = `https://${raw}`;
  }
  return `${origin}/api/external/${businessId}`;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return 'Never';
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600',
  };
  const icons = { success: 'check_circle', error: 'error', warning: 'warning' };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={clsx('flex items-center gap-2.5 rounded-xl px-5 py-3 text-white shadow-lg', colors[toast.type])}>
        <span className="material-icons text-lg">{icons[toast.type]}</span>
        <span className="text-sm font-medium">{toast.message}</span>
        <button type="button" onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
          <span className="material-icons text-base">close</span>
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecretField({
  label,
  value,
  revealed,
  onToggleReveal,
  onGenerate,
  onCopy,
  copied,
  hint,
}: {
  label: string;
  value: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onGenerate: () => void;
  onCopy: () => void;
  copied: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type={revealed ? 'text' : 'password'}
            readOnly
            value={value}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 px-3 py-2 pr-10 text-sm font-mono placeholder:text-gray-500"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={onToggleReveal}
            title={revealed ? 'Hide' : 'Reveal'}
          >
            <span className="material-icons text-lg">{revealed ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={onGenerate}
          >
            Regenerate
          </button>
          {value && (
            <button
              type="button"
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                copied
                  ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-green-700 text-white hover:bg-green-800 dark:bg-primary dark:text-white dark:hover:bg-primary/90'
              )}
              onClick={onCopy}
            >
              <span className="material-icons text-base align-middle mr-1">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={value}
          className={clsx(
            'flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 px-3 py-2 text-sm placeholder:text-gray-500',
            mono && 'font-mono'
          )}
        />
        <button
          type="button"
          className={clsx(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            copied
              ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-400'
              : 'bg-green-700 text-white hover:bg-green-800 dark:bg-primary dark:text-white dark:hover:bg-primary/90'
          )}
          onClick={onCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <section
      className={clsx(
        'bg-gray-100/90 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-opacity',
        disabled && 'opacity-50 pointer-events-none select-none'
      )}
    >
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={clsx(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-primary',
          checked ? 'bg-green-700 dark:bg-primary' : 'bg-gray-200 dark:bg-gray-600'
        )}
        onClick={onChange}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ExternalWebsitePage = () => {
  const { businessId, loading, role } = useBusiness();
  const { loading: rbacLoading } = useRBAC();

  const [config, setConfig] = useState<ExternalWebsiteConfig>(EMPTY_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ExternalWebsiteConfig>(EMPTY_CONFIG);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealApiToken, setRevealApiToken] = useState(false);
  const [revealWebhookSecret, setRevealWebhookSecret] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; onConfirm: () => void;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'endpoints'>('config');
  const dirtyRef = useRef(false);

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  dirtyRef.current = isDirty;

  // Warn on unsaved changes before navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ─── Data ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!businessId) { setLoadingData(false); return; }
    try {
      setLoadingData(true);
      const ref = doc(db, 'tenants', businessId, 'settings', 'externalWebsite');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<ExternalWebsiteConfig>;
        const merged: ExternalWebsiteConfig = {
          enabled: data.enabled ?? false,
          name: data.name ?? '',
          baseUrl: data.baseUrl ?? '',
          api: {
            enabled: data.api?.enabled ?? false,
            apiToken: data.api?.apiToken ?? '',
          },
          webhook: {
            enabled: data.webhook?.enabled ?? false,
            secret: data.webhook?.secret ?? '',
            events: data.webhook?.events ?? EMPTY_CONFIG.webhook.events,
          },
          allowedOrigins: data.allowedOrigins ?? [],
          updatedAt: data.updatedAt,
        };
        setConfig(merged);
        setSavedConfig(merged);
      } else {
        setConfig(EMPTY_CONFIG);
        setSavedConfig(EMPTY_CONFIG);
      }
    } catch (err) {
      console.error('[ExternalWebsitePage] Load error:', err);
      setToast({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoadingData(false);
    }
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!businessId) return;
    if (config.enabled && !config.api.apiToken && config.api.enabled) {
      setToast({ message: 'Generate an API token before enabling the API', type: 'warning' });
      return;
    }
    if (config.enabled && !config.webhook.secret && config.webhook.enabled) {
      setToast({ message: 'Generate a webhook secret before enabling webhooks', type: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const toSave: ExternalWebsiteConfig = { ...config, updatedAt: new Date().toISOString() };
      const ref = doc(db, 'tenants', businessId, 'settings', 'externalWebsite');
      await setDoc(ref, toSave, { merge: true });
      setSavedConfig(toSave);
      setConfig(toSave);
      setRevealApiToken(false);
      setRevealWebhookSecret(false);
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch (err) {
      console.error('[ExternalWebsitePage] Save error:', err);
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Token actions ─────────────────────────────────────────────────────────

  const requestGenerateApiToken = () => {
    if (config.api.apiToken) {
      setConfirmDialog({
        title: 'Regenerate API token?',
        message: 'The current token will be invalidated immediately. Any external site using it will lose access until updated.',
        confirmLabel: 'Regenerate',
        onConfirm: () => {
          setConfig((c) => ({ ...c, api: { ...c.api, apiToken: generateSecureToken() } }));
          setRevealApiToken(true);
          setConfirmDialog(null);
          setToast({ message: 'New API token generated. Save to apply.', type: 'warning' });
        },
      });
    } else {
      setConfig((c) => ({ ...c, api: { ...c.api, apiToken: generateSecureToken() } }));
      setRevealApiToken(true);
    }
  };

  const requestGenerateWebhookSecret = () => {
    if (config.webhook.secret) {
      setConfirmDialog({
        title: 'Regenerate webhook secret?',
        message: 'The current secret will be invalidated. Any external site verifying signatures will need the new secret.',
        confirmLabel: 'Regenerate',
        onConfirm: () => {
          setConfig((c) => ({ ...c, webhook: { ...c.webhook, secret: generateSecureToken() } }));
          setRevealWebhookSecret(true);
          setConfirmDialog(null);
          setToast({ message: 'New webhook secret generated. Save to apply.', type: 'warning' });
        },
      });
    } else {
      setConfig((c) => ({ ...c, webhook: { ...c.webhook, secret: generateSecureToken() } }));
      setRevealWebhookSecret(true);
    }
  };

  // ─── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = async (field: string, value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const apiBaseUrl = businessId ? getExternalApiBaseUrl(businessId) : '';
  const ordersUrl = `${apiBaseUrl}/orders`;
  const webhookUrl = `${apiBaseUrl}/webhook`;
  const productsUrl = `${apiBaseUrl}/products`;

  // Server-side snippet: never contains raw secrets; uses env var placeholders
  const serverSnippet = businessId
    ? `// Server-side only. Set these in your .env — never expose in client code.
const XDIGIX_CONFIG = {
  tenantId: '${businessId}',
  apiToken: process.env.XDIGIX_API_TOKEN,       // from dashboard
  baseUrl: '${apiBaseUrl}',
  webhookUrl: '${webhookUrl}',
  webhookSecret: process.env.XDIGIX_WEBHOOK_SECRET, // from dashboard
};`
    : '// Save your settings first to generate the snippet.';

  const curlOrderExample = `curl -X POST '${ordersUrl}' \\
  -H 'Authorization: Bearer YOUR_API_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{ "items": [{ "productId": "abc123", "quantity": 1 }], "source": "external" }'`;

  const curlProductsExample = `curl '${productsUrl}' \\
  -H 'Authorization: Bearer YOUR_API_TOKEN'`;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading || rbacLoading || loadingData) {
    return <FullScreenLoader message="Loading external website settings..." />;
  }

  return (
    <PermissionGuard
      permission="website_settings"
      fallback={
        <div className="p-6">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-lg">
            <p className="text-amber-900 dark:text-amber-200 font-medium">Access restricted</p>
            <p className="text-amber-800 dark:text-amber-300 text-sm mt-1">
              You need permission to manage external website integration.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 px-6 py-8 max-w-4xl bg-gray-50/80 dark:bg-gray-900/30 min-h-[calc(100vh-4rem)] rounded-xl">

        {/* Header */}
        <header>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back"
            >
              <span className="material-icons text-xl">arrow_back</span>
            </button>
            <h1 className="text-3xl font-semibold text-green-800 dark:text-primary">External Website</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">
            Connect an external website to your store via secure API and webhooks.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {([
            { id: 'config' as const, label: 'Configuration', icon: 'settings' },
            { id: 'endpoints' as const, label: 'API Reference', icon: 'code' },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-green-700 text-green-800 dark:border-primary dark:text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              <span className="material-icons text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Configuration Tab ─────────────────────────────────────────── */}
        {activeTab === 'config' && (
          <div className="space-y-6">

            {/* Status banner */}
            {config.enabled && savedConfig.enabled && (
              <div className="flex items-center gap-3 rounded-xl border border-green-300 dark:border-green-800 bg-green-100 dark:bg-green-900/20 p-4">
                <span className="material-icons text-green-700 dark:text-green-400">check_circle</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">Integration active</p>
                  <p className="text-xs text-green-800 dark:text-green-300 mt-0.5">
                    Last saved: {formatTimestamp(savedConfig.updatedAt)}
                  </p>
                </div>
                {isDirty && (
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-200 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    Unsaved changes
                  </span>
                )}
              </div>
            )}

            {/* Enable integration */}
            <SectionCard>
              <Toggle
                checked={config.enabled}
                onChange={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
                label="Enable integration"
                description="Allow external sites to connect via API and webhooks."
              />
            </SectionCard>

            {/* Security warning */}
            {config.enabled && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-900/20 p-4">
                <span className="material-icons text-amber-700 dark:text-amber-400 mt-0.5">shield</span>
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-200">Security notice</p>
                  <ul className="text-amber-800 dark:text-amber-300 mt-1 space-y-0.5 list-disc ml-4">
                    <li>API tokens and webhook secrets are sensitive credentials.</li>
                    <li>Never expose them in client-side code, public repositories, or browser logs.</li>
                    <li>Use them only in your server-side backend (Node.js, Python, etc.).</li>
                    <li>Rotate credentials immediately if you suspect they were compromised.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tenant ID */}
            <SectionCard disabled={!config.enabled}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Identification</h2>
              <ReadOnlyField
                label="Tenant ID"
                value={businessId ?? ''}
                mono
                onCopy={() => handleCopy('tenantId', businessId ?? '')}
                copied={copiedField === 'tenantId'}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                Your unique identifier. Use this in all external API requests as the <code className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded px-1 py-0.5 font-mono">:tenantId</code> path parameter.
              </p>
            </SectionCard>

            {/* External site info */}
            <SectionCard disabled={!config.enabled}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">External site details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site name</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. My Store"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-500 px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent dark:focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site URL</label>
                  <input
                    type="url"
                    value={config.baseUrl}
                    onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                    placeholder="https://your-site.com"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-500 px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent dark:focus:ring-primary"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Outbound API */}
            <SectionCard disabled={!config.enabled}>
              <div className="space-y-4">
                <Toggle
                  checked={config.api.enabled}
                  onChange={() => setConfig((c) => ({ ...c, api: { ...c.api, enabled: !c.api.enabled } }))}
                  label="Outbound API"
                  description="External sites read your products and create orders via this API."
                />

                {config.api.enabled && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <ReadOnlyField
                      label="API base URL"
                      value={apiBaseUrl}
                      mono
                      onCopy={() => handleCopy('apiBase', apiBaseUrl)}
                      copied={copiedField === 'apiBase'}
                    />

                    <SecretField
                      label="API token"
                      value={config.api.apiToken}
                      revealed={revealApiToken}
                      onToggleReveal={() => setRevealApiToken((r) => !r)}
                      onGenerate={requestGenerateApiToken}
                      onCopy={() => handleCopy('apiToken', config.api.apiToken)}
                      copied={copiedField === 'apiToken'}
                      hint={!config.api.apiToken ? 'Generate a token before saving.' : undefined}
                    />
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Inbound Webhook */}
            <SectionCard disabled={!config.enabled}>
              <div className="space-y-4">
                <Toggle
                  checked={config.webhook.enabled}
                  onChange={() => setConfig((c) => ({ ...c, webhook: { ...c.webhook, enabled: !c.webhook.enabled } }))}
                  label="Inbound webhook"
                  description="Receive real-time event notifications on your external site's backend."
                />

                {config.webhook.enabled && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <ReadOnlyField
                      label="Webhook URL"
                      value={webhookUrl}
                      mono
                      onCopy={() => handleCopy('webhookUrl', webhookUrl)}
                      copied={copiedField === 'webhookUrl'}
                    />

                    <SecretField
                      label="Webhook secret (HMAC-SHA256)"
                      value={config.webhook.secret}
                      revealed={revealWebhookSecret}
                      onToggleReveal={() => setRevealWebhookSecret((r) => !r)}
                      onGenerate={requestGenerateWebhookSecret}
                      onCopy={() => handleCopy('webhookSecret', config.webhook.secret)}
                      copied={copiedField === 'webhookSecret'}
                      hint={!config.webhook.secret ? 'Generate a secret before saving.' : undefined}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
                      <div className="space-y-2">
                        {ALL_WEBHOOK_EVENTS.map((ev) => {
                          const selected = config.webhook.events.includes(ev.id);
                          return (
                            <label key={ev.id} className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const events = selected
                                    ? config.webhook.events.filter((e) => e !== ev.id)
                                    : [...config.webhook.events, ev.id];
                                  setConfig((c) => ({ ...c, webhook: { ...c.webhook, events: events.length ? events : [ev.id] } }));
                                }}
                                className="rounded border-gray-300 dark:border-gray-600 text-green-700 focus:ring-green-600 dark:text-primary dark:focus:ring-primary mt-0.5"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ev.label}</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{ev.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Allowed origins (CORS) */}
            <SectionCard disabled={!config.enabled}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Allowed origins (CORS)</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Optional. Restrict which domains can call your API from the browser. One origin per line.
                Leave empty if your external site calls the API from its own backend only (recommended).
              </p>
              <textarea
                value={config.allowedOrigins.join('\n')}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    allowedOrigins: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                rows={3}
                placeholder="https://your-store.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-500 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-600 focus:border-transparent dark:focus:ring-primary"
              />
            </SectionCard>

            {/* Server-side snippet */}
            <SectionCard disabled={!config.enabled}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Server-side configuration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add this to your external site's <strong>server-side</strong> code. Set the environment variables from the tokens above.
                <span className="text-red-600 dark:text-red-400 font-medium"> Never include real tokens in this snippet.</span>
              </p>
              <div className="relative">
                <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto overflow-y-auto max-h-56 font-mono leading-relaxed whitespace-pre">
{serverSnippet}
                </pre>
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium transition-colors"
                  onClick={() => handleCopy('snippet', serverSnippet)}
                >
                  {copiedField === 'snippet' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </SectionCard>

            {/* Save */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {savedConfig.updatedAt ? `Last saved: ${formatTimestamp(savedConfig.updatedAt)}` : ''}
              </div>
              <div className="flex items-center gap-3">
                {isDirty && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
                )}
                <button
                  type="button"
                  disabled={saving || !isDirty}
                  onClick={handleSave}
                  className="rounded-xl bg-green-700 text-white px-6 py-2.5 font-medium hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-primary dark:hover:bg-primary/90"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="material-icons text-base animate-spin">sync</span>
                      Saving...
                    </span>
                  ) : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── API Reference Tab ─────────────────────────────────────────── */}
        {activeTab === 'endpoints' && (
          <div className="space-y-6">

            <div className="flex items-start gap-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/20 p-4">
              <span className="material-icons text-blue-700 dark:text-blue-400 mt-0.5">info</span>
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium">All endpoints require authentication</p>
                <p className="mt-0.5">Send your API token in the <code className="bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 rounded px-1 py-0.5 font-mono">Authorization: Bearer YOUR_TOKEN</code> header with every request.</p>
              </div>
            </div>

            {/* Orders */}
            <SectionCard>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded">POST</span>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Create order</h3>
              </div>
              <ReadOnlyField
                label="Endpoint"
                value={ordersUrl}
                mono
                onCopy={() => handleCopy('ordersUrl', ordersUrl)}
                copied={copiedField === 'ordersUrl'}
              />
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request body</p>
                <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">{`{
  "items": [
    { "productId": "abc123", "quantity": 2, "size": "M" }
  ],
  "source": "my-store",
  "customerEmail": "customer@example.com",
  "metadata": {}
}`}</pre>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Example (cURL)</p>
                <div className="relative">
                  <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">{curlOrderExample}</pre>
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 text-[10px] font-medium"
                    onClick={() => handleCopy('curlOrder', curlOrderExample)}
                  >
                    {copiedField === 'curlOrder' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response (201)</p>
                <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto">{`{ "success": true, "orderId": "..." }`}</pre>
              </div>
            </SectionCard>

            {/* Products */}
            <SectionCard>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded">GET</span>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">List products</h3>
              </div>
              <ReadOnlyField
                label="Endpoint"
                value={productsUrl}
                mono
                onCopy={() => handleCopy('productsUrl', productsUrl)}
                copied={copiedField === 'productsUrl'}
              />
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Example (cURL)</p>
                <div className="relative">
                  <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">{curlProductsExample}</pre>
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 text-[10px] font-medium"
                    onClick={() => handleCopy('curlProducts', curlProductsExample)}
                  >
                    {copiedField === 'curlProducts' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Webhook */}
            <SectionCard>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold px-2 py-0.5 rounded">POST</span>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Webhook receiver</h3>
              </div>
              <ReadOnlyField
                label="Endpoint"
                value={webhookUrl}
                mono
                onCopy={() => handleCopy('webhookUrlRef', webhookUrl)}
                copied={copiedField === 'webhookUrlRef'}
              />
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your backend sends events here. Signature verification is required.
                </p>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required headers</p>
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-900 p-3 text-xs font-mono space-y-1 text-gray-800 dark:text-gray-300">
                    <p><span className="text-blue-700 dark:text-blue-400">x-webhook-signature</span>: sha256=&lt;HMAC of raw body with webhook secret&gt;</p>
                    <p><span className="text-blue-700 dark:text-blue-400">x-webhook-timestamp</span>: &lt;Unix seconds&gt; <span className="text-gray-600 dark:text-gray-400">(replay protection, 5 min window)</span></p>
                    <p><span className="text-blue-600 dark:text-blue-400">Content-Type</span>: application/json</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signature verification (Node.js)</p>
                  <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">{`const crypto = require('crypto');

function verifySignature(rawBody, secret, signatureHeader) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}`}</pre>
                </div>
              </div>
            </SectionCard>

            {/* Error codes */}
            <SectionCard>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Error codes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Code</th>
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-400">
                    {[
                      ['400', 'external/validation_error', 'Invalid request body'],
                      ['401', 'external/invalid_token', 'Missing or invalid API token'],
                      ['401', 'external/invalid_signature', 'Webhook signature mismatch'],
                      ['401', 'external/replay_or_expired', 'Timestamp outside 5 min window'],
                      ['403', 'external/tenant_mismatch', 'Token does not belong to tenant'],
                      ['403', 'external/https_required', 'HTTPS required in production'],
                      ['404', 'external/invalid_tenant', 'Tenant not found or disabled'],
                      ['429', 'external/rate_limited', 'Too many requests; retry later'],
                    ].map(([status, code, meaning]) => (
                      <tr key={code} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-4 font-mono text-xs">{status}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{code}</td>
                        <td className="py-2">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
        onConfirm={confirmDialog?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PermissionGuard>
  );
};

export default ExternalWebsitePage;
