import { useState, useEffect, useCallback } from 'react';
import {
  getZammitConfig,
  saveZammitConfig,
  deleteZammitConfig,
  testZammitConnection,
  triggerZammitSync,
  toggleZammitEnabled,
  getZammitSyncLogs,
  resetZammitSync,
  dedupZammitOrders,
  type ZammitConfig,
  type ZammitSyncLogEntry,
} from '../../services/zammitService';

export default function ZammitSyncPage() {
  // ── State ───────────────────────────────────────────────────
  const [config, setConfig] = useState<ZammitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<ZammitSyncLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [interval, setInterval] = useState(15);

  // Feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // ── Load Config ─────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getZammitConfig();
      setConfig(data);
      if (data.configured) {
        setEmail(data.zammitEmail || '');
        setInterval(data.syncIntervalMinutes || 15);
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ── Handlers ────────────────────────────────────────────────
  const handleTest = async () => {
    if (!email || !password) {
      setTestResult({ success: false, error: 'Email and password are required' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testZammitConnection(email, password);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Email and password are required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveZammitConfig({
        zammitEmail: email,
        zammitPassword: password,
        syncIntervalMinutes: interval,
        enabled: config?.enabled ?? false,
      });
      setMessage({ type: 'success', text: 'Zammit integration saved successfully!' });
      setPassword('');
      await loadConfig();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!config?.configured) return;
    try {
      const result = await toggleZammitEnabled(!config.enabled);
      setConfig((prev) => prev ? { ...prev, enabled: result.enabled } : prev);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await triggerZammitSync();
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Sync complete! ${result.newOrdersCount} new order(s) imported in ${(result.durationMs / 1000).toFixed(1)}s.`,
        });
      } else {
        setMessage({ type: 'error', text: result.errors?.join(', ') || 'Sync failed' });
      }
      await loadConfig();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove Zammit integration? All credentials and sync history will be deleted.')) return;
    setDeleting(true);
    try {
      await deleteZammitConfig();
      setConfig({ configured: false });
      setEmail('');
      setPassword('');
      setInterval(15);
      setMessage({ type: 'success', text: 'Integration removed' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  const handleDedup = async () => {
    if (!confirm('Remove duplicate Zammit orders? This keeps the oldest copy of each order and deletes the rest.')) return;
    setMessage(null);
    try {
      const result = await dedupZammitOrders();
      setMessage({ type: 'success', text: result.message });
      await loadConfig();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleResetSync = async () => {
    if (!confirm('Reset sync state? This will clear the list of synced order IDs so the next sync re-checks all Zammit orders. Existing orders in your dashboard will NOT be deleted.')) return;
    setMessage(null);
    try {
      const result = await resetZammitSync();
      setMessage({ type: 'success', text: result.message || 'Sync state reset. Run "Sync Now" to re-import missing orders.' });
      await loadConfig();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleLoadLogs = async () => {
    setShowLogs((prev) => !prev);
    if (!showLogs) {
      setLogsLoading(true);
      try {
        const data = await getZammitSyncLogs();
        setLogs(data.logs || []);
      } catch {
        setLogs([]);
      } finally {
        setLogsLoading(false);
      }
    }
  };

  // ── Time formatting ─────────────────────────────────────────
  const timeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-icons text-2xl text-gray-300 animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Zammit Order Sync</h2>
        <p className="text-sm text-gray-500 mt-1">
          Automatically import orders from your Zammit store into XDIGIX.
        </p>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status Panel (when configured) */}
      {config?.configured && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Sync Status</h3>
            <button
              type="button"
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <StatusBadge status={config.lastSyncStatus} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Sync</p>
              <p className="text-sm font-medium text-gray-900">{timeAgo(config.lastSyncAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Orders Imported</p>
              <p className="text-sm font-medium text-gray-900">{config.lastSyncOrderCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Interval</p>
              <p className="text-sm font-medium text-gray-900">Every {config.syncIntervalMinutes ?? 15} min</p>
            </div>
          </div>

          {config.lastSyncError && (
            <div className="mb-4 p-2 bg-red-50 rounded-lg text-xs text-red-600">
              {config.lastSyncError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || config.lastSyncStatus === 'running'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-icons text-sm ${syncing ? 'animate-spin' : ''}`}>
                {syncing ? 'progress_activity' : 'sync'}
              </span>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              type="button"
              onClick={handleLoadLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <span className="material-icons text-sm">history</span>
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </button>

            <button
              type="button"
              onClick={handleDedup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <span className="material-icons text-sm">delete_sweep</span>
              Remove Duplicates
            </button>

            <button
              type="button"
              onClick={handleResetSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100"
            >
              <span className="material-icons text-sm">restart_alt</span>
              Reset Sync
            </button>
          </div>
        </div>
      )}

      {/* Sync Logs */}
      {showLogs && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync History</h3>
          {logsLoading ? (
            <div className="text-center py-4">
              <span className="material-icons text-gray-300 animate-spin">progress_activity</span>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No sync history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Time</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Orders</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Duration</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-2 text-gray-700">{log.orderCount}</td>
                      <td className="py-2 text-gray-500">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="py-2 text-red-500 text-xs max-w-xs truncate">
                        {log.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {config?.configured ? 'Update Credentials' : 'Connect Your Zammit Store'}
        </h3>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zammit Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zammit Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config?.configured ? '(unchanged — enter new to update)' : 'Enter password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sync Interval</label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-2 rounded-lg text-sm ${
                testResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {testResult.success ? 'Connection successful!' : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !email || !password}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-icons text-sm ${testing ? 'animate-spin' : ''}`}>
                {testing ? 'progress_activity' : 'wifi_tethering'}
              </span>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !email || !password}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-icons text-sm ${saving ? 'animate-spin' : ''}`}>
                {saving ? 'progress_activity' : 'save'}
              </span>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {config?.configured && (
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-xs text-gray-500 mb-3">
            Remove the Zammit integration. All credentials and sync history will be permanently deleted.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <span className="material-icons text-sm">delete_forever</span>
            {deleting ? 'Removing...' : 'Remove Integration'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Status Badge Component ────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    running: 'bg-yellow-100 text-yellow-700',
    idle: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status || 'idle'] || styles.idle
      }`}
    >
      {status || 'idle'}
    </span>
  );
}
