import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

type HeaderProps = {
  onToggleSidebar: () => void;
};

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { logout, user } = useAuth();
  const { businessName, plan, userDisplayName, userEmail } = useBusiness();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsCount = 0;

  const planBadge = useMemo(() => {
    const type = plan?.type ?? 'basic';
    const status = plan?.status ?? 'active';

    const planLabel = `${type.charAt(0).toUpperCase()}${type.slice(1)} Plan${status === 'trial' ? ' (Trial)' : ''}`;
    const planLabelShort = `${type.charAt(0).toUpperCase()}${type.slice(1)}${status === 'trial' ? ' (T)' : ''}`;

    if (type === 'enterprise') {
      return {
        label: planLabel,
        labelShort: planLabelShort,
        className:
          'text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer'
      };
    }

    if (type === 'professional') {
      return {
        label: planLabel,
        labelShort: planLabelShort,
        className:
          'text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer'
      };
    }

    return {
      label: planLabel,
      labelShort: planLabelShort,
      className:
        'text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors cursor-pointer'
    };
  }, [plan?.status, plan?.type]);

  const userInfo = useMemo(
    () => {
      const fullName = userDisplayName ?? 'Loading…';
      const firstName = fullName.split(' ')[0];
      return {
        name: fullName,
        firstName: firstName,
        email: userEmail ?? 'loading@example.com'
      };
    },
    [userDisplayName, userEmail]
  );

  const currentBusiness = useMemo(
    () => ({
      name: businessName ?? 'DIGIX Dashboard'
    }),
    [businessName]
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

  const handleNavigateToSettings = useCallback(() => {
    setProfileMenuOpen(false);
    navigate('/settings');
  }, [navigate]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40 h-16 rounded-none">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <button
            type="button"
            aria-label="Toggle navigation"
            className="lg:hidden text-primary p-2 rounded-lg hover:bg-gray-100"
            onClick={onToggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-primary truncate">{currentBusiness.name}</h1>
                <button
                  type="button"
                  className={`${planBadge.className} flex-shrink-0`}
                  title={planBadge.label}
                >
                  <span className="hidden sm:inline">{planBadge.label}</span>
                  <span className="sm:hidden">{planBadge.labelShort}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
            <span className="material-icons text-primary">notifications</span>
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">{notificationsCount}</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleDarkToggle}
            >
              {isDark ? (
                <span className="material-icons text-yellow-400">light_mode</span>
              ) : (
                <span className="material-icons text-gray-600">dark_mode</span>
              )}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
              <p className="text-xs text-gray-600">{userInfo.email}</p>
            </div>
            <div className="text-right sm:hidden">
              <p className="text-sm font-medium text-gray-900">{userInfo.firstName}</p>
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="w-8 h-8 bg-accent rounded-full flex items-center justify-center hover:bg-yellow-400 transition-colors cursor-pointer flex-shrink-0"
                onClick={handleProfileClick}
              >
                <span className="text-primary font-bold text-sm">{userInfo.name.charAt(0)}</span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                    <p className="text-xs text-gray-600 truncate">{userInfo.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleNavigateToSettings}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    >
                      <span className="material-icons text-base opacity-100">settings</span>
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDarkToggle();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    >
                      <span className="material-icons text-base opacity-100">{isDark ? 'light_mode' : 'dark_mode'}</span>
                      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        alert('Help & Support coming soon');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    >
                      <span className="material-icons text-base opacity-100">help_outline</span>
                      <span>Help & Support</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
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

export default Header;

