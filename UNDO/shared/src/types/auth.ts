import { User as FirebaseUser } from 'firebase/auth';

export interface AuthUser extends FirebaseUser {
  // Additional custom properties can be added here
  customClaims?: {
    role?: 'admin' | 'user';
    subscription?: string;
    [key: string]: any;
  };
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface AuthError {
  code: string;
  message: string;
}
