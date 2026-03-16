/**
 * Product Activity Log – Who created, updated, or deleted products. Admin only.
 */
import { useState, useEffect, useCallback, type JSX } from 'react';
import { FileText, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { listFulfillmentClients, listProductActivityLog, type FulfillmentClient, type ProductActivityLogEntry } from '../lib/api';

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StockChange = { from: number; to: number; diff: number };
type FieldChange = { from: unknown; to: unknown };

function formatDetails(action: string, details?: Record<string, unknown>): { label: string; value: string; type?: 'increase' | 'decrease' | 'neutral' }[] {
  if (!details) return [];
  const lines: { label: string; value: string; type?: 'increase' | 'decrease' | 'neutral' }[] = [];

  if (action === 'created') {
    if (details.sku) lines.push({ label: 'SKU', value: String(details.sku), type: 'neutral' });
    if (details.barcode) lines.push({ label: 'Barcode', value: String(details.barcode), type: 'neutral' });
    if (details.warehouse) lines.push({ label: 'Warehouse', value: String(details.warehouse), type: 'neutral' });
    const stock = details.initialStock as Record<string, number> | undefined;
    if (stock && Object.keys(stock).length > 0) {
      for (const [variant, qty] of Object.entries(stock)) {
        lines.push({ label: `Size ${variant}`, value: `${qty} units`, type: 'increase' });
      }
    } else {
      lines.push({ label: 'Initial stock', value: '0 units', type: 'neutral' });
    }
  }

  if (action === 'updated') {
    if (details.source === 'bulk-restock') lines.push({ label: 'Source', value: 'Bulk restock', type: 'neutral' });

    // New format: stockChanges with before/after/diff
    const stockChanges = details.stockChanges as Record<string, StockChange> | undefined;
    if (stockChanges) {
      for (const [variant, { from, to, diff }] of Object.entries(stockChanges)) {
        const sign = diff > 0 ? '+' : '';
        const changeType: 'increase' | 'decrease' = diff > 0 ? 'increase' : 'decrease';
        lines.push({
          label: `Size ${variant}`,
          value: `${from} → ${to} (${sign}${diff} units)`,
          type: changeType,
        });
      }
    }

    // New format: fieldChanges with from/to
    const fieldChanges = details.fieldChanges as Record<string, FieldChange> | undefined;
    if (fieldChanges) {
      for (const [field, { from, to }] of Object.entries(fieldChanges)) {
        lines.push({ label: field.charAt(0).toUpperCase() + field.slice(1), value: `"${from}" → "${to}"`, type: 'neutral' });
      }
    }

    // Fallback: old format with updatedFields
    if (!stockChanges && !fieldChanges) {
      const fields = details.updatedFields as Record<string, unknown> | undefined;
      if (fields) {
        if (fields.name != null) lines.push({ label: 'Name', value: String(fields.name), type: 'neutral' });
        if (fields.sku != null) lines.push({ label: 'SKU', value: String(fields.sku), type: 'neutral' });
        if (fields.barcode != null) lines.push({ label: 'Barcode', value: String(fields.barcode), type: 'neutral' });
        if (fields.warehouse != null) lines.push({ label: 'Warehouse', value: String(fields.warehouse), type: 'neutral' });
        const stock = fields.stock as Record<string, number> | undefined;
        if (stock && Object.keys(stock).length > 0) {
          lines.push({ label: 'Stock set', value: Object.entries(stock).map(([k, v]) => `${k}: ${v}`).join(', '), type: 'neutral' });
        }
      }
    }

    if (details.noChanges) lines.push({ label: 'Note', value: 'No values changed', type: 'neutral' });
    if (lines.filter(l => l.label !== 'Source').length === 0) {
      lines.push({ label: 'Note', value: 'No details recorded', type: 'neutral' });
    }
  }

  if (action === 'deleted') {
    if (details.deletedName) lines.push({ label: 'Deleted', value: String(details.deletedName), type: 'decrease' });
  }

  return lines;
}

function DetailsSummary({ action, details }: { action: string; details?: Record<string, unknown> }) {
  if (!details) return <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>;

  if (action === 'created') {
    const stock = details.initialStock as Record<string, number> | undefined;
    const total = stock ? Object.values(stock).reduce((a, b) => a + b, 0) : 0;
    const parts: string[] = [];
    if (details.sku) parts.push(`SKU: ${details.sku}`);
    if (details.warehouse) parts.push(`Warehouse: ${details.warehouse}`);
    parts.push(`${total} units`);
    return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">{parts.join(' · ')}</span>;
  }

  if (action === 'updated') {
    const stockChanges = details.stockChanges as Record<string, StockChange> | undefined;
    if (stockChanges) {
      const entries = Object.entries(stockChanges);
      const increased = entries.filter(([, c]) => c.diff > 0);
      const decreased = entries.filter(([, c]) => c.diff < 0);
      const parts: JSX.Element[] = [];
      if (increased.length) {
        const totalIncrease = increased.reduce((s, [, c]) => s + c.diff, 0);
        parts.push(
          <span key="inc" className="text-emerald-600 dark:text-emerald-400">
            +{totalIncrease} units ({increased.length} variant{increased.length > 1 ? 's' : ''})
          </span>
        );
      }
      if (decreased.length) {
        const totalDecrease = decreased.reduce((s, [, c]) => s + c.diff, 0);
        parts.push(
          <span key="dec" className="text-red-500 dark:text-red-400">
            {totalDecrease} units ({decreased.length} variant{decreased.length > 1 ? 's' : ''})
          </span>
        );
      }
      const prefix = details.source === 'bulk-restock' ? <span className="text-gray-500 dark:text-gray-400">Bulk · </span> : null;
      return <span className="text-xs flex items-center gap-1 flex-wrap">{prefix}{parts.reduce<JSX.Element[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} className="text-gray-400"> · </span>, el], [])}</span>;
    }

    const fieldChanges = details.fieldChanges as Record<string, FieldChange> | undefined;
    if (fieldChanges) {
      const fields = Object.keys(fieldChanges).map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
      return <span className="text-amber-600 dark:text-amber-400 text-xs">Changed: {fields}</span>;
    }

    // Fallback old format
    const fields = details.updatedFields as Record<string, unknown> | undefined;
    const source = details.source === 'bulk-restock' ? 'Bulk · ' : '';
    const changed = fields ? Object.keys(fields).filter(k => k !== 'source').join(', ') : '';
    if (changed) return <span className="text-gray-600 dark:text-gray-300 text-xs">{source}Changed: {changed}</span>;
    return <span className="text-gray-400 dark:text-gray-500 text-xs">No changes</span>;
  }

  if (action === 'deleted') {
    return <span className="text-red-500 dark:text-red-400 text-xs">Removed from catalog</span>;
  }

  return <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>;
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function LogRow({ entry, clients }: { entry: ProductActivityLogEntry; clients: FulfillmentClient[] }) {
  const [expanded, setExpanded] = useState(false);
  const detailLines = formatDetails(entry.action, entry.details);
  const hasDetails = detailLines.length > 0;
  const clientName = clients.find((c) => c.id === entry.clientId)?.name || entry.clientId;

  const actionColor =
    entry.action === 'created'
      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      : entry.action === 'updated'
        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
        : 'bg-red-500/20 text-red-600 dark:text-red-400';

  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 overflow-hidden">
      {/* Main card row */}
      <div
        className={`px-4 py-3.5 flex flex-col gap-2 ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.07]' : ''}`}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        {/* Top row: action + product name + date */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-medium ${actionColor}`}>
              {entry.action}
            </span>
            <span className="text-gray-900 dark:text-white font-medium text-sm leading-snug line-clamp-2">
              {entry.productName || entry.productId}
            </span>
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap shrink-0 pt-0.5">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Bottom row: client · by · details · chevron */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">
            <span className="text-gray-400 dark:text-gray-600 mr-1">Client</span>
            {clientName}
          </span>
          <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[180px] sm:max-w-xs">
            <span className="text-gray-400 dark:text-gray-600 mr-1">By</span>
            {entry.performedByEmail}
          </span>
          {hasDetails && (
            <>
              <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
              <div className="flex-1 min-w-0">
                <DetailsSummary action={entry.action} details={entry.details} />
              </div>
              <span className="ml-auto shrink-0 text-gray-400 dark:text-gray-500">
                {expanded
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.03]">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {detailLines.map((line) => (
              <div key={line.label} className="flex items-baseline gap-1.5 text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{line.label}:</span>
                <span className={`font-mono break-all ${
                  line.type === 'increase' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                  line.type === 'decrease' ? 'text-red-500 dark:text-red-400 font-semibold' :
                  'text-gray-800 dark:text-gray-200'
                }`}>{line.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductActivityLogPage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [entries, setEntries] = useState<ProductActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await listFulfillmentClients();
      setClients(r.clients || []);
    } catch {
      setClients([]);
    }
  }, []);

  const loadLog = useCallback(async () => {
    if (!selectedClientId) {
      setEntries([]);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listProductActivityLog({
        clientId: selectedClientId,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load activity log';
      const is404 = typeof msg === 'string' && (msg.includes('404') || msg.includes('Not Found'));
      setError(is404 ? 'Activity log API not available. Ensure the backend is deployed with the latest warehouse routes.' : msg);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, page]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { if (clients.length && !selectedClientId) setSelectedClientId(clients[0].id); }, [clients.length, selectedClientId]);
  useEffect(() => { setPage(1); }, [selectedClientId]);
  useEffect(() => { loadLog(); }, [loadLog]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clientName = clients.find((c) => c.id === selectedClientId)?.name || selectedClientId || '—';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
          Product Activity Log
        </h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 sm:flex-none w-full sm:w-auto px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.id}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : !selectedClientId ? (
        <div className="py-12 px-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-gray-500 dark:text-gray-400 text-sm">
          Select a client to view activity log.
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 px-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-gray-500 dark:text-gray-400 text-sm">
          No product activity recorded yet for this client.
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{total} entries · tap to expand</p>
          {/* Column headers */}
          <div className="flex items-center gap-2 px-4 pb-1 mb-1">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-16 shrink-0">Action</span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex-1">Product</span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">Date</span>
          </div>
          <div className="space-y-2">
            {entries.map((entry) => (
              <LogRow key={entry.id} entry={entry} clients={clients} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
