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

export type CustomerStatus = 'active' | 'inactive' | 'vip';

export type AddressDetails = {
  line?: string;
  addressLine2?: string;
  neighborhood?: string;
  governorate?: string;
  district?: string;
  country?: string;
  postalCode?: string;
  addressClarification?: string;
  latitude?: string;
  longitude?: string;
  apartment?: string;
  floor?: string;
  building?: string;
};

export type Customer = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: CustomerStatus;
  orderCount: number;
  activeOrders?: number;
  canceledOrders?: number;
  totalSpent: number;
  pendingAmount?: number;
  avgOrderValue?: number;
  lastOrder?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  addressDetails?: AddressDetails;
};

export type CustomerDraft = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'lastOrder'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastOrder?: Date;
};

type FirestoreCustomer = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'lastOrder'> & {
  createdAt?: { toDate: () => Date } | Date | string;
  updatedAt?: { toDate: () => Date } | Date | string;
  lastOrder?: { toDate: () => Date } | Date | string;
};

const customersCollection = (businessId: string) => collection(db, 'businesses', businessId, 'customers');

const parseDate = (value: FirestoreCustomer['createdAt']): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return undefined;
};

const sanitize = <T extends Record<string, unknown>>(input: T): T => {
  const output: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      output[key] = value;
    }
  });
  return output as T;
};

const normalizeCustomer = (id: string, data: FirestoreCustomer): Customer => {
  const { createdAt, updatedAt, lastOrder, ...rest } = data;
  return {
    id,
    ...rest,
    createdAt: parseDate(createdAt),
    updatedAt: parseDate(updatedAt),
    lastOrder: parseDate(lastOrder)
  };
};

export const fetchCustomers = async (businessId: string): Promise<Customer[]> => {
  const q = query(customersCollection(businessId), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeCustomer(docSnap.id, docSnap.data() as FirestoreCustomer));
};

export const getCustomer = async (businessId: string, customerId: string): Promise<Customer | null> => {
  const docRef = doc(db, 'businesses', businessId, 'customers', customerId);
  const customerDoc = await getDoc(docRef);
  if (!customerDoc.exists()) {
    return null;
  }
  return normalizeCustomer(customerDoc.id, customerDoc.data() as FirestoreCustomer);
};

export const createCustomer = async (
  businessId: string,
  payload: Omit<CustomerDraft, 'id'>
): Promise<string> => {
  const now = serverTimestamp();
  const docRef = await addDoc(
    customersCollection(businessId),
    sanitize({
      ...payload,
      status: payload.status ?? 'active',
      orderCount: payload.orderCount ?? 0,
      totalSpent: payload.totalSpent ?? 0,
      createdAt: payload.createdAt ?? now,
      updatedAt: payload.updatedAt ?? now,
      lastOrder: payload.lastOrder ?? now
    })
  );
  return docRef.id;
};

export const updateCustomer = async (
  businessId: string,
  customerId: string,
  payload: Partial<CustomerDraft>
): Promise<void> => {
  await updateDoc(
    doc(db, 'businesses', businessId, 'customers', customerId),
    sanitize({
      ...payload,
      updatedAt: serverTimestamp()
    })
  );
};

export const deleteCustomer = async (businessId: string, customerId: string): Promise<void> => {
  await deleteDoc(doc(db, 'businesses', businessId, 'customers', customerId));
};

/**
 * Check if a customer with the given phone or email already exists
 */
export const checkDuplicateCustomer = async (
  businessId: string,
  phone?: string,
  email?: string
): Promise<{ isDuplicate: boolean; field?: 'phone' | 'email'; existingCustomer?: Customer }> => {
  if (!phone && !email) {
    return { isDuplicate: false };
  }

  const customers = await fetchCustomers(businessId);
  
  // Check phone duplicate
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    const existingByPhone = customers.find(c => {
      if (!c.phone) return false;
      const existingNormalized = c.phone.replace(/\D/g, '');
      return existingNormalized === normalizedPhone || 
             existingNormalized.endsWith(normalizedPhone) ||
             normalizedPhone.endsWith(existingNormalized);
    });
    if (existingByPhone) {
      return { isDuplicate: true, field: 'phone', existingCustomer: existingByPhone };
    }
  }
  
  // Check email duplicate
  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingByEmail = customers.find(c => 
      c.email?.toLowerCase().trim() === normalizedEmail
    );
    if (existingByEmail) {
      return { isDuplicate: true, field: 'email', existingCustomer: existingByEmail };
    }
  }
  
  return { isDuplicate: false };
};

