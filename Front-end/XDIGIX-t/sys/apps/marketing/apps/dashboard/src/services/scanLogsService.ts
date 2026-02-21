import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from '../lib/firebase';

export type ScanLogType = 'order' | 'return' | 'status_update';

export type ScanLog = {
  id: string;
  barcode: string;
  productId: string;
  productName?: string;
  size?: string | null;
  type: ScanLogType;
  previousStock?: number;
  newStock?: number;
  price?: number;
  timestamp?: Date;
  user?: string | null;
  userId?: string | null;
};

export type ScanLogDraft = Omit<ScanLog, 'id' | 'timestamp'> & {
  timestamp?: Date;
};

type FirestoreScanLog = Omit<ScanLog, 'id' | 'timestamp'> & {
  timestamp?: { toDate: () => Date } | Date | string;
};

const scanLogCollection = (businessId: string) => collection(db, 'businesses', businessId, 'scan_log');

const normalizeTimestamp = (value: FirestoreScanLog['timestamp']): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return undefined;
};

const normalizeScanLog = (id: string, data: FirestoreScanLog): ScanLog => {
  const { timestamp, ...rest } = data;
  return {
    id,
    ...rest,
    timestamp: normalizeTimestamp(timestamp)
  };
};

export const fetchScanLogs = async (businessId: string, max = 200): Promise<ScanLog[]> => {
  const q = query(scanLogCollection(businessId), orderBy('timestamp', 'desc'), limit(max));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeScanLog(docSnap.id, docSnap.data() as FirestoreScanLog));
};

export const createScanLog = async (businessId: string, payload: ScanLogDraft) => {
  await addDoc(scanLogCollection(businessId), {
    ...payload,
    timestamp: payload.timestamp ?? serverTimestamp()
  });
};

export const deleteScanLog = async (businessId: string, scanLogId: string) => {
  await deleteDoc(doc(db, 'businesses', businessId, 'scan_log', scanLogId));
};

export const deleteScanLogs = async (businessId: string, scanLogIds: string[]) => {
  await Promise.all(scanLogIds.map((scanLogId) => deleteScanLog(businessId, scanLogId)));
};

export const clearScanLogs = async (businessId: string) => {
  const snapshot = await getDocs(scanLogCollection(businessId));
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};


