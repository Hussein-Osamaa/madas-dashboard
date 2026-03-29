// Firebase removed. All services now route through the backend adapter.
export {
  auth,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from './backend-adapter';

export const db = {};
export const storage = {};
