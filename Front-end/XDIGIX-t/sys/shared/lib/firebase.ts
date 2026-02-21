import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp as FirestoreTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
  authDomain: 'madas-store.firebaseapp.com',
  projectId: 'madas-store',
  storageBucket: 'madas-store.firebasestorage.app',
  messagingSenderId: '527071300010',
  appId: '1:527071300010:web:7470e2204065b4590583d3',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export Firestore helpers for rbacService and other shared modules
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
};
export const Timestamp = FirestoreTimestamp;

export default app;

