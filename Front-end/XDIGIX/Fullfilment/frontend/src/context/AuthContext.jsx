import { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'fulfilment-auth';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveStored(data) {
  try {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStored);

  const value = useMemo(
    () => ({
      role: auth?.role ?? null,
      clientId: auth?.clientId ?? null,
      clientName: auth?.clientName ?? null,
      login: (role, data) => {
        const next = { role, ...data };
        setAuth(next);
        saveStored(next);
      },
      logout: () => {
        setAuth(null);
        saveStored(null);
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
