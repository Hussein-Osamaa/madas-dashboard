/**
 * Audit comparison: record physical count, compare to system stock, view variance alerts.
 */
import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Building2, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import {
  listFulfillmentClients,
  recordAuditCount,
  listAuditComparisons,
  listAuditAlerts,
  acknowledgeAuditAlert,
  getAuditThreshold,
  type FulfillmentClient,
} from '../lib/api';

export default function AuditComparisonPage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sku, setSku] = useState('');
  const [physicalCount, setPhysicalCount] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    alertTriggered: boolean;
  } | null>(null);

  const [comparisons, setComparisons] = useState<Array<{
    id: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    shiftName?: string;
    thresholdUsed: number;
    alertTriggered: boolean;
    createdAt: string;
  }>>([]);
  const [comparisonsTotal, setComparisonsTotal] = useState(0);
  const [comparisonsLoading, setComparisonsLoading] = useState(false);

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    threshold: number;
    shiftName?: string;
    createdAt: string;
  }>>([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await listFulfillmentClients();
      setClients(r.clients || []);
      if (r.clients?.length && !selectedClientId) setSelectedClientId(r.clients[0].id);
    } catch {
      setClients([]);
    }
  }, []);

  const loadThreshold = useCallback(async (clientId: string) => {
    try {
      const r = await getAuditThreshold(clientId);
      setThreshold(r.threshold);
    } catch {
      setThreshold(null);
    }
  }, []);

  const loadComparisons = useCallback(async () => {
    if (!selectedClientId) return;
    setComparisonsLoading(true);
    try {
      const r = await listAuditComparisons({ clientId: selectedClientId, limit: 20 });
      setComparisons(r.items);
      setComparisonsTotal(r.total);
    } catch {
      setComparisons([]);
      setComparisonsTotal(0);
    } finally {
      setComparisonsLoading(false);
    }
  }, [selectedClientId]);

  const loadAlerts = useCallback(async () => {
    if (!selectedClientId) return;
    setAlertsLoading(true);
    try {
      const r = await listAuditAlerts({ clientId: selectedClientId, acknowledged: false, limit: 50 });
      setAlerts(r.items);
      setAlertsTotal(r.total);
    } catch {
      setAlerts([]);
      setAlertsTotal(0);
    } finally {
      setAlertsLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (selectedClientId) {
      loadThreshold(selectedClientId);
      loadComparisons();
      loadAlerts();
    } else {
      setComparisons([]);
      setAlerts([]);
      setThreshold(null);
    }
  }, [selectedClientId, loadThreshold, loadComparisons, loadAlerts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !sku.trim()) return;
    const count = parseInt(physicalCount, 10);
    if (Number.isNaN(count) || count < 0) {
      setSubmitError('Physical count must be a non-negative number');
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    setLastResult(null);
    try {
      const result = await recordAuditCount({
        clientId: selectedClientId,
        sku: sku.trim(),
        physicalCount: count,
        shiftId: shiftId.trim() || undefined,
        shiftName: shiftName.trim() || undefined,
        note: note.trim() || undefined,
      });
      setLastResult({
        sku: result.sku,
        physicalCount: result.physicalCount,
        systemStock: result.systemStock,
        difference: result.difference,
        alertTriggered: result.alertTriggered,
      });
      setPhysicalCount('');
      loadComparisons();
      loadAlerts();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to record count');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await acknowledgeAuditAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setAlertsTotal((t) => Math.max(0, t - 1));
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        Stock Audit (Physical vs System)
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
        <div className="relative">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none pr-8"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" aria-hidden />
        </div>
        {threshold != null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Variance alert threshold: <strong className="text-gray-700 dark:text-gray-300">{threshold}</strong> units
          </span>
        )}
      </div>

      {!selectedClientId && (
        <p className="text-gray-500 dark:text-gray-400">Select a client to record physical counts and view comparisons.</p>
      )}

      {selectedClientId && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Record physical count</h2>
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">SKU *</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-001"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm min-w-[140px]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">Physical count *</label>
                <input
                  type="number"
                  min={0}
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(e.target.value)}
                  placeholder="0"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm w-24"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">Shift name</label>
                <input
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="e.g. Morning"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm min-w-[120px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">Shift ID</label>
                <input
                  type="text"
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  placeholder="Optional"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm min-w-[100px]"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-sm text-gray-600 dark:text-gray-400">Note</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitLoading || !sku.trim()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium text-sm disabled:opacity-50 min-h-[40px]"
              >
                {submitLoading ? 'Recording…' : 'Record count'}
              </button>
            </form>
            {submitError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>
            )}
            {lastResult && (
              <div className={`mt-4 p-4 rounded-lg border ${lastResult.alertTriggered ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                <p className="font-medium text-gray-900 dark:text-white">
                  {lastResult.sku}: physical {lastResult.physicalCount}, system {lastResult.systemStock}, difference {lastResult.difference >= 0 ? '+' : ''}{lastResult.difference}
                  {lastResult.alertTriggered && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4" /> Alert triggered
                    </span>
                  )}
                </p>
              </div>
            )}
          </section>

          {alertsTotal > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Active variance alerts ({alertsTotal})
              </h2>
              {alertsLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading alerts…</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                    >
                      <span className="text-gray-900 dark:text-white">
                        <strong>{a.sku}</strong>: physical {a.physicalCount}, system {a.systemStock}, difference {a.difference >= 0 ? '+' : ''}{a.difference} (threshold {a.threshold})
                        {a.shiftName && <span className="text-gray-500 dark:text-gray-400 ml-1">· {a.shiftName}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(a.id)}
                        disabled={acknowledgingId === a.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] text-sm font-medium disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {acknowledgingId === a.id ? '…' : 'Acknowledge'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent comparisons</h2>
            {comparisonsLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            ) : comparisons.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No comparisons yet. Record a physical count above.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left p-3 text-gray-600 dark:text-gray-400 font-medium">SKU</th>
                      <th className="text-right p-3 text-gray-600 dark:text-gray-400 font-medium">Physical</th>
                      <th className="text-right p-3 text-gray-600 dark:text-gray-400 font-medium">System</th>
                      <th className="text-right p-3 text-gray-600 dark:text-gray-400 font-medium">Difference</th>
                      <th className="text-left p-3 text-gray-600 dark:text-gray-400 font-medium">Shift</th>
                      <th className="text-left p-3 text-gray-600 dark:text-gray-400 font-medium">Date</th>
                      <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {comparisons.map((c) => (
                      <tr key={c.id} className="text-gray-900 dark:text-white">
                        <td className="p-3 font-medium">{c.sku}</td>
                        <td className="p-3 text-right">{c.physicalCount}</td>
                        <td className="p-3 text-right">{c.systemStock}</td>
                        <td className={`p-3 text-right ${c.difference !== 0 ? (c.difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : ''}`}>
                          {c.difference >= 0 ? '+' : ''}{c.difference}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">{c.shiftName || '—'}</td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          {c.alertTriggered ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                              <AlertTriangle className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {comparisonsTotal > comparisons.length && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Showing latest {comparisons.length} of {comparisonsTotal}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
