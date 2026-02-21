import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { collection, db, onSnapshot, orderBy, query } from '../../lib/firebase';
import { useBusiness } from '../../contexts/BusinessContext';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useScanLogs } from '../../hooks/useScanLogs';
import { ScanLog, ScanLogType } from '../../services/scanLogsService';
import { useCurrency } from '../../hooks/useCurrency';

function toValidDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'number') { const d = new Date(v < 1e12 ? v * 1000 : v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    try { return (v as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      const d = new Date(sec * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function formatTimestamp(value: unknown, fmt: string, fallback = 'N/A'): string {
  try {
    const d = toValidDate(value);
    return d ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

type TypeFilter = '' | ScanLogType;
type PageSize = 25 | 50 | 100 | 200 | 'all';

const ScanLogPage = () => {
  const { businessId, permissions, loading } = useBusiness();
  const { formatCurrency } = useCurrency();
  const { scanLogs, isLoading, refetch, deleteLogs, clearLogs } = useScanLogs(businessId);
  const [localLogs, setLocalLogs] = useState<ScanLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [realtime, setRealtime] = useState(true); // Enable real-time by default
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('order_update') || 
                  hasPermission('order_edit') || 
                  permissions?.orders?.includes('update') ||
                  permissions?.orders?.includes('edit') || 
                  permissions?.inventory?.includes('edit');

  useEffect(() => {
    setLocalLogs(scanLogs);
  }, [scanLogs]);

  useEffect(() => {
    if (!businessId || !realtime) {
      return () => {};
    }

    const logsRef = collection(db, 'businesses', businessId, 'scan_log');
    // Remove limit - fetch all logs and handle pagination in frontend
    const logsQuery = query(logsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const payload: ScanLog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const normalizedTimestamp = toValidDate(data.timestamp) ?? undefined;
          return {
            id: docSnap.id,
            barcode: String(data.barcode || ''),
            productId: String(data.productId || ''),
            productName: data.productName ? String(data.productName) : undefined,
            size: data.size ? String(data.size) : null,
            type: (data.type as ScanLogType) || 'order',
            previousStock: typeof data.previousStock === 'number' ? data.previousStock : undefined,
            newStock: typeof data.newStock === 'number' ? data.newStock : undefined,
            price: typeof data.price === 'number' ? data.price : undefined,
            user: data.user ? String(data.user) : null,
            userId: data.userId ? String(data.userId) : null,
            timestamp: normalizedTimestamp
          };
        });
        setLocalLogs(payload);
        setSubscriptionError(null);
      },
      (error) => {
        console.error('[ScanLogPage] Real-time subscription error', error);
        setSubscriptionError('Real-time updates unavailable. Falling back to manual refresh.');
        setRealtime(false);
      }
    );

    return () => unsubscribe();
  }, [businessId, realtime]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : undefined;

    return localLogs.filter((log) => {
      const matchesType = typeFilter ? log.type === typeFilter : true;
      const matchesUser = userFilter ? log.user?.toLowerCase().includes(userFilter.toLowerCase()) : true;
      const matchesSearch = term
        ? [
            log.productName,
            log.barcode,
            log.size,
            log.user,
            log.type,
            log.productId
          ].some((value) => value && value.toLowerCase().includes(term))
        : true;

      const timestamp = log.timestamp;
      const matchesStart = start ? (timestamp ? timestamp >= start : false) : true;
      const matchesEnd = end ? (timestamp ? timestamp <= end : false) : true;

      return matchesType && matchesUser && matchesSearch && matchesStart && matchesEnd;
    });
  }, [localLogs, searchTerm, typeFilter, userFilter, startDate, endDate]);

  // Pagination logic
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredLogs.length / pageSize);
  }, [filteredLogs.length, pageSize]);

  const paginatedLogs = useMemo(() => {
    if (pageSize === 'all') return filteredLogs;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, userFilter, startDate, endDate, pageSize]);

  useEffect(() => {
    if (!realtime) {
      setLocalLogs(scanLogs);
    }
  }, [realtime, scanLogs]);

  useEffect(() => {
    setSelected((prev) => {
      const validIds = new Set(paginatedLogs.map((log) => log.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [paginatedLogs]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const orders = filteredLogs.filter((log) => log.type === 'order').length;
    const returns = filteredLogs.filter((log) => log.type === 'return').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayActivity = filteredLogs.filter((log) => {
      const timestamp = log.timestamp;
      if (!timestamp) return false;
      return timestamp >= today;
    }).length;

    return { total, orders, returns, todayActivity };
  }, [filteredLogs]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    // Select only logs on the current page
    setSelected(new Set(paginatedLogs.map((log) => log.id)));
  };

  const handleDeleteSelected = async () => {
    if (!canEdit) return;
    const ids = Array.from(selected);
    if (ids.length === 0) {
      window.alert('Select at least one log entry to delete.');
      return;
    }
    const confirmed = window.confirm(`Delete ${ids.length} selected log entries?`);
    if (!confirmed) return;
    await deleteLogs(ids);
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete all scan logs? This action cannot be undone.');
    if (!confirmed) return;
    await clearLogs();
    setSelected(new Set());
  };

  const exportCsv = () => {
    if (filteredLogs.length === 0) {
      window.alert('No results to export.');
      return;
    }

    const rows = filteredLogs.map((log) => {
      const timestamp = formatTimestamp(log.timestamp, 'yyyy-MM-dd HH:mm:ss', '');
      const stockChange =
        log.previousStock !== undefined && log.newStock !== undefined
          ? log.newStock - log.previousStock
          : '';
      return [
        log.type,
        log.productName ?? '',
        log.size ?? '',
        log.barcode ?? '',
        stockChange,
        log.previousStock ?? '',
        log.newStock ?? '',
        log.price ?? '',
        log.user ?? '',
        timestamp
      ].join(',');
    });

    const header =
      'Type,Product,Size,Barcode,Change,Previous Stock,New Stock,Price,User,Timestamp';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Scan Log</h1>
          <p className="text-sm text-madas-text/70">
            Review barcode scans from orders and returns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm transition-colors',
              realtime ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
            )}
            onClick={() => {
              if (realtime) {
                setRealtime(false);
              } else {
                setRealtime(true);
              }
            }}
          >
            <span className="material-icons text-base">{realtime ? 'visibility_off' : 'visibility'}</span>
            {realtime ? 'Disable real-time' : 'Enable real-time'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
            onClick={() => refetch()}
          >
            <span className="material-icons text-base">refresh</span>
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
            onClick={exportCsv}
          >
            <span className="material-icons text-base">download</span>
            Export CSV
          </button>
        </div>
      </header>

      {subscriptionError ? <p className="text-sm text-red-600">{subscriptionError}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total scans</p>
            <span className="material-icons rounded-lg bg-blue-100 p-2 text-lg text-blue-600">
              dataset
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.total}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Orders</p>
            <span className="material-icons rounded-lg bg-green-100 p-2 text-lg text-green-600">
              trending_down
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.orders}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Returns</p>
            <span className="material-icons rounded-lg bg-orange-100 p-2 text-lg text-orange-600">
              trending_up
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.returns}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Today&apos;s activity</p>
            <span className="material-icons rounded-lg bg-purple-100 p-2 text-lg text-purple-600">
              bolt
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.todayActivity}</p>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search barcode, product, or user"
              className="w-52 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All types</option>
            <option value="order">Order</option>
            <option value="return">Return</option>
            <option value="status_update">Status Update</option>
          </select>
          <input
            type="text"
            value={userFilter}
            onChange={(event) => setUserFilter(event.target.value)}
            placeholder="Filter by user"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setUserFilter('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-madas-text/70">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
            checked={selected.size > 0 && selected.size === paginatedLogs.length}
            ref={(input) => {
              if (input) {
                input.indeterminate = selected.size > 0 && selected.size < paginatedLogs.length;
              }
            }}
            onChange={(event) => handleSelectAll(event.target.checked)}
          />
          <span>{selected.size} selected</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-madas-text/60">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value) as PageSize)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="all">All</option>
            </select>
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-60"
            onClick={handleDeleteSelected}
            disabled={!canEdit || selected.size === 0}
          >
            Delete selected
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            onClick={handleClearAll}
            disabled={!canEdit || filteredLogs.length === 0}
          >
            Clear all
          </button>
          <p className="text-xs text-madas-text/50">
            {pageSize === 'all' 
              ? `${filteredLogs.length} results`
              : `Showing ${Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)}-${Math.min(currentPage * pageSize, filteredLogs.length)} of ${filteredLogs.length}`
            }
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading scan logs…</p>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">qr_code_2</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No scan activity yet</h3>
            <p className="text-sm text-madas-text/60">
              Scan products from the orders page to see results here.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
                      checked={selected.size > 0 && selected.size === paginatedLogs.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selected.size > 0 && selected.size < paginatedLogs.length;
                        }
                      }}
                      onChange={(event) => handleSelectAll(event.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Stock change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLogs.map((log) => {
                  const timestamp = formatTimestamp(log.timestamp, 'MMM d, yyyy HH:mm');
                  const change =
                    log.previousStock !== undefined && log.newStock !== undefined
                      ? log.newStock - log.previousStock
                      : undefined;
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-base/60">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
                          checked={selected.has(log.id)}
                          onChange={(event) => toggleSelection(log.id, event.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize',
                            log.type === 'order' ? 'bg-green-100 text-green-600' : 
                            log.type === 'return' ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          )}
                        >
                          <span className="material-icons text-xs">
                            {log.type === 'order' ? 'trending_down' : log.type === 'return' ? 'trending_up' : 'info'}
                          </span>
                          {log.type === 'status_update' ? 'Status' : log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/80">
                        {log.productName ?? 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/60">
                        {log.size ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-madas-text/70">
                        {log.barcode ?? '—'}
                      </td>
                      <td
                        className={clsx(
                          'px-6 py-4 whitespace-nowrap text-sm',
                          change !== undefined
                            ? change > 0
                              ? 'text-green-600'
                              : 'text-orange-600'
                            : 'text-madas-text/70'
                        )}
                      >
                        {change !== undefined && log.previousStock !== undefined && log.newStock !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="material-icons text-base">
                              {change > 0 ? 'arrow_upward' : change < 0 ? 'arrow_downward' : 'arrow_forward'}
                            </span>
                            <span>
                              {change > 0 ? '+' : ''}
                              {change} ({log.previousStock} → {log.newStock})
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                        {log.price !== undefined ? formatCurrency(log.price) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/60">
                        {log.user ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">{timestamp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <div className="text-sm text-madas-text/60">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-icons text-sm">first_page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-icons text-sm">chevron_left</span>
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={clsx(
                          'rounded-lg px-3 py-1.5 text-xs transition-colors',
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'border border-gray-200 text-madas-text hover:bg-base'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-icons text-sm">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-icons text-sm">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanLogPage;

