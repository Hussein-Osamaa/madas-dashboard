import { addDoc, collection, db, getDocs, orderBy, query, serverTimestamp } from '../lib/firebase';

export type Warehouse = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
};

const warehousesCollection = (businessId: string) => collection(db, 'businesses', businessId, 'warehouses');

export const fetchWarehouses = async (businessId: string): Promise<Warehouse[]> => {
  if (!businessId) return [];
  const q = query(warehousesCollection(businessId), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<Warehouse, 'id'>;
    return {
      id: docSnap.id,
      ...data
    };
  });
};

export const createWarehouse = async (
  businessId: string,
  payload: Omit<Warehouse, 'id'>
): Promise<void> => {
  await addDoc(warehousesCollection(businessId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

