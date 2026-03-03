import { DollarSign, TrendingUp, CreditCard, FileText } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <aside className="w-56 border-r border-white/10 p-4">
        <div className="text-lg font-semibold text-emerald-400 mb-8">XDIGIX Finance</div>
        <nav className="space-y-1 text-sm text-gray-400">
          <a href="/finance" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white">
            <TrendingUp className="w-5 h-5" /> Overview
          </a>
          <a href="/finance/transactions" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <CreditCard className="w-5 h-5" /> Transactions
          </a>
          <a href="/finance/expenses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <DollarSign className="w-5 h-5" /> Expenses
          </a>
          <a href="/finance/reports" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white">
            <FileText className="w-5 h-5" /> Reports
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Finance</h1>
        <p className="text-gray-400 mb-8">
          Finance app placeholder. Connect to API and add routes (overview, transactions, expenses, reports).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Revenue', value: '—', color: 'bg-emerald-500/20 text-emerald-400' },
            { label: 'Expenses', value: '—', color: 'bg-red-500/20 text-red-400' },
            { label: 'Balance', value: '—', color: 'bg-blue-500/20 text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`p-4 rounded-xl ${color}`}>
              <div className="text-sm opacity-90">{label}</div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
