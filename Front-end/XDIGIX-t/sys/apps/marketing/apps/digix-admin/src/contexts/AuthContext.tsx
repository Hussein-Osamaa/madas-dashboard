import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { auth, onAuthStateChanged, signOut } from '../lib/firebase';

export type AuthUser = { uid: string; email: string | null; displayName?: string | null; getIdToken: () => Promise<string> };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a timeout in case auth state never resolves (e.g., unauthorized domain)
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('[AuthContext] Auth state timeout - domain may not be authorized');
        setError('Authentication timeout. Please check your connection.');
        setLoading(false);
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      setLoading(false);
      setError(null);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      logout
    }),
    [user, loading, error, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const DEFAULT_AUTH: AuthContextValue = {
  user: null,
  loading: true,
  error: null,
  logout: async () => {}
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? DEFAULT_AUTH;
};

export default AuthProvider;

