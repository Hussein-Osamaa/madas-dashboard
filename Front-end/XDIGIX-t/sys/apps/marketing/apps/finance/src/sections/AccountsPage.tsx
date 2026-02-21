import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAccounts } from '../hooks/useAccounts';
import AccountsList from '../components/accounts/AccountsList';
import TransferModal from '../components/accounts/TransferModal';
import ReconcileDrawer from '../components/accounts/ReconcileDrawer';
import KpiCard from '../components/KpiCard';
import { formatCurrency } from '../lib/format';
import { BanknotesIcon, ArrowPathRoundedSquareIcon, WalletIcon } from '@heroicons/react/24/outline';

const AccountsPage = () => {
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [transferOpen, setTransferOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const accountsQuery = useAccounts({ range });
  const currency = 'USD';

  const kpis = useMemo(() => {
    const totals = accountsQuery.data?.totals;
    if (!totals) {
      return [
        { label: 'Total Balance', value: '—', icon: <BanknotesIcon className="h-6 w-6" /> },
        { label: 'Bank Accounts', value: '—', icon: <WalletIcon className="h-6 w-6" /> },
        { label: 'Reconciled %', value: '—', icon: <ArrowPathRoundedSquareIcon className="h-6 w-6" /> }
      ];
    }

    return [
      {
        label: 'Total Balance',
        value: formatCurrency(totals.balance, currency),
        trend: { value: `${totals.previousBalance ? (((totals.balance - totals.previousBalance) / totals.previousBalance) * 100).toFixed(1) : 0}% vs last`, positive: totals.balance >= totals.previousBalance },
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
  }, [accountsQuery.data]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Accounts</h2>
          <p className="text-sm text-madas-text/70">
            Monitor balances, perform inter-account transfers and reconcile statements.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setTransferOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Transfer
          </button>
          <button
            onClick={() => setReconcileOpen(true)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow border border-primary/10 hover:bg-primary/10 transition"
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

      <div className="glass-card p-6">
        <AccountsList accounts={accountsQuery.data?.accounts ?? []} loading={accountsQuery.isLoading} currency={currency} onRefresh={accountsQuery.refetch} />
      </div>

      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} accounts={accountsQuery.data?.accounts ?? []} />
      <ReconcileDrawer open={reconcileOpen} onClose={() => setReconcileOpen(false)} accounts={accountsQuery.data?.accounts ?? []} />
    </section>
  );
};

export default AccountsPage;

