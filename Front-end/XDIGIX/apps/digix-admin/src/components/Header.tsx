import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';

type HeaderProps = { onToggleSidebar: () => void };

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    await logout();
  }, [logout]);

  const name = user?.name || user?.email?.split('@')[0] || 'Admin';
  const initials = name.charAt(0).toUpperCase();

  return (
    <header className="bg-[#1a1b3e]/95 backdrop-blur-xl border-b border-white/5 fixed top-0 left-0 right-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Toggle navigation"
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
            onClick={onToggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-navy-900 font-black text-lg">X</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">
                XDIGIX <span className="text-amber-400">Admin</span>
              </h1>
              <p className="text-xs text-gray-500">System Control Panel</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={ref}>
            <button
              type="button"
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-white/5"
              onClick={() => setProfileOpen((o) => !o)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-navy-900 font-bold text-sm">{initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white leading-none">{name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 hidden md:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#1a1b3e] shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                    Administrator
                  </span>
                </div>
                <div className="py-1">
                  <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5">
                    <User className="w-4 h-4" /> Profile
                  </button>
                  <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
                <div className="border-t border-white/5 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
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
