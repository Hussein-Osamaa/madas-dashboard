/** Firebase SDK - used when VITE_API_BACKEND_URL is not set */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
  setPersistence as fbSetPersistence,
  browserLocalPersistence as fbBrowserLocalPersistence,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  collection,
  Timestamp
} from 'firebase/firestore';

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

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export {
  app,
  db,
  auth,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  collection,
  Timestamp,
  fbSignIn as signInWithEmailAndPassword,
  fbSignOut as signOut,
  fbSetPersistence as setPersistence,
  fbBrowserLocalPersistence as browserLocalPersistence,
  fbOnAuthStateChanged as onAuthStateChanged
};
