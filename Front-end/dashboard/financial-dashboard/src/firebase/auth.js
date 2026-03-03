import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";

// User roles
export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  VIEWER: "viewer",
};

// Create user with role
export const createUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update user profile
    await updateProfile(user, {
      displayName: userData.name,
    });

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: userData.name,
      role: userData.role || USER_ROLES.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign in user
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get user data from Firestore
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update user data
export const updateUserData = async (uid, userData) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...userData,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update password
export const updateUserPassword = async (newPassword) => {
  try {
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Check if user has permission
export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    [USER_ROLES.VIEWER]: 1,
    [USER_ROLES.MANAGER]: 2,
    [USER_ROLES.ADMIN]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
