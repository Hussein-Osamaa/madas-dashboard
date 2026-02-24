import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StaffUser } from '../lib/api';
import { getMe, staffLogout, getCachedUser, setCachedUser, clearTokens } from '../lib/api';

interface StaffAuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  /** Call after successful login so the app has the user without waiting for getMe(). Prevents redirect back to login. */
  setUserFromLogin: (user: StaffUser) => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(() => getCachedUser());
  const [loading, setLoading] = useState(() => !getCachedUser());

  useEffect(() => {
    getMe()
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setCachedUser(data.user);
        } else {
          clearTokens();
          setCachedUser(null);
          setUser(null);
        }
      })
      .catch(() => {
        clearTokens();
        setCachedUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    setCachedUser(null);
    await staffLogout();
    setUser(null);
  };

  const setUserFromLogin = (u: StaffUser) => {
    setUser(u);
    setCachedUser(u);
    setLoading(false);
  };

  return (
    <StaffAuthContext.Provider value={{ user, loading, logout, setUserFromLogin }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

const DEFAULT_STAFF_AUTH: StaffAuthContextValue = {
  user: null,
  loading: true,
  logout: async () => {},
  setUserFromLogin: () => {}
};

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  return ctx ?? DEFAULT_STAFF_AUTH;
}
