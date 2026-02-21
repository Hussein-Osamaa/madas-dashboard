import { formatCurrency, formatDate } from '../../lib/format';

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency?: string;
  lastReconciled?: Date;
  status?: string;
};

type Props = {
  accounts: Account[];
  loading: boolean;
  currency: string;
  onRefresh: () => void;
};

const typeColor = (type: string) => {
  switch (type) {
    case 'bank':
      return 'bg-primary/10 text-primary';
    case 'cash':
      return 'bg-success/10 text-success';
    case 'wallet':
      return 'bg-accent/10 text-primary';
    default:
      return 'bg-madas-text/10 text-madas-text/70';
  }
};

const statusBadge = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-success/10 text-success';
    case 'inactive':
      return 'bg-madas-text/10 text-madas-text/70';
    default:
      return 'bg-primary/10 text-primary';
  }
};

const AccountsList = ({ accounts, loading, currency, onRefresh }: Props) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Accounts</h3>
        <p className="text-xs text-madas-text/60">Balances auto-update from transactions and transfers.</p>
      </div>
      <button
        onClick={onRefresh}
        className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10"
      >
        Refresh
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-primary/10">
        <thead className="bg-primary/5 text-xs uppercase tracking-wide text-primary">
          <tr>
            <th className="px-4 py-3 text-left">Account</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Balance</th>
            <th className="px-4 py-3 text-left">Last reconciliation</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/10 text-sm text-madas-text">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-madas-text/60">
                Loading accounts...
              </td>
            </tr>
          ) : accounts.length ? (
            accounts.map((account) => (
              <tr key={account.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 text-primary font-semibold">{account.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeColor(account.type)}`}>
                    {account.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatCurrency(account.balance, account.currency || currency)}
                </td>
                <td className="px-4 py-3 text-xs text-madas-text/70">
                  {account.lastReconciled ? formatDate(account.lastReconciled) : 'Not reconciled'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(account.status)}`}>
                    {account.status ?? 'active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                      View
                    </button>
                    <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-madas-text/60">
                No accounts found. Create an account to start tracking balances.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default AccountsList;


