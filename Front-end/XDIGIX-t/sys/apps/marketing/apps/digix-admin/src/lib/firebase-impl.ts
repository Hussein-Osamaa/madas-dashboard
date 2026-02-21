/** Firebase SDK - used when VITE_API_BACKEND_URL is not set */
import { initializeApp, getApps } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendPasswordReset,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
  authDomain: 'madas-store.firebaseapp.com',
  projectId: 'madas-store',
  storageBucket: 'madas-store.firebasestorage.app',
  messagingSenderId: '527071300010',
  appId: '1:527071300010:web:7470e2204065b4590583d3',
  measurementId: 'G-NQVR1F4N3Q'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

if (typeof window !== 'undefined') {
  (window as any).__FIREBASE_DB__ = db;
  (window as any).__FIREBASE_AUTH__ = auth;
  (window as any).__FIREBASE_APP__ = app;
}

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectStorageEmulator(storage, 'localhost', 9199);
}

export {
  app,
  auth,
  db,
  storage,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  ref,
  uploadBytes,
  getDownloadURL,
  fbSignIn as signInWithEmailAndPassword,
  fbCreateUser as createUserWithEmailAndPassword,
  fbSignOut as signOut,
  fbSendPasswordReset as sendPasswordResetEmail,
  fbOnAuthStateChanged as onAuthStateChanged
};
