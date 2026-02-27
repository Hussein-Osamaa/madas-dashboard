/**
 * Warehouse Dashboard: Total Stock Value, Available Units, daily/weekly metrics,
 * Daily Movement Chart, Top Moving SKUs, Worker Activity Log.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Truck,
  ArrowDownCircle,
  AlertTriangle,
  Percent,
  BarChart3,
  Award,
  UserCheck,
  ChevronDown,
  Building2,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  listFulfillmentClients,
  getDashboard,
  downloadInventoryExport,
  type FulfillmentClient,
  type DashboardData,
} from '../lib/api';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportStart, setExportStart] = useState(() => toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [exportEnd, setExportEnd] = useState(() => toISODate(new Date()));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await listFulfillmentClients();
      setClients(r.clients || []);
      if (r.clients?.length && !selectedClientId) setSelectedClientId(r.clients[0].id);
    } catch {
      setClients([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!selectedClientId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard(selectedClientId);
      setData(d);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard';
      const is404 = typeof msg === 'string' && (msg.includes('404') || msg.includes('Not Found'));
      setError(is404 ? 'Dashboard API not available. Start the backend from Front-end/XDIGIX-t/sys/backend (npm run dev) and ensure port 4000 is free.' : msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleExport = async () => {
    if (!selectedClientId) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadInventoryExport(selectedClientId, exportStart, exportEnd);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const chartMax = data?.dailyMovementChart?.length
    ? Math.max(
        1,
        ...data.dailyMovementChart.flatMap((r) => [
          r.STOCK_IN,
          r.PICKED,
          r.SHIPPED,
          r.RETURNED,
          r.DAMAGED,
          r.MANUAL_ADJUSTMENT,
        ])
      )
    : 1;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
          {selectedClientId && (
            <div className="flex flex-wrap items-center gap-2 border-l border-gray-200 dark:border-white/10 pl-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Export</span>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
              />
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Export Excel'}
              </button>
              {exportError && (
                <span className="text-xs text-red-600 dark:text-red-400">{exportError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {selectedClientId && data?.auditAlerts && data.auditAlerts.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              {data.auditAlerts.length} stock variance alert{data.auditAlerts.length !== 1 ? 's' : ''} (physical count vs system)
            </span>
          </div>
          <Link
            to="/stock-audit"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium text-sm"
          >
            View & acknowledge
          </Link>
        </div>
      )}

      {!selectedClientId && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Select a client to view the dashboard.
        </div>
      )}

      {selectedClientId && loading && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading dashboard…</div>
      )}

      {selectedClientId && !loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Total Stock Value
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {data.totalStockValue != null
                  ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(data.totalStockValue)
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.totalStockValue == null && 'Add cost/price to products to see value'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                Available Units
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.availableUnits}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <BarChart3 className="w-4 h-4" />
                Picked Today
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.unitsPickedToday}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Truck className="w-4 h-4" />
                Shipped Today
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.unitsShippedToday}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <ArrowDownCircle className="w-4 h-4" />
                Returns This Week
              </div>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{data.returnsThisWeek}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Damaged This Week
              </div>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">{data.damagedThisWeek}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Percent className="w-4 h-4" />
                Shrinkage %
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.shrinkagePercentage}%</p>
            </div>
          </div>

          {/* Daily Movement Chart */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Daily Movement (last 14 days)
            </h2>
            {data.dailyMovementChart.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No movement data in this period.</p>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                {data.dailyMovementChart.map((row) => {
                  const total =
                    row.STOCK_IN + row.PICKED + row.SHIPPED + row.RETURNED + row.DAMAGED + row.MANUAL_ADJUSTMENT;
                  const scale = chartMax > 0 ? total / chartMax : 0;
                  return (
                    <div key={row.date} className="flex items-center gap-2 min-w-[400px]">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">
                        {new Date(row.date + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 h-6 flex rounded overflow-hidden bg-gray-100 dark:bg-white/5">
                        {row.STOCK_IN > 0 && (
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${(row.STOCK_IN / total) * 100}%` }}
                            title="STOCK_IN"
                          />
                        )}
                        {row.PICKED > 0 && (
                          <div
                            className="bg-amber-500"
                            style={{ width: `${(row.PICKED / total) * 100}%` }}
                            title="PICKED"
                          />
                        )}
                        {row.SHIPPED > 0 && (
                          <div
                            className="bg-blue-500"
                            style={{ width: `${(row.SHIPPED / total) * 100}%` }}
                            title="SHIPPED"
                          />
                        )}
                        {row.RETURNED > 0 && (
                          <div
                            className="bg-cyan-500"
                            style={{ width: `${(row.RETURNED / total) * 100}%` }}
                            title="RETURNED"
                          />
                        )}
                        {row.DAMAGED > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(row.DAMAGED / total) * 100}%` }}
                            title="DAMAGED"
                          />
                        )}
                        {row.MANUAL_ADJUSTMENT !== 0 && (
                          <div
                            className="bg-gray-500"
                            style={{ width: `${(Math.abs(row.MANUAL_ADJUSTMENT) / total) * 100}%` }}
                            title="MANUAL_ADJUSTMENT"
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 shrink-0">{total}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> STOCK_IN</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> PICKED</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> SHIPPED</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-500" /> RETURNED</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> DAMAGED</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-500" /> ADJUST</span>
            </div>
          </div>

          {/* Top Moving SKUs */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 p-4 border-b border-gray-200 dark:border-white/10">
              <Award className="w-5 h-5 text-amber-500" />
              Top Moving SKUs
            </h2>
            {data.topMovingSkus.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No movement data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">SKU</th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">In</th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topMovingSkus.map((r) => (
                      <tr key={r.sku} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{r.sku}</td>
                        <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{r.totalMovement}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">{r.in}</td>
                        <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">{r.out}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Worker Activity Log */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 p-4 border-b border-gray-200 dark:border-white/10">
              <UserCheck className="w-5 h-5 text-amber-500" />
              Worker Activity Log
            </h2>
            {data.workerActivityLog.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No worker activity recorded yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-white/5">
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">SKU</th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Worker</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workerActivityLog.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                        <td className="py-2 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              entry.type === 'STOCK_IN' || entry.type === 'RETURNED'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : entry.type === 'PICKED' || entry.type === 'SHIPPED'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : entry.type === 'DAMAGED'
                                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-900 dark:text-white font-mono text-xs">{entry.sku}</td>
                        <td className="py-2 px-4 text-right">{entry.quantity}</td>
                        <td className="py-2 px-4 text-gray-600 dark:text-gray-300">{entry.worker_id}</td>
                        <td className="py-2 px-4 text-gray-500 dark:text-gray-400 text-xs">{entry.reference_id ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
