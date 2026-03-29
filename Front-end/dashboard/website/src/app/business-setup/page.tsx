'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp, auth, db } from '@/lib/backend';
import { createBusiness } from '@/modules/business/createBusiness';

export default function BusinessSetupPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    plan: 'Starter' as 'Starter' | 'Pro' | 'Enterprise'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  // Check authentication and user data on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          // Get user document
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserData(userData);
            
            // If user already has a business, redirect to dashboard
            if (userData.businessId) {
              router.push(`/pages/dashboard/${userData.businessId}`);
              return;
            }
          } else {
            // Create fail-safe user document if it doesn't exist
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              businessId: null,
              role: 'owner',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setUserData({
              uid: user.uid,
              email: user.email,
              businessId: null,
              role: 'owner'
            });
          }
        } catch (error) {
          console.error('Error checking user data:', error);
          setError('Error loading user data. Please try again.');
        }
      } else {
        // No user logged in, redirect to login
        router.push('/login');
        return;
      }
      
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.businessName || !formData.ownerName) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.businessName.length < 2) {
      setError('Business name must be at least 2 characters long');
      return false;
    }

    if (formData.ownerName.length < 2) {
      setError('Owner name must be at least 2 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to create a business');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting business creation process...');
      
      // Generate business ID (using user's UID for simplicity)
      const businessId = currentUser.uid;

      // Create business document
      await createBusiness(businessId, {
        ownerUid: currentUser.uid,
        businessName: formData.businessName,
        plan: formData.plan,
        staff: []
      });
      console.log('Business created:', businessId);

      // Update user document with businessId
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        businessId: businessId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('User document updated with businessId');

      setSuccess('Business created successfully! Redirecting to your dashboard...');

      // Redirect to business dashboard
      setTimeout(() => {
        router.push(`/pages/dashboard/${businessId}`);
      }, 2000);

    } catch (error) {
      console.error('Business creation error:', error);
      
      let errorMessage = 'Failed to create business. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">You must be logged in to access this page.</p>
          <a href="/login" className="text-indigo-600 hover:text-indigo-500">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete your business setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your business profile to get started
          </p>
          {userData?.email && (
            <p className="mt-1 text-center text-xs text-gray-500">
              Logged in as: {userData.email}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Business Name */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                Business Name *
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={handleInputChange}
              />
            </div>

            {/* Owner Name */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">
                Owner Full Name *
              </label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
                value={formData.ownerName}
                onChange={handleInputChange}
              />
            </div>

            {/* Plan Selection */}
            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                Plan *
              </label>
              <select
                id="plan"
                name="plan"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.plan}
                onChange={handleInputChange}
              >
                <option value="Starter">Starter - $29/month</option>
                <option value="Pro">Pro - $79/month</option>
                <option value="Enterprise">Enterprise - $199/month</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Business...
                </div>
              ) : (
                'Create Business'
              )}
            </button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Want to use a different account?{' '}
              <button
                type="button"
                onClick={() => {
                  auth.signOut();
                  router.push('/login');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign out and login
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}