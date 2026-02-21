/**
 * MongoDB Backend API - digix-admin uses backend only (no Firebase)
 */
import * as backendApi from './backend-adapter';
import * as firebaseApi from './firebase-impl';

const useBackend = true;
const api = useBackend ? backendApi : firebaseApi;

export const app = (api as typeof firebaseApi).app ?? {};
export const auth = api.auth;
export const db = (api as typeof firebaseApi).db ?? {};
export const storage = api.storage ?? api;
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
export const serverTimestamp = api.serverTimestamp;
export const onSnapshot = api.onSnapshot;
export const Timestamp = api.Timestamp;
export const arrayUnion = api.arrayUnion;
export const arrayRemove = api.arrayRemove;
export const writeBatch = api.writeBatch;
export const ref = api.ref;
export const uploadBytes = api.uploadBytes;
export const getDownloadURL = api.getDownloadURL;
export const signInWithEmailAndPassword = api.signInWithEmailAndPassword;
export const signInAdmin = useBackend ? backendApi.signInAdmin : undefined;
export const createUserWithEmailAndPassword = api.createUserWithEmailAndPassword;
export const signOut = api.signOut;
export const onAuthStateChanged = api.onAuthStateChanged;
export const sendPasswordResetEmail = api.sendPasswordResetEmail ?? (() => Promise.reject(new Error('Not available')));
