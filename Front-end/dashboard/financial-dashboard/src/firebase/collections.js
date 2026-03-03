import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  SALES: 'sales',
  EXPENSES: 'expenses',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  REPORTS: 'reports'
};

// Sales Collection
export const salesCollection = collection(db, COLLECTIONS.SALES);

export const addSale = async (saleData) => {
  try {
    const docRef = await addDoc(salesCollection, {
      ...saleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateSale = async (saleId, saleData) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.SALES, saleId), {
      ...saleData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteSale = async (saleId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SALES, saleId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSales = async (filters = {}) => {
  try {
    let q = query(salesCollection, orderBy('createdAt', 'desc'));
    
    if (filters.startDate) {
      q = query(q, where('createdAt', '>=', filters.startDate));
    }
    if (filters.endDate) {
      q = query(q, where('createdAt', '<=', filters.endDate));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const snapshot = await getDocs(q);
    const sales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Expenses Collection
export const expensesCollection = collection(db, COLLECTIONS.EXPENSES);

export const addExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(expensesCollection, {
      ...expenseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateExpense = async (expenseId, expenseData) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.EXPENSES, expenseId), {
      ...expenseData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.EXPENSES, expenseId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getExpenses = async (filters = {}) => {
  try {
    let q = query(expensesCollection, orderBy('createdAt', 'desc'));
    
    if (filters.startDate) {
      q = query(q, where('createdAt', '>=', filters.startDate));
    }
    if (filters.endDate) {
      q = query(q, where('createdAt', '<=', filters.endDate));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: expenses };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Inventory Collection
export const inventoryCollection = collection(db, COLLECTIONS.INVENTORY);

export const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(inventoryCollection, {
      ...itemData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateInventoryItem = async (itemId, itemData) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.INVENTORY, itemId), {
      ...itemData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getInventory = async () => {
  try {
    const q = query(inventoryCollection, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const inventory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: inventory };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Customers Collection
export const customersCollection = collection(db, COLLECTIONS.CUSTOMERS);

export const addCustomer = async (customerData) => {
  try {
    const docRef = await addDoc(customersCollection, {
      ...customerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCustomers = async () => {
  try {
    const q = query(customersCollection, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: customers };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Real-time listeners
export const subscribeToSales = (callback, filters = {}) => {
  let q = query(salesCollection, orderBy('createdAt', 'desc'));
  
  if (filters.startDate) {
    q = query(q, where('createdAt', '>=', filters.startDate));
  }
  if (filters.endDate) {
    q = query(q, where('createdAt', '<=', filters.endDate));
  }
  
  return onSnapshot(q, (snapshot) => {
    const sales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(sales);
  });
};

export const subscribeToExpenses = (callback, filters = {}) => {
  let q = query(expensesCollection, orderBy('createdAt', 'desc'));
  
  if (filters.startDate) {
    q = query(q, where('createdAt', '>=', filters.startDate));
  }
  if (filters.endDate) {
    q = query(q, where('createdAt', '<=', filters.endDate));
  }
  if (filters.category) {
    q = query(q, where('category', '==', filters.category));
  }
  
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(expenses);
  });
};
