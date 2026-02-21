/**
 * XDIGIX Admin Header
 * Header component for the super admin dashboard
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { Menu, Bell, Search, LogOut, Settings, User, ChevronDown } from 'lucide-react';

type HeaderProps = {
  onToggleSidebar: () => void;
};

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { logout, user } = useAuth();
  const { user: rbacUser } = useRBAC();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const userInfo = useMemo(
    () => ({
      name: rbacUser?.name || user?.displayName || user?.email?.split('@')[0] || 'Admin',
      email: rbacUser?.email || user?.email || '',
      initials: (rbacUser?.name || user?.displayName || user?.email || 'A').charAt(0).toUpperCase()
    }),
    [rbacUser, user]
  );

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleProfileClick = useCallback(() => {
    setProfileMenuOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    setProfileMenuOpen(false);
    await logout();
  }, [logout]);

  return (
    <header className="bg-[#1a1b3e]/95 backdrop-blur-xl border-b border-white/5 fixed top-0 left-0 right-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Toggle navigation"
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            onClick={onToggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-[#0a0b1a] font-black text-lg">X</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">
                XDIGIX <span className="text-amber-400">Admin</span>
              </h1>
              <p className="text-xs text-gray-500">System Control Panel</p>
            </div>
          </div>
        </div>

        {/* Search bar - center */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search clients, staff..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 bg-white/5 rounded border border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            type="button"
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
          </button>

          {/* Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-all"
              onClick={handleProfileClick}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-[#0a0b1a] font-bold text-sm">{userInfo.initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white leading-none">{userInfo.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Super Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 hidden md:block transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#1a1b3e] shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
                  <p className="text-sm font-medium text-white">{userInfo.name}</p>
                  <p className="text-xs text-gray-400 truncate">{userInfo.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                    Super Administrator
                  </span>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="border-t border-white/5 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
