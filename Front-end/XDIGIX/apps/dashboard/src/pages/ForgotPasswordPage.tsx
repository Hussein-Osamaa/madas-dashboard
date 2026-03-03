import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { forgotPassword } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      if (res.resetUrl) setResetUrl(res.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0b1a]">
      <div className="w-full max-w-md rounded-2xl bg-[#1a1b3e]/80 border border-white/10 p-8 shadow-xl">
        <h1 className="text-xl font-bold text-white mb-2">Forgot password</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your email and we’ll send you a reset link.</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-yellow-400 text-sm">If an account exists, a reset link has been sent.</p>
            {resetUrl && (
              <p className="text-gray-400 text-xs break-all">
                Dev link: <a href={resetUrl} className="text-yellow-400 underline">{resetUrl}</a>
              </p>
            )}
            <Link to="/login" className="inline-block text-sm font-medium text-yellow-400 hover:text-yellow-300">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link to="/login" className="block text-center text-sm text-gray-400 hover:text-white">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
