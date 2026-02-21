import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import { staffLogin } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { setUserFromLogin } = useStaffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await staffLogin(email, password);
      if (!(res.user.allowedApps || []).includes('WAREHOUSE')) {
        setError('Your account does not have access to the Warehouse portal. Contact your admin.');
        (await import('../lib/api')).clearTokens();
        return;
      }
      setUserFromLogin(res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 dark:bg-[#0a0b1a] relative">
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-3 rounded-lg text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-gray-200 dark:hover:bg-white/5 transition touch-target flex items-center justify-center"
        title={isDark ? 'Light mode' : 'Dark mode'}
        aria-label={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <div className="w-full max-w-md min-w-0">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30">
            <Package className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">XDIGIX Warehouse</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Staff Portal</p>
          </div>
        </div>

        <div className="bg-white dark:bg-navy-800/50 border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-lg dark:shadow-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Sign in with credentials provided by your admin. You cannot self-register.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[44px]"
                placeholder="staff@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[44px]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
