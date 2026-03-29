import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { auth, onAuthStateChanged, signOut, retryAuth, hasStoredTokens } from '../lib/backend';
import { disconnectDashboardSocket } from '../lib/realtimeSocket';

export type AuthUser = { uid: string; email: string | null; displayName?: string | null; getIdToken: () => Promise<string> };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const MAX_AUTH_RETRIES = 3;

const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: AuthUser | null) => {
      if (currentUser) {
        retryCountRef.current = 0;
        setUser(currentUser);
        setLoading(false);
      } else if (hasStoredTokens() && retryCountRef.current < MAX_AUTH_RETRIES) {
        retryCountRef.current += 1;
        const delay = retryCountRef.current * 1500;
        console.warn(`[AuthProvider] Auth returned null but tokens exist, retrying (${retryCountRef.current}/${MAX_AUTH_RETRIES}) in ${delay}ms`);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryAuth().catch(() => {});
        }, delay);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('digixUser');
    disconnectDashboardSocket();
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      logout
    }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const DEFAULT_AUTH: AuthContextValue = {
  user: null,
  loading: true,
  logout: async () => {}
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? DEFAULT_AUTH;
};

export default AuthProvider;

