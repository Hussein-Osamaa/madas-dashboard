import { Link, useNavigate } from 'react-router-dom';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';
import { Settings, ShieldAlert, Mail, LogIn, RefreshCw } from 'lucide-react';

const NoAccessPage = () => {
  const { user: rbacUser } = useRBAC();
  const { user: firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const needsSetup = !rbacUser;

  const handleSignOutAndLogin = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center px-6 relative">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl w-full bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Settings className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Setup Required</h1>
            <p className="text-gray-400">
              You need to initialize the RBAC system and create your super admin user.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
            <h2 className="font-semibold text-blue-400 mb-3">Quick Setup Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-300/80">
              <li>Open browser console (F12 or Cmd+Option+I)</li>
              <li>Run the RBAC initialization script from <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">sys/BROWSER_CONSOLE_SETUP.md</code></li>
              <li>Create your super admin user</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          {firebaseUser && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Your Firebase User:</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p><span className="text-gray-500">UID:</span> <span className="font-mono text-xs text-gray-300">{firebaseUser.uid}</span></p>
                <p><span className="text-gray-500">Email:</span> <span className="text-gray-300">{firebaseUser.email}</span></p>
              </div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-amber-400">
              <strong>Note:</strong> Check <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">sys/BROWSER_CONSOLE_SETUP.md</code> for detailed setup instructions.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh After Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center px-6 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-gray-400">
            You don&apos;t have permission to access this content.
          </p>
        </div>

        {rbacUser && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <h3 className="font-semibold text-white mb-3 text-sm">Your Account:</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono text-xs text-gray-300">{rbacUser.email}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                  {rbacUser.type}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rbacUser.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {rbacUser.status}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <a 
            href="mailto:support@xdigix.com"
            className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
          >
            <Mail className="w-5 h-5" />
            Contact Support
          </a>
          <button 
            onClick={handleSignOutAndLogin}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Sign Out & Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;
