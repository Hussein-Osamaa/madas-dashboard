import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, logout as apiLogout, hasStoredToken } from '../lib/api';
import type { ApiUser } from '../lib/api';

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
  setUserFromLogin: (user: ApiUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback((): Promise<void> => {
    if (!hasStoredToken()) {
      setUser(null);
      setLoading(false);
      setError(null);
      return Promise.resolve();
    }
    setLoading(true);
    setError(null);
    return getMe()
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user);
          setError(null);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        setUser(null);
        setError(err instanceof Error ? err.message : 'Failed to load user');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('Authentication timeout. Is the API running?');
      setLoading(false);
    }, 12000);
    loadUser().finally(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, [loadUser]);

  const logout = useCallback(async () => {
    apiLogout();
    setUser(null);
  }, []);

  const setUserFromLogin = useCallback((userData: ApiUser) => {
    setUser(userData);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      logout,
      retry: () => {
        setError(null);
        return loadUser();
      },
      setUserFromLogin,
    }),
    [user, loading, error, logout, loadUser, setUserFromLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
