import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  auth,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword
} from '../lib/firebase';
import dayjs from 'dayjs';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/overview', { replace: true });
    } catch (err) {
      let message = 'Unable to sign in. Please verify your credentials and try again.';
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found') message = 'No account found for this email address.';
      else if (code === 'auth/wrong-password') message = 'Incorrect password. Please try again.';
      else if (code === 'auth/too-many-requests') message = 'Too many attempts. Please wait a moment and try again.';
      else if (err instanceof Error) message = err.message;
      setError(message);
      setLoading(false);
    }
  };

  const today = dayjs().format('dddd, MMM D');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F7F2] via-white to-[#F7F5FF]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="flex flex-1 flex-col justify-between bg-primary text-white px-8 py-10 lg:px-14">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold">
              MF
            </div>
            <div>
              <h1 className="text-2xl font-semibold">DIGIX Finance HQ</h1>
              <p className="text-sm text-white/70">Secure access for finance operators and controllers.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/10 backdrop-blur-md p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">System health</p>
              <div className="mt-4 grid gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Realtime ledger sync</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Payments gateway</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Last backup</span>
                  <span>{today} • 04:00 UTC</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Need assistance?</p>
              <p className="mt-1 text-sm">
                Email <a href="mailto:finance@madas.app" className="underline">finance@madas.app</a> or use{' '}
                <Link to="/support" className="underline">
                  the support portal
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Finance HQ Access</p>
              <h2 className="mt-2 text-3xl font-bold text-primary">Sign in to continue</h2>
              <p className="mt-2 text-sm text-madas-text/70">
                Use your DIGIX finance credentials. Your access is scoped to the tenant(s) configured by HQ.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="finance@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••"
                />
                <div className="flex justify-between text-xs text-madas-text/60">
                  <Link to="/reset-password" className="font-semibold text-primary hover:text-primary/80">
                    Forgot password?
                  </Link>
                  <span>SSO access coming soon</span>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="rounded-2xl border border-primary/10 bg-white px-5 py-4 text-xs text-madas-text/60">
              <p className="font-semibold text-primary">Security reminder</p>
              <p className="mt-1">
                Access is monitored. Contact DIGIX HQ if you notice any unexpected activity or cannot access your tenant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

