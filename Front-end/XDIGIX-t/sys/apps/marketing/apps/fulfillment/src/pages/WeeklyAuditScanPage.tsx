/**
 * Weekly Audit Scan – Warehouse barcode audit. Multi-worker: join by code, live sync via Socket.io.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardCheck, Play, Square, XCircle, Search, X, Users, LogIn } from 'lucide-react';
import {
  listFulfillmentClients,
  auditStart,
  auditJoin,
  auditScan,
  auditFinish,
  auditCancel,
  getAuditSession,
  auditRestore,
  type FulfillmentClient,
  type AuditAdjustment,
  type AuditSessionSummary,
} from '../lib/api';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import { connectAuditSocket } from '../lib/auditSocket';

const PENDING_SCANS_KEY = 'audit_pending_scans';
const AUDIT_SESSION_ID_KEY = 'audit_session_id';
const AUDIT_JOIN_CODE_KEY = 'audit_join_code';
/** Min ms between submit attempts (reduces double-fire from scanner). */
const DEBOUNCE_MS = 150;
const RECENT_MAX = 20;

function useBeep() {
  const play = useCallback((freq: number, durationMs: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  }, []);
  const playSuccess = useCallback(() => play(800, 80), [play]);
  const playError = useCallback(() => play(200, 200), [play]);
  return { playSuccess, playError };
}

interface RecentScan {
  name: string;
  sku: string;
  time: string;
}

export default function WeeklyAuditScanPage() {
  const { user } = useStaffAuth();
  const isAdmin = (user?.allowedApps || []).includes('ADMIN');
  const { playSuccess, playError } = useBeep();

  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [totalScans, setTotalScans] = useState(0);
  const [uniqueIds, setUniqueIds] = useState<Set<string>>(new Set());
  const [lastScanned, setLastScanned] = useState<{ name: string; sku: string } | null>(null);
  const [errors, setErrors] = useState(0);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [summary, setSummary] = useState<{
    adjustments: AuditAdjustment[];
    totalExpected: number;
    totalScanned: number;
    missingCount: number;
    adjustmentCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [workers, setWorkers] = useState<Array<{ userId: string; name: string; scanCount: number }>>([]);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanTimeRef = useRef(0);
  const scanInFlightRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const filteredClients = clients.filter(
    (c) =>
      !clientSearch.trim() ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const clearPersistedSession = useCallback(() => {
    localStorage.removeItem(AUDIT_SESSION_ID_KEY);
    localStorage.removeItem(AUDIT_JOIN_CODE_KEY);
  }, []);

  const persistSession = useCallback((sid: string, code: string) => {
    localStorage.setItem(AUDIT_SESSION_ID_KEY, sid);
    localStorage.setItem(AUDIT_JOIN_CODE_KEY, code);
  }, []);

  useEffect(() => {
    listFulfillmentClients().then((r) => setClients(r.clients || [])).catch(() => setClients([]));
  }, []);

  /** Restore active audit session after refresh or reopen (session only ends on Finish/Cancel). */
  useEffect(() => {
    if (!user || sessionId) return;
    const savedId = localStorage.getItem(AUDIT_SESSION_ID_KEY);
    if (!savedId) return;
    auditRestore(savedId)
      .then((data) => {
        if (data.status !== 'ACTIVE' && data.status !== 'in_progress') {
          clearPersistedSession();
          return;
        }
        setSessionId(savedId);
        setJoinCode(data.joinCode || '');
        setSessionStartTime(null);
        setWorkers(data.workers || []);
        setCreatedBy(data.createdBy || null);
        setTotalScans(data.totalScans ?? 0);
        if (data.lastScanned) {
          setLastScanned({
            name: data.lastScanned.productName || '—',
            sku: data.lastScanned.productSku || data.lastScanned.barcode,
          });
        } else {
          setLastScanned(null);
        }
        setRecentScans(
          (data.recentScans || []).map((r) => ({
            name: r.productName || '—',
            sku: r.productSku || r.barcode,
            time: r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : '—',
          }))
        );
        const productIds = (data.recentScans || []).map((r) => r.productId).filter(Boolean);
        setUniqueIds(productIds.length ? new Set(productIds) : new Set());
      })
      .catch(() => {
        clearPersistedSession();
      });
  }, [user?.userId, sessionId, clearPersistedSession]);

  useEffect(() => {
    if (sessionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => {
      const pending = localStorage.getItem(PENDING_SCANS_KEY);
      const arr = pending ? (JSON.parse(pending) as Array<{ sessionId: string; barcode: string }>) : [];
      const forThis = arr.filter((s) => s.sessionId === sessionId);
      setPendingCount(forThis.length);
    }, 1500);
    return () => clearInterval(t);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    getAuditSession(sessionId)
      .then((s) => {
        setWorkers(s.workers || []);
        setCreatedBy(s.createdBy || null);
        setTotalScans(s.totalScans);
        if (s.lastScanned) {
          setLastScanned({
            name: s.lastScanned.productName || '—',
            sku: s.lastScanned.productSku || s.lastScanned.barcode,
          });
        }
        setRecentScans(
          (s.recentScans || []).map((r) => ({
            name: r.productName || '—',
            sku: r.productSku || r.barcode,
            time: r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : '—',
          }))
        );
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const cleanup = connectAuditSocket(sessionId, {
      onConnect: () => setSocketConnected(true),
      onDisconnect: () => setSocketConnected(false),
      onScanUpdate: (data) => {
        setTotalScans(data.totalScans);
        setWorkers((prev) => {
          const byId = new Map(prev.map((w) => [w.userId, w]));
          Object.entries(data.workerScanCounts || {}).forEach(([userId, scanCount]) => {
            byId.set(userId, { userId, name: byId.get(userId)?.name ?? userId.slice(-6), scanCount });
          });
          return Array.from(byId.values()).sort((a, b) => b.scanCount - a.scanCount);
        });
        if (data.lastScanned) {
          setLastScanned({
            name: data.lastScanned.productName || '—',
            sku: data.lastScanned.productSku || data.lastScanned.barcode,
          });
          setRecentScans((prev) => [
            {
              name: data.lastScanned!.productName || '—',
              sku: data.lastScanned!.productSku || data.lastScanned!.barcode,
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, RECENT_MAX - 1),
          ]);
        }
        if (data.recentScans?.length) {
          setRecentScans(
            data.recentScans.slice(0, RECENT_MAX).map((r) => ({
              name: r.productName || '—',
              sku: r.productSku || r.barcode,
              time: r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : '—',
            }))
          );
        }
      },
      onAuditClosed: () => {
        setSessionClosed(true);
      },
    });
    return cleanup;
  }, [sessionId]);

  const flushPending = useCallback(async () => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_SCANS_KEY) : null;
    if (!raw) return;
    let queue: Array<{ sessionId: string; barcode: string }>;
    try {
      queue = JSON.parse(raw) as Array<{ sessionId: string; barcode: string }>;
      if (!Array.isArray(queue)) queue = [];
    } catch {
      return;
    }
    const current = sessionIdRef.current;
    if (!current) return;
    const toSend = queue.filter((s) => s.sessionId === current);
    if (toSend.length === 0) return;
    const remaining = queue.filter((s) => s.sessionId !== current);
    if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(remaining));
    for (const { barcode } of toSend) {
      try {
        await auditScan(current, barcode);
        setTotalScans((n) => n + 1);
        setUniqueIds((prev) => new Set(prev));
        setRecentScans((prev) => [{ name: '—', sku: barcode, time: new Date().toLocaleTimeString() }, ...prev.slice(0, RECENT_MAX - 1)]);
      } catch {
        remaining.push({ sessionId: current, barcode });
        if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(remaining));
        break;
      }
    }
    setPendingCount(remaining.filter((s) => s.sessionId === current).length);
  }, []);

  const submitScan = useCallback(
    async (barcode: string) => {
      const sid = sessionIdRef.current;
      if (!sid || !barcode.trim()) return;
      const now = Date.now();
      if (now - lastScanTimeRef.current < DEBOUNCE_MS) return;
      if (scanInFlightRef.current) return;
      lastScanTimeRef.current = now;
      scanInFlightRef.current = true;

      try {
        const res = await auditScan(sid, barcode.trim());
        setFlash('success');
        setTimeout(() => setFlash(null), 250);
        playSuccess();
        setTotalScans((n) => n + 1);
        const product = res.product;
        if (product) {
          setUniqueIds((prev) => new Set(prev).add(product.id));
          setLastScanned({ name: product.name || '—', sku: product.sku || product.id });
          setRecentScans((prev) => [
            { name: product.name || '—', sku: product.sku || product.id, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, RECENT_MAX - 1),
          ]);
        }
        await flushPending();
      } catch (e: unknown) {
        const err = e as { message?: string };
        if ((err as { status?: number }).status === 404 || err.message?.includes('Unknown')) {
          setFlash('error');
          setTimeout(() => setFlash(null), 400);
          playError();
          setErrors((n) => n + 1);
        } else {
          let pending: Array<{ sessionId: string; barcode: string }>;
          try {
            const rawPending = typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_SCANS_KEY) : null;
            pending = rawPending ? (JSON.parse(rawPending) as Array<{ sessionId: string; barcode: string }>) : [];
            if (!Array.isArray(pending)) pending = [];
          } catch {
            pending = [];
          }
          pending.push({ sessionId: sid, barcode: barcode.trim() });
          if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending));
          setPendingCount((n) => n + 1);
        }
      } finally {
        scanInFlightRef.current = false;
      }
    },
    [playSuccess, playError, flushPending]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = (e.target as HTMLInputElement).value.trim();
    if (v) {
      submitScan(v);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleStart = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    setSessionClosed(false);
    try {
      const { sessionId: id, joinCode: code } = await auditStart(selectedClientId);
      setSessionId(id);
      setJoinCode(code || '');
      persistSession(id, code || '');
      setSessionStartTime(new Date());
      setTotalScans(0);
      setUniqueIds(new Set());
      setLastScanned(null);
      setErrors(0);
      setRecentScans([]);
      setWorkers([]);
      setCreatedBy(user?.userId ?? null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      alert((err as Error).message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = String(joinCodeInput).trim().replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      alert('Enter a 6-digit join code');
      return;
    }
    setJoinLoading(true);
    setSessionClosed(false);
    try {
      const session = await auditJoin(code);
      setSessionId(session.sessionId);
      const joinCodeFromApi = session.joinCode || code;
      setJoinCode(joinCodeFromApi);
      persistSession(session.sessionId, joinCodeFromApi);
      setJoinCodeInput('');
      setSessionStartTime(new Date());
      getAuditSession(session.sessionId).then((s) => {
        setWorkers(s.workers || []);
        setCreatedBy(s.createdBy || null);
        setTotalScans(s.totalScans);
        if (s.lastScanned) setLastScanned({ name: '—', sku: s.lastScanned.barcode });
        setRecentScans(
          (s.recentScans || []).map((r) => ({
            name: '—',
            sku: r.barcode,
            time: r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : '—',
          }))
        );
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      alert((err as Error).message || 'Failed to join session');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    setFinishing(true);
    try {
      const data = await auditFinish(sessionId);
      const adjustments = Array.isArray(data?.adjustments) ? data.adjustments : [];
      const totalExpected = adjustments.reduce((s, a) => s + a.expected, 0);
      const totalScanned = adjustments.reduce((s, a) => s + a.actual, 0);
      const missingCount = adjustments.filter((a) => a.type === 'MISSING').length;
      const adjustmentCount = adjustments.filter((a) => a.type === 'ADJUSTMENT').length;
      setSummary({
        adjustments,
        totalExpected,
        totalScanned,
        missingCount,
        adjustmentCount,
      });
      setSessionId(null);
      setSessionStartTime(null);
      setSessionClosed(false);
      setJoinCode('');
      clearPersistedSession();
    } catch (err) {
      alert((err as Error).message || 'Failed to finish');
    } finally {
      setFinishing(false);
    }
  };

  const handleCancel = async () => {
    if (!sessionId || !confirm('Cancel this audit session? Scans will not be saved.')) return;
    try {
      await auditCancel(sessionId);
      setSessionId(null);
      setSessionStartTime(null);
      setSessionClosed(false);
      setJoinCode('');
      clearPersistedSession();
    } catch (err) {
      alert((err as Error).message || 'Failed to cancel');
    }
  };

  const closeSummary = () => setSummary(null);

  const handleLeaveSession = () => {
    setSessionId(null);
    setSessionStartTime(null);
    setSessionClosed(false);
    setJoinCode('');
    setWorkers([]);
    setCreatedBy(null);
    clearPersistedSession();
  };

  const isActive = !!sessionId && !sessionClosed;
  const isPlatformAdmin = user?.accountType === 'ADMIN';
  const isCreator = !!sessionId && (createdBy === user?.userId || isPlatformAdmin);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0b1a] p-3 sm:p-6 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <ClipboardCheck className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
          <span className="truncate">Weekly Audit Scan</span>
        </h1>

        {/* Join Existing Audit Session */}
        {!sessionId && (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <LogIn className="w-5 h-5 text-amber-500" />
              Join Existing Audit Session
            </h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">6-digit join code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-32 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-center text-lg tracking-widest"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={joinLoading || joinCodeInput.length !== 6}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {joinLoading ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        )}

        {/* Top: Client + Start + Status (admin starts) */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-2 w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              size={5}
            >
              <option value="">Select client</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {isAdmin && (
              <button
                onClick={handleStart}
                disabled={loading || isActive || !selectedClientId}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-5 h-5" />
                Start Audit Session
              </button>
            )}
            <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status: </span>
              <span className={sessionClosed ? 'text-amber-600 dark:text-amber-400 font-medium' : isActive ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                {sessionClosed ? 'Completed' : isActive ? 'Active' : 'Not Active'}
              </span>
            </div>
            {sessionId && joinCode && (
              <div className="px-4 py-2 rounded-lg bg-amber-500/20">
                <span className="text-sm text-amber-800 dark:text-amber-200">Join code: </span>
                <span className="font-mono font-bold text-lg tracking-widest text-amber-900 dark:text-amber-100">{joinCode}</span>
              </div>
            )}
            {sessionStartTime && sessionId && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Started: {sessionStartTime.toLocaleTimeString()}
              </div>
            )}
            {sessionId && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {socketConnected ? '● Live' : '○ Connecting…'}
              </div>
            )}
          </div>
        </div>

        {sessionClosed && sessionId && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">Audit Completed.</span>
            <button
              type="button"
              onClick={handleLeaveSession}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              Start new / Join another
            </button>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 text-sm">
            Offline: {pendingCount} scan(s) pending. Will retry when connection is back.
          </div>
        )}

        {/* Workers in this Audit (live leaderboard) */}
        {sessionId && workers.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden mb-6">
            <h2 className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              Workers in this Audit
            </h2>
            <ul className="divide-y divide-gray-200 dark:divide-white/10">
              {workers.map((w, i) => (
                <li key={w.userId} className="px-4 py-2 flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-gray-400 w-6">{i + 1}.</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate flex-1">{w.name}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{w.scanCount} scans</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Scans</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalScans}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Unique Products</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{uniqueIds.size}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Last Scanned</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{lastScanned?.name ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{lastScanned?.sku ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{errors}</p>
          </div>
        </div>

        {/* Big scan input */}
        <div
          className={`rounded-2xl border-2 p-6 mb-6 transition-colors ${
            flash === 'success'
              ? 'bg-emerald-500/20 border-emerald-500'
              : flash === 'error'
              ? 'bg-red-500/20 border-red-500'
              : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
          }`}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scan barcode (auto-submit on Enter)</label>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoFocus
            placeholder={sessionClosed ? 'Audit completed' : isActive ? 'Scan or type barcode...' : 'Start or join a session'}
            disabled={!isActive}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => inputRef.current?.focus(), 150)}
            className="w-full text-base sm:text-xl px-4 py-3 sm:py-4 min-h-[48px] rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Recent scans */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden mb-6">
          <h2 className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-white/10">
            Recent scans (last {RECENT_MAX})
          </h2>
          <ul className="divide-y divide-gray-200 dark:divide-white/10 max-h-64 overflow-y-auto">
            {recentScans.length === 0 ? (
              <li className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No scans yet</li>
            ) : (
              recentScans.map((s, i) => (
                <li key={i} className="px-4 py-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.sku}</p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{s.time}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          {isCreator && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!sessionId || sessionClosed || finishing}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              <Square className="w-5 h-5 shrink-0" />
              {finishing ? 'Finishing…' : 'Finish Audit Session'}
            </button>
          )}
          {isPlatformAdmin && (
            <button
              onClick={handleCancel}
              disabled={!sessionId || sessionClosed}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 text-red-700 dark:text-red-400 rounded-xl font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              Cancel Session
            </button>
          )}
        </div>
      </div>

      {/* Summary modal */}
      {summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audit Summary</h2>
              <button onClick={closeSummary} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expected stock</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalExpected}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Scanned stock</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalScanned}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Missing items</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.missingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Adjustments</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.adjustmentCount}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reconciliation was applied on the backend.</p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-white/10">
              <button onClick={closeSummary} className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
