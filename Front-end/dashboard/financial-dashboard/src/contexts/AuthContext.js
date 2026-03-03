import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChange,
  getUserData,
  hasPermission,
} from "../firebase/auth";
import { USER_ROLES } from "../firebase/auth";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      try {
        setLoading(true);
        setError(null);

        if (firebaseUser) {
          setUser(firebaseUser);

          // Get additional user data from Firestore
          const result = await getUserData(firebaseUser.uid);
          if (result.success) {
            setUserData(result.data);
          } else {
            setError(result.error);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: userData?.role === USER_ROLES.ADMIN,
    isManager: userData?.role === USER_ROLES.MANAGER,
    isViewer: userData?.role === USER_ROLES.VIEWER,
    hasPermission: (requiredRole) =>
      hasPermission(userData?.role, requiredRole),
    userRole: userData?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
