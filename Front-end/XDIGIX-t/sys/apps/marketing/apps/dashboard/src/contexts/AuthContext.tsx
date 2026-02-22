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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('digixUser');
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

