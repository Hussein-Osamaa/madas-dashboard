import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Eye, EyeOff } from 'lucide-react';
import { setToken, setMerchantId } from '../lib/api';

const BASE = import.meta.env.VITE_API_URL ?? '';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/auth/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'Login failed'); return; }
      setToken(d.accessToken ?? d.token ?? '');
      setMerchantId(d.businessId ?? d.userId ?? '');
      navigate('/');
    } catch {
      setError('Network error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d0e26] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">XDIGIX Ship</h1>
          <p className="text-sm text-gray-400 mt-1">Merchant Shipping Portal</p>
        </div>

        <form onSubmit={login} className="bg-[#1a1b3e]/80 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50 pr-10" />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-amber-500 text-black rounded-lg font-semibold text-sm hover:bg-amber-400 disabled:opacity-60 transition-colors">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
