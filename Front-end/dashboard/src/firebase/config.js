// Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
