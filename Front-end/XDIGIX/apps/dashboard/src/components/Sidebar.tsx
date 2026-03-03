import { Fragment, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  Calculator,
  PackageSearch,
  FolderOpen,
  Star,
  AlertTriangle,
  Box,
  Users,
  Megaphone,
  ShoppingBag,
  ChevronDown,
  Plus,
  Banknote,
  Settings,
} from 'lucide-react';

type NavItem = { label: string; icon: React.ReactNode; to: string };
type Expandable = { label: string; icon: React.ReactNode; items: NavItem[] };

const expandables: Expandable[] = [
  {
    label: 'Orders',
    icon: <Package className="w-5 h-5" />,
    items: [
      { label: 'All Orders', icon: <Package className="w-4 h-4" />, to: 'orders' },
      { label: 'Order Tracking', icon: <Truck className="w-4 h-4" />, to: 'orders/tracking' },
      { label: 'Abandoned Carts', icon: <ShoppingCart className="w-4 h-4" />, to: 'orders/abandoned' },
      { label: 'Scan Log', icon: <Package className="w-4 h-4" />, to: 'orders/scan-log' },
      { label: 'Returns', icon: <Package className="w-4 h-4" />, to: 'orders/returns' },
    ],
  },
  {
    label: 'Inventory',
    icon: <PackageSearch className="w-5 h-5" />,
    items: [
      { label: 'Products', icon: <PackageSearch className="w-4 h-4" />, to: 'inventory/products' },
      { label: 'Collections', icon: <FolderOpen className="w-4 h-4" />, to: 'inventory/collections' },
      { label: 'Reviews', icon: <Star className="w-4 h-4" />, to: 'inventory/reviews' },
      { label: 'Low Stock', icon: <AlertTriangle className="w-4 h-4" />, to: 'inventory/low-stock' },
      { label: 'Last Pieces', icon: <Box className="w-4 h-4" />, to: 'inventory/last-pieces' },
    ],
  },
  {
    label: 'Marketing',
    icon: <Megaphone className="w-5 h-5" />,
    items: [{ label: 'Discounts', icon: <Megaphone className="w-4 h-4" />, to: 'marketing/discounts' }],
  },
  {
    label: 'E-commerce',
    icon: <ShoppingBag className="w-5 h-5" />,
    items: [{ label: 'Website', icon: <ShoppingBag className="w-4 h-4" />, to: 'ecommerce' }],
  },
];

type SidebarProps = { isOpen: boolean; onClose: () => void };

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const path = location.pathname;
  const clientAccess = user?.role === 'client' && user?.clientId && typeof user.clientId === 'object'
    ? user.clientId.systemAccess
    : { dashboard: true, finance: true, fulfillment: true, shipping: true };
  const showFinance = clientAccess?.finance !== false;
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    Orders: false,
    Inventory: false,
    Marketing: false,
    'E-commerce': false,
  });

  useEffect(() => {
    setOpenKeys((prev) => {
      let changed = false;
      const next = { ...prev };
      expandables.forEach((group) => {
        const hasActive = group.items.some(
          (item) => path === '/' + item.to || path.startsWith('/' + item.to + '/') || path.endsWith('/' + item.to)
        );
        if (hasActive && !next[group.label]) {
          next[group.label] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [path]);

  const toggle = (key: string) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? isDark
          ? 'bg-yellow-500/15 text-yellow-400 border-l-2 border-yellow-400'
          : 'bg-sky-50 text-sky-700 border-l-2 border-sky-500'
        : isDark
          ? 'text-gray-400 hover:text-white hover:bg-white/5'
          : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <Fragment>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity z-20 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed lg:static left-0 top-16 h-[calc(100vh-4rem)] lg:h-full w-72 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${
          isDark ? 'bg-[#16172a] border-r border-white/5' : 'bg-white border-r border-gray-200'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
            <NavLink to="" end className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </NavLink>

            {expandables.map((group) => {
              const isOpenGroup = openKeys[group.label];
              const hasActive = group.items.some((item) =>
                path === `/${item.to}` || path.startsWith(`/${item.to}/`) || path.endsWith('/' + item.to)
              );
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      hasActive ? (isDark ? 'text-yellow-400' : 'text-sky-700') : ''
                    } ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      {group.icon}
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpenGroup ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpenGroup && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2 py-2 rounded-lg text-sm ${
                              isActive
                                ? isDark
                                  ? 'text-yellow-400 font-medium bg-yellow-500/10'
                                  : 'text-sky-700 font-medium bg-sky-100'
                                : isDark
                                  ? 'text-gray-400 hover:text-white'
                                  : 'text-gray-600 hover:text-gray-900'
                            }`
                          }
                          onClick={onClose}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <NavLink to="pos" className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
              <Calculator className="w-5 h-5" />
              <span>POS</span>
            </NavLink>
            <NavLink to="customers" className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
              <Users className="w-5 h-5" />
              <span>Customers</span>
            </NavLink>
            {showFinance && (
              <NavLink to="finance" className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
                <Banknote className="w-5 h-5" />
                <span>Finance</span>
              </NavLink>
            )}
            <NavLink to="settings" className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
            <NavLink to="users" className={({ isActive }) => linkClass(isActive)} onClick={onClose}>
              <Users className="w-5 h-5" />
              <span>Users</span>
            </NavLink>
          </nav>

          {/* Quick Actions */}
          <div className={`flex-shrink-0 p-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Quick Actions</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { navigate('orders'); onClose(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
              <button
                type="button"
                onClick={() => { navigate('inventory/products'); onClose(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </Fragment>
  );
}
