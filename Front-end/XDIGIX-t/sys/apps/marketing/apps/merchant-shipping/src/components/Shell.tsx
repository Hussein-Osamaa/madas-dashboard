import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, Package, Calculator, BarChart3, LogOut, Truck, Wallet } from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/create',    label: 'New Order',  icon: Plus },
  { to: '/orders',    label: 'My Orders',  icon: Package },
  { to: '/wallet',    label: 'Wallet',     icon: Wallet },
  { to: '/calculator',label: 'Calculator', icon: Calculator },
  { to: '/analytics', label: 'Analytics',  icon: BarChart3 },
];

export default function Shell() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('ship_token'); navigate('/login'); };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1a1b3e]/95 border-r border-white/5 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Truck className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">XDIGIX Ship</p>
            <p className="text-xs text-gray-500">Merchant Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}>
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
