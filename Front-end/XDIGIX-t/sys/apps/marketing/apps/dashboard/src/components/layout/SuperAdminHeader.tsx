/**
 * Super Admin Header
 * Header component for the company's super admin dashboard
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

type SuperAdminHeaderProps = {
  onToggleSidebar: () => void;
};

const SuperAdminHeader = ({ onToggleSidebar }: SuperAdminHeaderProps) => {
  const { logout, user } = useAuth();
  const { user: rbacUser } = useRBAC();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const userInfo = useMemo(
    () => ({
      name: rbacUser?.name || user?.displayName || user?.email?.split('@')[0] || 'Admin',
      email: rbacUser?.email || user?.email || ''
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

  const handleDarkToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  const handleProfileClick = useCallback(() => {
    setProfileMenuOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    setProfileMenuOpen(false);
    await logout();
  }, [logout]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            aria-label="Toggle navigation"
            className="lg:hidden text-primary p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onToggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Super Admin Control Panel
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Company Management Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleDarkToggle}
            >
              {isDark ? (
                <span className="material-icons text-yellow-400">light_mode</span>
              ) : (
                <span className="material-icons text-gray-600">dark_mode</span>
              )}
            </button>

            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userInfo.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo.email}</p>
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                onClick={handleProfileClick}
              >
                <span className="text-white font-bold text-sm">{userInfo.name.charAt(0).toUpperCase()}</span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userInfo.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userInfo.email}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                      Super Administrator
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleDarkToggle();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                    >
                      <span className="material-icons text-base opacity-100">
                        {isDark ? 'light_mode' : 'dark_mode'}
                      </span>
                      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 transition-colors"
                    >
                      <span className="material-icons text-base opacity-100">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;


