import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StaffUser } from '../lib/api';
import { getMe, staffLogout } from '../lib/api';

interface StaffAuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  /** Call after successful login so the app has the user without waiting for getMe(). Prevents redirect back to login. */
  setUserFromLogin: (user: StaffUser) => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((data) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await staffLogout();
    setUser(null);
  };

  const setUserFromLogin = (u: StaffUser) => {
    setUser(u);
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
