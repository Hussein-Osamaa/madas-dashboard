import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useDashboardAnalysis } from '../../hooks/useDashboardAnalysis';
import { useDashboardTasks } from '../../hooks/useDashboardTasks';
import { trackPageLoad } from '../../lib/performance';

type Activity = {
  label: string;
  time: string;
  icon: string;
  accent: string;
};

const defaultActivities: Activity[] = [
  {
    label: 'New order received',
    time: '2 minutes ago',
    icon: 'check',
    accent: 'bg-green-100 text-green-600'
  },
  {
    label: 'New customer registered',
    time: '15 minutes ago',
    icon: 'person_add',
    accent: 'bg-blue-100 text-blue-600'
  },
  {
    label: 'Low stock alert',
    time: '1 hour ago',
    icon: 'inventory',
    accent: 'bg-orange-100 text-orange-600'
  }
];

const numberFormatter = new Intl.NumberFormat('en-US');

const formatNumber = (value: number) => numberFormatter.format(value);

const DashboardHomePage = () => {
  const { user } = useAuth();
  const { businessId, userDisplayName, plan } = useBusiness();
  
  // Get currency from business plan, default to USD
  const currency = (plan as { currency?: string } | undefined)?.currency ?? 'USD';
  
  // Create currency formatter based on business currency
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }),
    [currency]
  );
  
  const formatCurrency = (value: number) => currencyFormatter.format(value);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(businessId);
  const { data: analysis } = useDashboardAnalysis(businessId);
  const { tasks, isLoading: tasksLoading, addTask, adding, deleteTask, deleting, toggleTask, toggling } =
    useDashboardTasks(businessId, user?.uid);
  const [newTask, setNewTask] = useState('');

  // Track page load performance
  useEffect(() => {
    trackPageLoad('dashboard_home');
  }, []);

  const analysisData = analysis ?? { topProducts: [], salesByCategory: [] };

  const welcomeMessage = useMemo(() => {
    const fallback =
      user?.displayName || userDisplayName || user?.email?.split('@')[0] || 'there';
    return `Welcome back, ${fallback}!`;
  }, [user?.displayName, user?.email, userDisplayName]);

  const summaryCards = useMemo(() => {
    const totals = stats ?? { totalSales: 0, orders: 0, customers: 0, products: 0 };
    return [
      {
        label: 'Total Sales',
        value: formatCurrency(totals.totalSales),
        change: '+12%',
        changeLabel: 'from last month',
        icon: 'trending_up',
        accent: 'bg-green-100 text-green-600'
      },
      {
        label: 'Orders',
        value: formatNumber(totals.orders),
        change: '+8%',
        changeLabel: 'from last month',
        icon: 'shopping_cart',
        accent: 'bg-blue-100 text-blue-600'
      },
      {
        label: 'Customers',
        value: formatNumber(totals.customers),
        change: '+15%',
        changeLabel: 'from last month',
        icon: 'people',
        accent: 'bg-purple-100 text-purple-600'
      },
      {
        label: 'Products',
        value: formatNumber(totals.products),
        change: '+5%',
        changeLabel: 'from last month',
        icon: 'inventory',
        accent: 'bg-orange-100 text-orange-600'
      }
    ];
  }, [stats]);

  const handleAddTask = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed) {
      return;
    }
    try {
      await addTask(trimmed);
      setNewTask('');
    } catch (error) {
      console.error('Failed to add task', error);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await toggleTask({ taskId, completed: !task.completed });
    } catch (error) {
      console.error('Failed to toggle task', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task', error);
    }
  };

  return (
    <div className="main-dashboard-content px-6 py-8">
      <section className="mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">{welcomeMessage}</h2>
        <p className="text-gray-600">Here&apos;s what&apos;s happening with your business today.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-primary">
                  {statsLoading ? '—' : card.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.accent.split(' ')[0]} rounded-lg flex items-center justify-center`}>
                <span className={`material-icons ${card.accent.split(' ')[1]}`}>{card.icon}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={card.accent.split(' ')[1]}>{card.change}</span>
              <span className="text-gray-500 ml-1">{card.changeLabel}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="paper-todo">
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-lg font-semibold text-primary"
                style={{ fontFamily: '"Indie Flower", "Inter", cursive, sans-serif' }}
              >
                Today&apos;s Tasks
              </h3>
              <button
                type="button"
                className="text-primary hover:bg-base p-2 rounded-lg"
                onClick={() => {
                  // Task templates feature coming soon
                }}
                title="Task templates (coming soon)"
              >
                <span className="material-icons">add</span>
              </button>
            </div>

            <form onSubmit={handleAddTask} className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Add a new task..."
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-[#1f3c19] transition-colors disabled:opacity-60"
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>

            <ul className="space-y-3">
              {tasksLoading && <li className="text-sm text-gray-500 italic">Loading tasks…</li>}

              {!tasksLoading && tasks.length === 0 && (
                <li className="text-sm text-gray-500 italic">No tasks yet. Add your first task above.</li>
              )}

              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary rounded border-2 border-[rgba(255,211,0,0.6)]"
                    checked={task.completed ?? false}
                    onChange={() => handleToggleTask(task.id)}
                    disabled={toggling}
                  />
                  <div className="flex-1 relative">
                    <span
                      className={`todo-text ${
                        task.completed ? 'checked text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {task.task}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="delete-btn text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label={`Delete ${task.task}`}
                    disabled={deleting}
                  >
                    <span className="material-icons text-base">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-primary mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {defaultActivities.map((activity) => (
                <div key={activity.label} className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 ${activity.accent.split(' ')[0]} rounded-full flex items-center justify-center`}
                  >
                    <span className={`material-icons text-sm ${activity.accent.split(' ')[1]}`}>{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.label}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {analysisData.topProducts.length ? (
              analysisData.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-medium">
                    {index + 1}. {product.name}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatNumber(product.sales)} sales</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm py-2">No data yet</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Sales by Category</h3>
          <div className="space-y-3">
            {analysisData.salesByCategory.length ? (
              analysisData.salesByCategory.map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-medium">{category.category}</span>
                  <span className="text-sm font-semibold text-primary">{formatNumber(category.sales)} sales</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm py-2">No data yet</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardHomePage;

