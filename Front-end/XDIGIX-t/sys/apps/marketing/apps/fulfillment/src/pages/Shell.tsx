import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, LogIn, Sun, Moon, Boxes, Clock, CheckCircle, Truck, ClipboardCheck, FileText, Menu, X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { connectWarehouseSocket, isWarehouseSocketDisabled, subscribeWarehouseConnectionState } from '../lib/warehouseSocket';

const nav = [
  { path: '/', label: 'Operations', icon: Package },
  { path: '/inventory', label: 'Inventory', icon: Boxes },
  { path: '/fulfillment', label: 'All Orders', icon: Package, section: 'Fulfillment' },
  { path: '/pending-orders', label: 'Pending', icon: Clock, section: 'Fulfillment' },
  { path: '/ready-for-pickup', label: 'Ready for Pickup', icon: CheckCircle, section: 'Fulfillment' },
  { path: '/shipping', label: 'Shipping', icon: Truck, section: 'Fulfillment' },
  { path: '/audit', label: 'Weekly Audit Scan', icon: ClipboardCheck, section: 'Warehouse' },
  { path: '/reports', label: 'Reports', icon: FileText, section: 'Warehouse' },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  let lastSection: string | undefined;
  return (
    <>
      {nav.map(({ path, label, icon: Icon, section }) => {
        const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
        const showSection = section && section !== lastSection;
        if (section) lastSection = section;
        return (
          <div key={path}>
            {showSection && (
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section}
              </p>
            )}
            <Link
              to={path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition min-h-[44px] items-center ${
                active
                  ? 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          </div>
        );
      })}
    </>
  );
}

export default function Shell() {
  const { user, logout } = useStaffAuth();
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const liveDisabled = isWarehouseSocketDisabled();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Start socket when logged in so Live indicator and all pages get events
  useEffect(() => {
    if (liveDisabled || !user) return;
    const unsub = connectWarehouseSocket(null, () => {});
    return unsub;
  }, [liveDisabled, !!user]);

  useEffect(() => {
    if (liveDisabled) return;
    return subscribeWarehouseConnectionState(setLiveConnected);
  }, [liveDisabled]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50 dark:bg-[#0a0b1a] flex">
      {/* Sidebar: drawer on mobile, fixed full-height on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:w-56 flex flex-col
          h-[100dvh] h-screen
          border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#0a0b1a]/50
          transform transition-transform duration-200 ease-out
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-white truncate">Warehouse</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={toggle}
            className="hidden md:flex p-2 rounded-lg text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 min-h-0 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <NavContent onNavigate={() => setMobileMenuOpen(false)} />
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-white/5 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate px-1 mb-1">{user?.email}</p>
          <p className="text-xs px-1 flex items-center gap-1.5" title={liveDisabled ? 'Live updates require a non-Vercel backend (e.g. Railway)' : liveConnected ? 'Live updates active' : 'Connecting…'}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${liveDisabled ? 'bg-gray-400' : liveConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {liveDisabled ? 'Live unavailable' : liveConnected ? 'Live' : 'Connecting…'}
          </p>
          <button
            onClick={() => logout()}
            className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px] px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 w-full justify-start"
          >
            <LogIn className="w-5 h-5 rotate-180 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile header - above sidebar on mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0a0b1a] border-b border-gray-200 dark:border-white/5 safe-area-inset-top">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2.5 -ml-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Package className="w-7 h-7 text-amber-500 dark:text-amber-400" />
          <span className="font-semibold text-gray-900 dark:text-white">Warehouse</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2.5 rounded-lg text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto flex flex-col min-w-0 pt-14 md:pt-0 md:ml-56 p-4 sm:p-6 bg-gray-50 dark:bg-transparent safe-area-inset-bottom">
        <Outlet />
      </main>
    </div>
  );
}
