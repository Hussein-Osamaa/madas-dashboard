import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useClient } from '../contexts/ClientContext';
import { Link } from 'react-router-dom';
import { Menu, LogOut, User, Settings, ChevronDown, Bell, Moon, Sun, Building2 } from 'lucide-react';

type HeaderProps = { onToggleSidebar: () => void };

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { clients, selectedClientId, setSelectedClientId, currentClientName, loadingClients } = useClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tenantRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setProfileOpen(false);
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) setTenantOpen(false);
    };
    if (profileOpen || tenantOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, tenantOpen]);

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    await logout();
  }, [logout]);

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = name.charAt(0).toUpperCase();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-16 border-b ${
        isDark ? 'bg-[#16172a] border-white/5' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            type="button"
            aria-label="Toggle navigation"
            className={`lg:hidden p-2 rounded-xl ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={onToggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Brand: logo + Madas + Enterprise Plan (same as old dashboard header) */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-yellow-600' : 'bg-sky-600'}`}>
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-sky-800'}`}>Madas</span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-sky-100 text-sky-800'}`}>
                Enterprise Plan
              </span>
              {isAdminOrStaff && clients.length > 0 && (
                <div className="relative hidden md:block" ref={tenantRef}>
                  <button
                    type="button"
                    onClick={() => setTenantOpen((o) => !o)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    title="Switch tenant"
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="max-w-[120px] truncate">{currentClientName || 'All clients'}</span>
                    <ChevronDown className={`w-4 h-4 ${tenantOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {tenantOpen && (
                    <div className={`absolute left-0 mt-1 min-w-[180px] rounded-xl shadow-xl z-50 overflow-hidden ${isDark ? 'border border-white/10 bg-[#1a1b3e]' : 'border border-gray-200 bg-white'}`}>
                      <button
                        type="button"
                        onClick={() => { setSelectedClientId(null); setTenantOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left ${!selectedClientId ? (isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-sky-100 text-sky-700') : (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50')}`}
                      >
                        All clients
                      </button>
                      {clients.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => { setSelectedClientId(c._id); setTenantOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left truncate ${selectedClientId === c._id ? (isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-sky-100 text-sky-700') : (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50')}`}
                        >
                          {c.brandName || c._id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isAdminOrStaff && currentClientName && (
                <span className={`hidden sm:inline text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {currentClientName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className={`relative p-2 rounded-xl ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
              0
            </span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative" ref={ref}>
            <button
              type="button"
              className={`flex items-center gap-2 sm:gap-3 p-1.5 pr-2 sm:pr-3 rounded-xl ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
              onClick={() => setProfileOpen((o) => !o)}
            >
              <div className="hidden sm:block text-right">
                <p className={`text-sm font-semibold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</p>
                <p className="text-xs text-gray-500 truncate max-w-[140px]">{user?.email}</p>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-yellow-600' : 'bg-sky-600'}`}>
                <span className="text-white font-bold text-sm">{initials}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 hidden sm:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in ${
                  isDark ? 'border border-white/10 bg-[#1a1b3e]' : 'border border-gray-200 bg-white'
                }`}
              >
                <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link to="/settings" className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setProfileOpen(false)}>
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link to="/settings" className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setProfileOpen(false)}>
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </div>
                <div className={`border-t py-1 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}