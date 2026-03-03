'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/authService';
import { Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const user = await AuthService.getCurrentUser();
      if (user) {
        const adminData = await AuthService.checkAdminRole(user);
        if (adminData) {
          router.push('/users');
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await AuthService.signIn(email, password);
      const adminData = await AuthService.checkAdminRole(user);
      
      if (adminData) {
        router.push('/users');
      } else {
        setError('Access denied. Admin privileges required.');
        await AuthService.signOut();
      }
    } catch (error: any) {
      if (error.message.includes('invalid-credential') || error.message.includes('user-not-found')) {
        setError('User not found. Would you like to create an admin user?');
        setShowCreateUser(true);
      } else {
        setError(error.message || 'Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Import Firebase functions dynamically
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { auth, db } = await import('@/lib/firebase');

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create staff document with admin role
      const staffData = {
        email: email,
        role: 'admin',
        approved: true,
        permissions: {
          home: ['view'],
          orders: ['view', 'search', 'create', 'edit'],
          inventory: ['view', 'edit'],
          customers: ['view', 'edit'],
          employees: ['view', 'edit'],
          finance: ['view', 'reports'],
          analytics: ['view', 'export'],
          settings: ['view', 'edit']
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'staff', user.uid), staffData);

      setError('');
      setShowCreateUser(false);
      alert('✅ Admin user created successfully! You can now sign in.');
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please try signing in instead.');
        setShowCreateUser(false);
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(`Failed to create user: ${error.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin panel
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
            
            {showCreateUser && (
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={isCreating}
                className="group relative w-full flex justify-center py-2 px-4 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Create Admin User
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
