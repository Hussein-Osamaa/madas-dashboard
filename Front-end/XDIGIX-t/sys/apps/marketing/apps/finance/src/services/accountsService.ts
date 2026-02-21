import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  db
} from '../lib/firebase';
import dayjs from 'dayjs';

type AccountDoc = {
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'other';
  currency: string;
  balance: number;
  status?: 'active' | 'inactive';
  lastReconciledAt?: Timestamp;
};

export const fetchAccounts = async (workspaceId: string, orgId: string) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'accounts');
  const snapshot = await getDocs(query(base, orderBy('name', 'asc')));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as AccountDoc;
    return {
      id: docSnap.id,
      name: data.name,
      type: data.type,
      currency: data.currency,
      balance: data.balance,
      status: data.status ?? 'active',
      lastReconciled: data.lastReconciledAt ? data.lastReconciledAt.toDate() : undefined
    };
  });
};

export const createTransfer = async (
  workspaceId: string,
  orgId: string,
  payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    memo?: string;
    createdAt: Date;
  }
) => {
  const transferRef = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'account_transfers'));
  await setDoc(transferRef, {
    ...payload,
    createdAt: Timestamp.fromDate(payload.createdAt)
  });
  return transferRef.id;
};

export const reconcileAccount = async (
  workspaceId: string,
  orgId: string,
  payload: {
    accountId: string;
    statementBalance: number;
    statementDate: Date;
    notes?: string;
  }
) => {
  const reconciliationRef = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'account_reconciliations'));
  await setDoc(reconciliationRef, {
    ...payload,
    statementDate: Timestamp.fromDate(payload.statementDate),
    createdAt: Timestamp.fromDate(new Date())
  });
  return reconciliationRef.id;
};

export const fetchRecentTransfers = async (workspaceId: string, orgId: string) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'account_transfers');
  const snapshot = await getDocs(query(base, orderBy('createdAt', 'desc'), limit(5)));
  return snapshot.docs.map((docSnap) => docSnap.data());
};

export const computeAccountTotals = (accounts: Awaited<ReturnType<typeof fetchAccounts>>) => {
  const balance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  const bankAccounts = accounts.filter((account) => account.type === 'bank').length;
  const reconciled = accounts.filter((account) => account.lastReconciled).length;
  const reconciledPercentage = accounts.length ? (reconciled / accounts.length) * 100 : 0;

  return {
    balance,
    bankAccounts,
    reconciledPercentage,
    previousBalance: balance * 0.9 // placeholder until historical data is wired
  };
};


