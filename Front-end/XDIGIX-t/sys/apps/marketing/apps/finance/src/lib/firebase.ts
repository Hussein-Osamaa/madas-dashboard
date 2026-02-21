/**
 * Firebase / Backend API - Uses compatibility adapter when VITE_API_BACKEND_URL is set.
 * Exports use 'any' assertions for compatibility with Firebase-typed consumers when using backend.
 */
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import * as backendApi from './backend-adapter';
import * as firebaseApi from './firebase-impl';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;
const api = useBackend ? backendApi : firebaseApi;

export const db = api.db as any;
export const auth = api.auth as any;
export const doc = api.doc as any;
export const getDoc = api.getDoc;
export const getDocs = api.getDocs;
export const setDoc = api.setDoc;
export const query = api.query as any;
export const where = api.where;
export const orderBy = api.orderBy;
export const limit = api.limit;
export const collection = api.collection as any;
export const Timestamp = api.Timestamp;
export type Timestamp = FirestoreTimestamp;
export const signInWithEmailAndPassword = api.signInWithEmailAndPassword;
export const signOut = api.signOut;
export const onAuthStateChanged = api.onAuthStateChanged as any;
export const setPersistence = api.setPersistence as any;
export const browserLocalPersistence = api.browserLocalPersistence as any;
