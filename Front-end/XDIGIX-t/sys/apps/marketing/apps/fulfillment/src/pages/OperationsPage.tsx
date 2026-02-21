import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';

const cards = [
  { to: '/inventory', label: 'Inventory', desc: 'View stock by client', icon: Boxes, iconClass: 'bg-indigo-500/10 text-indigo-400' },
];

export default function OperationsPage() {
  return (
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Warehouse Operations</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">Choose an operation below. All actions are recorded and attributed to you.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map(({ to, label, desc, icon: Icon, iconClass }) => (
          <Link
            key={to}
            to={to}
            className="block p-5 sm:p-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-amber-500/30 dark:hover:border-white/10 hover:bg-amber-50/50 dark:hover:bg-white/[0.07] transition shadow-sm dark:shadow-none"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${iconClass}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{label}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
