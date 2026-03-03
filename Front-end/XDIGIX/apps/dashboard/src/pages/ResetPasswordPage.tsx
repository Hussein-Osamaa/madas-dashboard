import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { resetPassword } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0b1a]">
      <div className="w-full max-w-md rounded-2xl bg-[#1a1b3e]/80 border border-white/10 p-8 shadow-xl">
        <h1 className="text-xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your new password below.</p>
        {success ? (
          <div className="space-y-4">
            <p className="text-yellow-400 text-sm">Password reset successfully. You can now sign in.</p>
            <Link to="/login" className="inline-block py-2 px-4 bg-yellow-600 text-white font-medium rounded-xl hover:bg-yellow-500">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">New password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-2">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <Link to="/login" className="block text-center text-sm text-gray-400 hover:text-white">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
