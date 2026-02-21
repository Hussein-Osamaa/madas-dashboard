import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { BanknotesIcon, ArrowPathRoundedSquareIcon, WalletIcon } from '@heroicons/react/24/outline';
import { useAccounts } from '../../hooks/finance/useAccounts';
import AccountsList from '../../components/finance/accounts/AccountsList';
import TransferModal from '../../components/finance/accounts/TransferModal';
import ReconcileDrawer from '../../components/finance/accounts/ReconcileDrawer';
import KpiCard from '../../components/finance/KpiCard';
import { formatCurrency } from '../../lib/finance/format';
import { useFinanceScope } from '../../hooks/useFinanceScope';

const AccountsPage = () => {
  const scope = useFinanceScope();
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [transferOpen, setTransferOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const accountsQuery = useAccounts({ range });
  const currency = scope.currency;

  const kpis = useMemo(() => {
    const totals = accountsQuery.data?.totals;
    if (!totals) {
      return [
        { label: 'Total Balance', value: '—', icon: <BanknotesIcon className="h-6 w-6" /> },
        { label: 'Bank Accounts', value: '—', icon: <WalletIcon className="h-6 w-6" /> },
        { label: 'Reconciled %', value: '—', icon: <ArrowPathRoundedSquareIcon className="h-6 w-6" /> }
      ];
    }

    const previousBalance = totals.previousBalance ?? totals.balance;
    const delta = previousBalance ? ((totals.balance - previousBalance) / previousBalance) * 100 : 0;

    return [
      {
        label: 'Total Balance',
        value: formatCurrency(totals.balance, currency),
        trend: {
          value: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs last`,
          positive: delta >= 0
        },
        icon: <BanknotesIcon className="h-6 w-6" />
      },
      {
        label: 'Bank Accounts',
        value: totals.bankAccounts.toString(),
        icon: <WalletIcon className="h-6 w-6" />
      },
      {
        label: 'Reconciled',
        value: `${totals.reconciledPercentage.toFixed(0)}%`,
        icon: <ArrowPathRoundedSquareIcon className="h-6 w-6" />
      }
    ];
  }, [accountsQuery.data, currency]);

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance accounts.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Accounts</h2>
          <p className="text-sm text-madas-text/70">Monitor balances, perform inter-account transfers and reconcile statements.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Transfer
          </button>
          <button
            type="button"
            onClick={() => setReconcileOpen(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10"
          >
            Reconcile
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} primaryValue={kpi.value} trend={'trend' in kpi ? kpi.trend : undefined} icon={kpi.icon} />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <AccountsList
          accounts={accountsQuery.data?.accounts ?? []}
          loading={accountsQuery.isLoading}
          currency={currency}
          onRefresh={accountsQuery.refetch}
        />
      </div>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accountsQuery.data?.accounts ?? []}
      />
      <ReconcileDrawer
        open={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        accounts={accountsQuery.data?.accounts ?? []}
      />
    </section>
  );
};

export default AccountsPage;

