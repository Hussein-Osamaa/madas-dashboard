'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { StaffInviteService } from '@/modules/staff/inviteService';
import { StaffInvite } from '@/modules/staff/inviteService';

interface StaffInvitePageProps {
  params: {
    token: string;
  };
}

export default function StaffInvitePage({ params }: StaffInvitePageProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<StaffInvite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const validateInvite = async () => {
      try {
        const inviteData = await StaffInviteService.validateInviteToken(params.token);
        
        if (!inviteData) {
          setMessage('Invalid or expired invitation link.');
          setMessageType('error');
          setIsLoading(false);
          return;
        }

        setInvite(inviteData);
        setMessage(`You've been invited to join a business as ${inviteData.role}.`);
        setMessageType('info');
        setIsLoading(false);

      } catch (error) {
        console.error('Error validating invite:', error);
        setMessage('Error validating invitation. Please try again.');
        setMessageType('error');
        setIsLoading(false);
      }
    };

    validateInvite();
  }, [params.token]);

  const handleAcceptInvite = async () => {
    if (!user || !invite) {
      setMessage('You must be logged in to accept the invitation.');
      setMessageType('error');
      return;
    }

    setIsAccepting(true);
    setMessage('');

    try {
      console.log('Accepting staff invite...');
      
      const staffMember = await StaffInviteService.acceptInvite(params.token, user.uid);
      
      console.log('Staff invite accepted successfully:', staffMember);
      setMessage('Invitation accepted! Redirecting to your dashboard...');
      setMessageType('success');

      // Redirect to business dashboard
      setTimeout(() => {
        router.push(`/pages/dashboard/${staffMember.businessId}`);
      }, 2000);

    } catch (error) {
      console.error('Error accepting invite:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to accept invitation');
      setMessageType('error');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    router.push(`/login?redirect=/staff-invite/${params.token}`);
  };

  const handleSignup = () => {
    router.push(`/signup?redirect=/staff-invite/${params.token}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Invalid Invitation
            </h2>
            <p className="text-lg text-gray-600">
              This invitation link is invalid or has expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Staff Invitation
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            You've been invited to join a business team
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invitation Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{invite.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize">{invite.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600 capitalize">{invite.status}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-md p-4 ${
            messageType === 'success' ? 'bg-green-50 text-green-700' :
            messageType === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {messageType === 'success' ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : messageType === 'error' ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!user ? (
          <div className="space-y-4">
            <p className="text-center text-gray-600">
              You need to be logged in to accept this invitation.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleLogin}
                className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Login
              </button>
              <button
                onClick={handleSignup}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleAcceptInvite}
              disabled={isAccepting}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting Invitation...
                </div>
              ) : (
                'Accept Invitation'
              )}
            </button>
          </div>
        )}

        {/* Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            This invitation will expire in 7 days from when it was sent.
          </p>
        </div>
      </div>
    </div>
  );
}
