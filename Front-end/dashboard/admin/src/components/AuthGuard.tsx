'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, AdminUser } from '@/lib/authService';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const adminData = await AuthService.checkAdminRole(user);
          if (adminData) {
            setAdminUser(adminData);
            setIsAuthenticated(true);
          } else {
            // User is not an admin, redirect to login
            router.push('/login');
          }
        } else {
          // No user, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        // If there's an error, redirect to login
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, isClient]);

  // Show loading state until client-side hydration is complete
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !adminUser) {
    return null;
  }

  return <>{children}</>;
}
