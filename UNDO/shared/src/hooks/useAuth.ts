import { useState, useEffect, useCallback } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthState, LoginCredentials, RegisterCredentials } from '../types';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({
        user: user as FirebaseUser,
        loading: false,
        error: null,
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { user } = await createUserWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      await updateProfile(user, {
        displayName: `${credentials.firstName} ${credentials.lastName}`,
      });
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await signOut(auth);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await sendPasswordResetEmail(auth, email);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    resetPassword,
    clearError,
  };
};
