/**
 * Firebase / Backend API - Uses compatibility adapter when VITE_API_BACKEND_URL is set.
 * Otherwise uses Firebase SDK.
 */
import * as backendApi from './backend-adapter';
import * as firebaseApi from './firebase-impl';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;
const api = useBackend ? backendApi : firebaseApi;

export const app = (api as typeof firebaseApi).app ?? {};
export const auth = api.auth;
export const db = (api as typeof firebaseApi).db ?? (api as typeof backendApi);
export const storage = (api as typeof firebaseApi).storage ?? api;
export const functions = (api as typeof firebaseApi).functions ?? {};
export const doc = api.doc;
export const getDoc = api.getDoc;
export const getDocs = api.getDocs;
export const setDoc = api.setDoc;
export const updateDoc = api.updateDoc;
export const collection = api.collection;
export const addDoc = api.addDoc;
export const deleteDoc = api.deleteDoc;
export const query = api.query;
export const where = api.where;
export const orderBy = api.orderBy;
export const limit = api.limit;
export const signInWithEmailAndPassword = api.signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = api.createUserWithEmailAndPassword;
export const signOut = api.signOut;
export const onAuthStateChanged = api.onAuthStateChanged;
export const sendPasswordResetEmail = api.sendPasswordResetEmail;
export const serverTimestamp = api.serverTimestamp;
export const onSnapshot = api.onSnapshot;
export const Timestamp = api.Timestamp;
export const arrayUnion = api.arrayUnion;
export const arrayRemove = api.arrayRemove;
export const writeBatch = api.writeBatch;
export const ref = api.ref;
export const uploadBytes = api.uploadBytes;
export const getDownloadURL = api.getDownloadURL;

// Firebase-specific (stubs for backend)
export const httpsCallable = useBackend
  ? () => () => Promise.resolve({ data: {} })
  : (api as typeof firebaseApi).httpsCallable;
export const performance = useBackend ? null : (api as typeof firebaseApi).performance;
export const analytics = useBackend ? null : (api as typeof firebaseApi).analytics;
export const trace = useBackend ? () => {} : (api as typeof firebaseApi).trace;
export const getPerformance = useBackend ? () => null : (api as typeof firebaseApi).getPerformance;
export const initializePerformance = useBackend ? () => {} : (api as typeof firebaseApi).initializePerformance;
export const getAnalytics = useBackend ? () => null : (api as typeof firebaseApi).getAnalytics;
export const initializeAnalytics = useBackend ? () => {} : (api as typeof firebaseApi).initializeAnalytics;
