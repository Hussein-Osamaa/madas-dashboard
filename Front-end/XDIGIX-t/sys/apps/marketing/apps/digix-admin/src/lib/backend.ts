// Firebase removed. All services now route through the backend adapter.
export {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  retryAuth,
  hasStoredTokens,
} from './backend-adapter';

// Stubs for Firebase-specific APIs that have no backend equivalent
export const app = {};
export const db = {};
export const storage = {};
export const functions = {};
export const httpsCallable = () => () => Promise.resolve({ data: {} });
export const performance = null;
export const analytics = null;
export const trace = () => {};
export const getPerformance = () => null;
export const initializePerformance = () => {};
export const getAnalytics = () => null;
export const initializeAnalytics = () => {};
