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
} from '../../lib/firebase';

type AccountDoc = {
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'other';
  currency: string;
  balance: number;
  status?: 'active' | 'inactive';
  lastReconciledAt?: Timestamp;
};

const accountsCollection = (businessId: string) => collection(db, 'businesses', businessId, 'finance_accounts');
const transfersCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'finance_account_transfers');
const reconciliationsCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'finance_account_reconciliations');

export const fetchAccounts = async (businessId: string) => {
  const snapshot = await getDocs(query(accountsCollection(businessId), orderBy('name', 'asc')));
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
  businessId: string,
  payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    memo?: string;
    createdAt: Date;
  }
) => {
  const transferRef = doc(transfersCollection(businessId));
  await setDoc(transferRef, {
    ...payload,
    createdAt: Timestamp.fromDate(payload.createdAt)
  });
  return transferRef.id;
};

export const reconcileAccount = async (
  businessId: string,
  payload: {
    accountId: string;
    statementBalance: number;
    statementDate: Date;
    notes?: string;
  }
) => {
  const reconciliationRef = doc(reconciliationsCollection(businessId));
  await setDoc(reconciliationRef, {
    ...payload,
    statementDate: Timestamp.fromDate(payload.statementDate),
    createdAt: Timestamp.fromDate(new Date())
  });
  return reconciliationRef.id;
};

export const fetchRecentTransfers = async (businessId: string) => {
  const snapshot = await getDocs(query(transfersCollection(businessId), orderBy('createdAt', 'desc'), limit(5)));
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

