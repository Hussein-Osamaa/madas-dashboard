import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  QrCodeIcon,
  ReceiptRefundIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { trackPageLoad } from '../../lib/performance';
import { collection, db, doc, getDocs, serverTimestamp, writeBatch } from '../../lib/firebase';

type StepKey =
  | 'products'
  | 'orders'
  | 'customers'
  | 'staff'
  | 'settings'
  | 'expenses'
  | 'deposits'
  | 'scanLogs';

type StepStatus = 'pending' | 'in-progress' | 'completed';

type StepState = {
  status: StepStatus;
  count: number;
  migrated?: number;
};

type StepDefinition = {
  key: StepKey;
  label: string;
  description: string;
  icon: JSX.Element;
  sourceCollection: string;
  targetCollection: string;
};

type LogEntry = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
};

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    key: 'products',
    label: 'Products',
    description: 'Transfer all products and variants to the tenant space',
    icon: <CubeIcon className="h-5 w-5" />,
    sourceCollection: 'products',
    targetCollection: 'products'
  },
  {
    key: 'orders',
    label: 'Orders',
    description: 'Move historical orders into tenant orders',
    icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
    sourceCollection: 'orders',
    targetCollection: 'orders'
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Migrate customer records',
    icon: <UsersIcon className="h-5 w-5" />,
    sourceCollection: 'customers',
    targetCollection: 'customers'
  },
  {
    key: 'staff',
    label: 'Staff',
    description: 'Move staff accounts with their metadata',
    icon: <UsersIcon className="h-5 w-5" />,
    sourceCollection: 'staff',
    targetCollection: 'staff'
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Copy business settings to tenant scope',
    icon: <Cog6ToothIcon className="h-5 w-5" />,
    sourceCollection: 'settings',
    targetCollection: 'settings'
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Move expense ledger entries',
    icon: <ReceiptRefundIcon className="h-5 w-5" />,
    sourceCollection: 'expenses',
    targetCollection: 'expenses'
  },
  {
    key: 'deposits',
    label: 'Deposits',
    description: 'Transfer deposit records',
    icon: <BanknotesIcon className="h-5 w-5" />,
    sourceCollection: 'deposits',
    targetCollection: 'deposits'
  },
  {
    key: 'scanLogs',
    label: 'Scan Logs',
    description: 'Move scan log history',
    icon: <QrCodeIcon className="h-5 w-5" />,
    sourceCollection: 'scan_log',
    targetCollection: 'scan_log'
  }
];

const INITIAL_STEP_STATE = STEP_DEFINITIONS.reduce<Record<StepKey, StepState>>((acc, step) => {
  acc[step.key] = { status: 'pending', count: 0 };
  return acc;
}, {} as Record<StepKey, StepState>);

const BATCH_LIMIT = 400;

const DataMigrationPage = () => {
  const scope = useFinanceScope();
  const [stepsState, setStepsState] = useState<Record<StepKey, StepState>>(INITIAL_STEP_STATE);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init',
      type: 'info',
      message: 'Migration tool ready. Load counts to begin.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    trackPageLoad('finance_data_migration');
  }, []);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, []);

  const setStepStatus = useCallback((key: StepKey, status: StepStatus, migrated?: number) => {
    setStepsState((prev) => ({
      ...prev,
      [key]: { ...prev[key], status, migrated }
    }));
  }, []);

  const loadCounts = useCallback(async () => {
    if (!scope.businessId) {
      addLog('warning', 'No business selected. Please re-login or choose a business.');
      return;
    }

    try {
      setLoadingCounts(true);
      const snapshots = await Promise.all(
        STEP_DEFINITIONS.map(async (step) => {
          const snap = await getDocs(collection(db, step.sourceCollection));
          return { key: step.key, count: snap.size };
        })
      );

      setStepsState((prev) => {
        const next = { ...prev };
        snapshots.forEach(({ key, count }) => {
          next[key] = { ...next[key], count };
        });
        return next;
      });

      const summary = snapshots
        .map(({ key, count }) => `${STEP_DEFINITIONS.find((s) => s.key === key)?.label}: ${count}`)
        .join(' • ');
      addLog('info', `Loaded source data counts — ${summary}`);
    } catch (error) {
      console.error('[Migration] Failed to load counts', error);
      addLog('error', 'Failed to load counts. Check network and try again.');
    } finally {
      setLoadingCounts(false);
    }
  }, [addLog, scope.businessId]);

  useEffect(() => {
    if (scope.businessId) {
      void loadCounts();
    }
  }, [scope.businessId, loadCounts]);

  const runBatchedCopy = useCallback(
    async (
      step: StepDefinition,
      transform?: (data: Record<string, unknown>, docId: string) => Record<string, unknown>,
      metaTracker?: (data: Record<string, unknown>) => void
    ) => {
      if (!scope.businessId) {
        throw new Error('Missing business context');
      }

      const snapshot = await getDocs(collection(db, step.sourceCollection));
      if (snapshot.empty) {
        return { migrated: 0 };
      }

      let batch = writeBatch(db);
      let opCount = 0;
      let migrated = 0;

      for (const docSnap of snapshot.docs) {
        const rawData = docSnap.data() as Record<string, unknown>;
        metaTracker?.(rawData);

        const payload = {
          ...rawData,
          ...(transform ? transform(rawData, docSnap.id) : {}),
          migratedAt: serverTimestamp(),
          originalId: docSnap.id
        };

        const targetRef = doc(collection(db, 'businesses', scope.businessId, step.targetCollection));
        batch.set(targetRef, payload);
        migrated += 1;
        opCount += 1;

        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      return { migrated };
    },
    [scope.businessId]
  );

  const migrateStep = useCallback(
    async (step: StepDefinition) => {
      setStepStatus(step.key, 'in-progress');
      addLog('info', `Starting ${step.label.toLowerCase()} migration...`);

      try {
        if (step.key === 'products') {
          let variants = 0;
          const result = await runBatchedCopy(
            step,
            (data) => ({
              ...data,
              sizeVariants: (data.sizeVariants as Record<string, unknown> | undefined) ??
                (data.sizes as Record<string, unknown> | undefined) ??
                {},
              sizes: (data.sizes as Record<string, unknown> | undefined) ??
                (data.sizeVariants as Record<string, unknown> | undefined) ??
                {}
            }),
            (data) => {
              const sizeData = (data.sizeVariants as Record<string, unknown> | undefined) ??
                (data.sizes as Record<string, unknown> | undefined) ??
                {};
              variants += Object.keys(sizeData).length;
            }
          );

          setStepStatus(step.key, 'completed', result.migrated);
          addLog(
            'success',
            `Migrated ${result.migrated} products${variants ? ` with ${variants} variants` : ''}.`
          );
          return;
        }

        const result = await runBatchedCopy(step);
        setStepStatus(step.key, 'completed', result.migrated);

        if (result.migrated === 0) {
          addLog('warning', `No ${step.label.toLowerCase()} found to migrate.`);
        } else {
          addLog('success', `Migrated ${result.migrated} ${step.label.toLowerCase()}.`);
        }
      } catch (error) {
        console.error(`[Migration] ${step.label} failed`, error);
        setStepStatus(step.key, 'pending');
        addLog('error', `Failed to migrate ${step.label.toLowerCase()}. Check console for details.`);
        throw error;
      }
    },
    [addLog, runBatchedCopy, setStepStatus]
  );

  const handleStartAll = useCallback(async () => {
    if (!scope.businessId) {
      addLog('warning', 'No business selected. Please try again after selecting a business.');
      return;
    }

    setIsRunning(true);
    addLog('info', 'Starting full migration workflow...');
    try {
      for (const step of STEP_DEFINITIONS) {
        // Run sequentially to avoid overloading Firestore
        await migrateStep(step);
      }
      addLog('success', 'All steps completed.');
    } catch {
      addLog('warning', 'Migration halted due to an error.');
    } finally {
      setIsRunning(false);
    }
  }, [addLog, migrateStep, scope.businessId]);

  const handleReset = useCallback(() => {
    setStepsState(INITIAL_STEP_STATE);
    addLog('info', 'Progress reset. Counts remain unchanged.');
  }, [addLog]);

  const handleExportLogs = useCallback(() => {
    const content = logs.map((entry) => `[${entry.timestamp}] (${entry.type.toUpperCase()}) ${entry.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `migration-log-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const completedSteps = useMemo(
    () => Object.values(stepsState).filter((step) => step.status === 'completed').length,
    [stepsState]
  );
  const overallProgress = useMemo(
    () => Math.round((completedSteps / STEP_DEFINITIONS.length) * 100),
    [completedSteps]
  );
  const totalSourceItems = useMemo(
    () => STEP_DEFINITIONS.reduce((acc, step) => acc + (stepsState[step.key]?.count ?? 0), 0),
    [stepsState]
  );

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance migration tools.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Finance Utilities</p>
          <h2 className="text-3xl font-bold text-primary">Data Migration</h2>
          <p className="text-sm text-madas-text/70">
            Move legacy finance data into the tenant-scoped collections for {scope.businessName ?? 'your business'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStartAll}
            disabled={isRunning || !scope.businessId}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayIcon className="h-4 w-4" />
            Start Migration
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset Progress
          </button>
          <button
            type="button"
            onClick={handleExportLogs}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export Log
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Business Context</p>
          <h3 className="mt-2 text-lg font-semibold text-primary">{scope.businessName ?? 'Loading business...'}</h3>
          <p className="text-xs text-madas-text/60">
            {scope.businessId ? `Business ID: ${scope.businessId}` : 'Resolving business...'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            <ClockIcon className="h-4 w-4" />
            Source items: {loadingCounts ? 'Loading…' : totalSourceItems}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Overall Progress</p>
              <h3 className="text-2xl font-bold text-primary">{overallProgress}%</h3>
              <p className="text-xs text-madas-text/60">
                {completedSteps} of {STEP_DEFINITIONS.length} steps completed
              </p>
            </div>
            <div className="text-xs text-madas-text/60">
              {isRunning ? 'Running...' : 'Idle'}
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Migration Steps</h3>
            <p className="text-xs text-madas-text/60">Run steps individually or start all.</p>
          </div>
          <button
            type="button"
            onClick={loadCounts}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            {loadingCounts ? 'Refreshing...' : 'Refresh counts'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {STEP_DEFINITIONS.map((step) => {
            const state = stepsState[step.key];
            const isCompleted = state?.status === 'completed';
            const isInProgress = state?.status === 'in-progress';
            return (
              <div
                key={step.key}
                className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow">
                    {step.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-primary">{step.label}</h4>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                          <CheckCircleIcon className="h-3 w-3" />
                          Done
                        </span>
                      )}
                      {isInProgress && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          <ArrowPathIcon className="h-3 w-3 animate-spin" />
                          Running
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-madas-text/70">{step.description}</p>
                    <p className="mt-1 text-xs font-semibold text-primary/80">
                      Source: {state?.count ?? 0} • Migrated: {state?.migrated ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => migrateStep(step)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Run
                  </button>
                  <p className="text-[10px] uppercase tracking-wide text-madas-text/60">
                    Target: businesses/{scope.businessId ?? '...'} / {step.targetCollection}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-primary">Migration Log</h3>
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-gray-100 bg-gray-900 text-gray-50">
          <ul className="divide-y divide-gray-800 text-xs font-mono">
            {logs.map((entry) => (
              <li key={entry.id} className="px-4 py-2">
                <span
                  className={
                    entry.type === 'success'
                      ? 'text-green-400'
                      : entry.type === 'error'
                      ? 'text-red-400'
                      : entry.type === 'warning'
                      ? 'text-amber-300'
                      : 'text-blue-300'
                  }
                >
                  [{entry.timestamp}] ({entry.type.toUpperCase()})
                </span>{' '}
                <span>{entry.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default DataMigrationPage;

