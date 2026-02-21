/**
 * XDIGIX Admin Shell
 * Main layout wrapper for the super admin dashboard
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInAdmin } from '../lib/firebase';

function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!signInAdmin) throw new Error('Admin login requires backend configuration');
      await signInAdmin(email.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setError(msg.replace('Firebase: ', '').replace('auth/', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-4">
      <div className="bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-2 text-center">Sign In</h2>
        <p className="text-gray-400 text-center mb-6">Sign in to access the admin dashboard.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
import { useRBAC } from '../contexts/RBACContext';
import FullScreenLoader from '../components/common/FullScreenLoader';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

const AppShell = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user: firebaseUser, loading: authLoading, error: authError } = useAuth();
  const { user: rbacUser, loading: rbacLoading, hasPermission } = useRBAC();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      // If no RBAC user, allow access for setup (user needs to create RBAC user)
      if (!rbacUser) {
        setIsAuthorized(true);
        return;
      }

      // If user is super_admin, check permissions
      if (rbacUser.type === 'super_admin') {
        try {
          const canView = await hasPermission('super_admin.view_analytics');
          setIsAuthorized(canView);
        } catch (error) {
          console.error('[AppShell] Error checking permission:', error);
          // Allow access if permission check fails (for setup)
          setIsAuthorized(true);
        }
      } else {
        // Non-super-admin users are not authorized
        setIsAuthorized(false);
      }
    };

    if (!rbacLoading) {
      checkAuthorization();
    } else {
      setIsAuthorized(true); // Allow access while loading
    }
  }, [rbacUser, rbacLoading, hasPermission]);

  // Show loading only during initial auth check
  if (authLoading || rbacLoading) {
    return <FullScreenLoader message="Initializing..." />;
  }

  // Show auth error if any
  if (authError) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Error</h2>
          <p className="text-gray-400 mb-4">{authError}</p>
          <p className="text-sm text-gray-500">
            Please add this domain to Firebase Console → Authentication → Settings → Authorized Domains
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <SignInScreen />;
  }

  // Show loading while authorization is being checked (only once)
  if (isAuthorized === null) {
    return <FullScreenLoader message="Checking access..." />;
  }

  // Only redirect if we definitely know user is not authorized
  if (isAuthorized === false && rbacUser && rbacUser.type !== 'super_admin') {
    return <Navigate to="/no-access" replace />;
  }

  // If no RBAC user but we're still here, allow access for setup/debugging
  if (!rbacUser) {
    console.warn('[AppShell] No RBAC user found - allowing access for setup');
  }

  return (
    <div className="min-h-screen bg-[#0a0b1a]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      {/* Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main content area */}
      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
