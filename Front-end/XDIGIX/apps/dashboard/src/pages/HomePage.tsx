import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  Plus,
  CheckCircle,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

type Task = { id: string; title: string; done: boolean };

const defaultTasks: Task[] = [
  { id: '1', title: 'hi', done: false },
  { id: '2', title: 'fffgf', done: false },
];

export default function HomePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [newTask, setNewTask] = useState('');

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const iconClass = isDark ? 'text-yellow-500' : 'text-sky-500';
  const iconClassAlt = isDark ? 'text-yellow-600' : 'text-sky-600';

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    setTasks((prev) => [...prev, { id: Date.now().toString(), title: t, done: false }]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const kpis = [
    {
      label: 'Total Sales',
      value: 'EGP 0',
      sub: '+12% from last month',
      icon: <TrendingUp className={`w-6 h-6 ${iconClass}`} />,
      to: 'orders',
    },
    {
      label: 'Orders',
      value: '0',
      sub: '+8% from last month',
      icon: <ShoppingCart className={`w-6 h-6 ${iconClass}`} />,
      to: 'orders',
    },
    {
      label: 'Customers',
      value: '0',
      sub: '+15% from last month',
      icon: <Users className={`w-6 h-6 ${iconClassAlt}`} />,
      to: 'customers',
    },
    {
      label: 'Products',
      value: '0',
      sub: '+5% from last month',
      icon: <Package className={`w-6 h-6 ${iconClass}`} />,
      to: 'inventory/products',
    },
  ];

  const activities = [
    { text: 'New order received', icon: <CheckCircle className={`w-5 h-5 ${iconClass}`} />, time: '2 minutes ago' },
    { text: 'New customer registered', icon: <UserPlus className={`w-5 h-5 ${iconClassAlt}`} />, time: '15 minutes ago' },
    { text: 'Low stock alert', icon: <AlertTriangle className={`w-5 h-5 ${iconClass}`} />, time: '1 hour ago' },
  ];

  const cardBg = isDark ? 'bg-[#1a1b3e]/80 border-white/10' : 'bg-white border-gray-200 shadow-sm';
  const inputBg = isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  return (
    <>
      <div className="mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>
          Welcome back, {name}!
        </h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={k.to}
            className={`${cardBg} border rounded-2xl p-5 transition-colors ${isDark ? 'hover:border-white/20' : 'hover:border-gray-300'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{k.label}</p>
                <p className={`text-xl font-bold ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>{k.value}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-yellow-400/90' : 'text-sky-700'}`}>{k.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>{k.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Today&apos;s Tasks</h2>
            <Plus className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a new task..."
              className={`flex-1 px-4 py-2.5 rounded-xl border ${inputBg} ${isDark ? 'focus:ring-2 focus:ring-yellow-500/50' : 'focus:ring-2 focus:ring-sky-500/50'}`}
            />
            <button
              type="button"
              onClick={addTask}
              className={`px-4 py-2.5 rounded-xl text-white font-medium ${isDark ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-sky-600 hover:bg-sky-500'}`}
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    t.done ? (isDark ? 'bg-yellow-500 border-yellow-500' : 'bg-sky-500 border-sky-500') : (isDark ? 'border-yellow-500/60' : 'border-sky-500/60')
                  }`}
                >
                  {t.done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className={t.done ? 'text-gray-500 line-through' : isDark ? 'text-gray-300' : 'text-gray-700'}>{t.title}</span>
              </li>
            ))}
          </ul>
          {isDark && <div className="mt-4 h-4 bg-gradient-to-t from-white/5 to-transparent rounded-b-xl -mx-6 -mb-6" />}
        </div>

        {/* Recent Activity */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Recent Activity</h2>
          <ul className="space-y-4">
            {activities.map((a, i) => (
              <li key={i} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {a.icon}
                  </div>
                  {i < activities.length - 1 && (
                    <div className={`absolute top-10 left-1/2 w-px h-full -translate-x-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{a.text}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}