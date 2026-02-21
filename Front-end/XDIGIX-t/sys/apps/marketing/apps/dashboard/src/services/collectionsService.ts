import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from '../lib/firebase';

export type CollectionStatus = 'active' | 'draft' | 'archived';
export type CollectionType = 'manual' | 'smart';

export type CollectionRules = {
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: string;
  tags?: string;
  vendor?: string;
  dateAdded?: string;
  salesPerformance?: string;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  status: CollectionStatus;
  type: CollectionType;
  productIds?: string[];
  productCount?: number;
  rules?: CollectionRules;
  coverColor?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CollectionDraft = Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

type FirestoreCollection = Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
};

const collectionsRef = (businessId: string) => collection(db, 'businesses', businessId, 'collections');

const sanitize = <T extends Record<string, unknown>>(input: T): T => {
  const output: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      output[key] = value;
    }
  });
  return output as T;
};

const normalizeCollection = (docId: string, data: FirestoreCollection): Collection => {
  const { createdAt, updatedAt, ...rest } = data;

  return {
    id: docId,
    ...rest,
    createdAt: createdAt?.toDate ? createdAt.toDate() : (createdAt as unknown as Date | undefined),
    updatedAt: updatedAt?.toDate ? updatedAt.toDate() : (updatedAt as unknown as Date | undefined)
  };
};

export const fetchCollections = async (businessId: string): Promise<Collection[]> => {
  const q = query(collectionsRef(businessId), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => normalizeCollection(docSnap.id, docSnap.data() as FirestoreCollection));
};

export const getCollection = async (businessId: string, collectionId: string): Promise<Collection | null> => {
  const collectionDoc = await getDoc(doc(db, 'businesses', businessId, 'collections', collectionId));

  if (!collectionDoc.exists()) {
    return null;
  }

  return normalizeCollection(collectionDoc.id, collectionDoc.data() as FirestoreCollection);
};

export const createCollection = async (
  businessId: string,
  payload: Omit<CollectionDraft, 'id'>
): Promise<string> => {
  const now = serverTimestamp();
  const defaultStatus: CollectionStatus = payload.status ?? 'draft';
  const defaultType: CollectionType = payload.type ?? 'manual';
  const productIds = payload.productIds ?? [];

  const docRef = await addDoc(
    collectionsRef(businessId),
    sanitize({
      ...payload,
      status: defaultStatus,
      type: defaultType,
      productIds,
      productCount: payload.productCount ?? productIds.length,
      createdAt: now,
      updatedAt: now
    })
  );

  return docRef.id;
};

export const updateCollection = async (
  businessId: string,
  collectionId: string,
  payload: Partial<Omit<CollectionDraft, 'id'>>
): Promise<void> => {
  const updateData = sanitize({
    ...payload,
    productCount:
      payload.productCount ??
      (payload.productIds ? payload.productIds.length : undefined),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'businesses', businessId, 'collections', collectionId), updateData);
};

export const deleteCollection = async (businessId: string, collectionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'businesses', businessId, 'collections', collectionId));
};

