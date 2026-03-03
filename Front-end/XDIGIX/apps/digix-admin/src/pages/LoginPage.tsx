import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { user, loading: authLoading, setUserFromLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user: loggedInUser } = await login(email.trim().toLowerCase(), password);
      setUserFromLogin(loggedInUser);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center">
        <div className="text-gray-400">Checking authentication...</div>
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0b1a] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-float">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1b3e]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-navy-900 text-2xl font-black">X</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to XDIGIX Admin Panel</p>
          </div>

          <div className="px-8 pb-10">
            {!loading ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                      placeholder="admin@xdigix.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900 font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-500/25"
                >
                  Sign In
                </button>
              </form>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Signing you in...</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          © {new Date().getFullYear()} XDIGIX. All rights reserved.
        </p>
      </div>
    </div>
  );
}
