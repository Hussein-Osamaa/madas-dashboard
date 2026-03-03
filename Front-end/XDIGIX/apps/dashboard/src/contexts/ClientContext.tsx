import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { apiGetList, buildListPath } from '../lib/api';

type Client = { _id: string; brandName?: string };

type ClientContextValue = {
  /** Resolved client id for API scoping: for client role = their clientId; for admin/staff = selectedClientId or undefined (all). */
  effectiveClientId: string | undefined;
  /** Current client for display (brand name). */
  currentClientName: string | null;
  /** All clients (admin/staff only). */
  clients: Client[];
  loadingClients: boolean;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  /** Append clientId to list path when scoping by tenant (admin/staff). */
  withClientScope: (path: string, params?: Record<string, string>) => string;
};

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const isClientRole = user?.role === 'client';
  const clientIdFromUser =
    user?.clientId == null
      ? undefined
      : typeof user.clientId === 'string'
        ? user.clientId
        : user.clientId?._id;

  useEffect(() => {
    if (!user || isClientRole) {
      setClients([]);
      setSelectedClientId(null);
      return;
    }
    setLoadingClients(true);
    apiGetList<Client>('/api/clients')
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [user, isClientRole]);

  const effectiveClientId = useMemo(() => {
    if (isClientRole) return clientIdFromUser;
    if (selectedClientId) return selectedClientId;
    return undefined;
  }, [isClientRole, clientIdFromUser, selectedClientId]);

  const currentClientName = useMemo(() => {
    if (isClientRole && user?.clientId && typeof user.clientId === 'object') {
      return user.clientId.brandName ?? null;
    }
    if (effectiveClientId && clients.length) {
      const c = clients.find((x) => x._id === effectiveClientId);
      return c?.brandName ?? null;
    }
    return null;
  }, [isClientRole, user?.clientId, effectiveClientId, clients]);

  const withClientScope = useCallback(
    (path: string, params?: Record<string, string>) => {
      const p = { ...params };
      if (effectiveClientId) p.clientId = effectiveClientId;
      return buildListPath(path, p);
    },
    [effectiveClientId]
  );

  const value = useMemo<ClientContextValue>(
    () => ({
      effectiveClientId,
      currentClientName,
      clients,
      loadingClients,
      selectedClientId,
      setSelectedClientId,
      withClientScope,
    }),
    [
      effectiveClientId,
      currentClientName,
      clients,
      loadingClients,
      selectedClientId,
      withClientScope,
    ]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}
