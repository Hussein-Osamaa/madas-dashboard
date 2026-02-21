import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from '../../lib/firebase';

const SetupPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL Parameters
  const email = searchParams.get('email') || '';
  const businessName = searchParams.get('business') || '';
  const businessId = searchParams.get('businessId') || '';
  const role = searchParams.get('role') || 'staff';
  const invitationId = searchParams.get('invitation') || '';
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  
  // Password strength
  const [strength, setStrength] = useState({ level: 0, text: '', color: '' });

  useEffect(() => {
    if (!email || !businessName || !role) {
      setError('Invalid invitation link. Please contact your administrator.');
    }
  }, [email, businessName, role]);

  const checkPasswordStrength = (pwd: string) => {
    let level = 0;
    const feedback: string[] = [];

    if (pwd.length >= 8) level++;
    else feedback.push('at least 8 characters');

    if (/[A-Z]/.test(pwd)) level++;
    else feedback.push('uppercase letter');

    if (/[a-z]/.test(pwd)) level++;
    else feedback.push('lowercase letter');

    if (/[0-9]/.test(pwd)) level++;
    else feedback.push('number');

    if (/[^A-Za-z0-9]/.test(pwd)) level++;
    else feedback.push('special character');

    if (level <= 2) {
      setStrength({ level, text: `Weak. Add: ${feedback.slice(0, 2).join(', ')}`, color: 'bg-red-500' });
    } else if (level <= 3) {
      setStrength({ level, text: `Medium. Add: ${feedback.slice(0, 1).join(', ')}`, color: 'bg-yellow-500' });
    } else {
      setStrength({ level, text: 'Strong password!', color: 'bg-green-500' });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordError('');
    if (pwd.length > 0) {
      checkPasswordStrength(pwd);
    }
  };

  const validateForm = () => {
    let isValid = true;
    setPasswordError('');
    setConfirmError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const getDefaultPermissions = (userRole: string) => {
    const basePermissions = {
      dashboard: true,
      orders: true,
      products: true,
      customers: true
    };

    switch (userRole.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return {
          ...basePermissions,
          staff: true,
          orders_manage: true,
          products_manage: true,
          customers_manage: true,
          analytics: true,
          reports: true,
          settings: true,
          finance: true,
          all: true
        };
      case 'manager':
        return {
          ...basePermissions,
          orders_manage: true,
          products_manage: true,
          customers_manage: true,
          analytics: true,
          reports: true
        };
      case 'cashier':
        return {
          dashboard: true,
          orders: true,
          products: true
        };
      default:
        return basePermissions;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      // Create Firebase Auth user
      console.log('🔐 Creating Firebase Auth user for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Firebase Auth user created:', user.uid);

      let finalBusinessId = businessId;

      if (!finalBusinessId) {
        // Fallback: Find business by name
        console.log('⚠️ No businessId provided, searching by business name...');
        const businessesQuery = query(collection(db, 'businesses'), where('businessName', '==', businessName));
        const businessesSnapshot = await getDocs(businessesQuery);

        if (!businessesSnapshot.empty) {
          finalBusinessId = businessesSnapshot.docs[0].id;
          console.log('✅ Found business by name:', finalBusinessId);
        } else {
          throw new Error('Business not found. Please contact your administrator.');
        }
      }

      // Find staff invitation to get permissions
      let inviteData: any = null;
      let inviteDocId: string | null = null;

      // Check staffInvites collection
      const invitesRef = collection(db, 'businesses', finalBusinessId, 'staffInvites');
      const invitesQuery = query(invitesRef, where('email', '==', email.toLowerCase()));
      const invitesSnapshot = await getDocs(invitesQuery);

      if (!invitesSnapshot.empty) {
        inviteDocId = invitesSnapshot.docs[0].id;
        inviteData = invitesSnapshot.docs[0].data();
        console.log('✅ Found staff invitation:', inviteData);

        // Update invite status
        await updateDoc(doc(db, 'businesses', finalBusinessId, 'staffInvites', inviteDocId), {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          acceptedBy: user.uid
        });
      } else {
        // Check staff collection (new invitation format)
        const staffRef = collection(db, 'businesses', finalBusinessId, 'staff');
        const staffQuery = query(staffRef, where('email', '==', email.toLowerCase()));
        const staffSnapshot = await getDocs(staffQuery);

        if (!staffSnapshot.empty) {
          inviteDocId = staffSnapshot.docs[0].id;
          inviteData = staffSnapshot.docs[0].data();
          console.log('✅ Found staff record:', inviteData);
        }
      }

      // Build staff data
      const staffName = inviteData?.name || email.split('@')[0];
      const staffRole = inviteData?.role || role || 'staff';
      const staffPermissions = inviteData?.permissions || getDefaultPermissions(staffRole);
      const staffFirstName = inviteData?.firstName || '';
      const staffLastName = inviteData?.lastName || '';
      const staffPhone = inviteData?.phone || inviteData?.phoneNumber || null;

      // Create user profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        name: staffName,
        businessId: finalBusinessId,
        businessName: businessName,
        role: staffRole,
        createdAt: new Date(),
        isActive: true,
        setupCompleted: true
      });

      // Create/update staff record using user.uid as ID
      const staffDocRef = doc(db, 'businesses', finalBusinessId, 'staff', user.uid);
      await setDoc(staffDocRef, {
        email: email.toLowerCase(),
        name: staffName,
        firstName: staffFirstName,
        lastName: staffLastName,
        role: staffRole,
        permissions: staffPermissions,
        approved: true,
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        invitedBy: inviteData?.invitedBy || 'system',
        inviteId: inviteDocId,
        isActive: true,
        ...(staffPhone && { phone: staffPhone })
      });

      console.log('✅ User profile and staff record created');

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(`/login?email=${encodeURIComponent(email)}&setup=complete`);
      }, 2000);

    } catch (err: any) {
      console.error('Setup error:', err);
      
      let errorMessage = 'Failed to create account';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error && !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full relative overflow-hidden">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-green-500" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Your Password</h1>
          <p className="text-gray-600">Create a secure password to access your account</p>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="bg-green-500 text-white p-4 rounded-xl text-center mb-6 flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Account created successfully! Redirecting to login...</span>
          </div>
        ) : (
          <>
            {/* Invitation Info */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 border-l-4 border-indigo-600">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Email: <span className="font-semibold text-gray-900">{email}</span></span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm text-gray-600">Business: <span className="font-semibold text-gray-900">{businessName}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                <span className="text-sm text-gray-600">Role: </span>
                <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">{role}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Create Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-base transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    passwordError ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter a strong password"
                  required
                  autoFocus
                />
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${strength.color}`} 
                        style={{ width: `${strength.level * 20}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      strength.level <= 2 ? 'text-red-500' : strength.level <= 3 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {strength.text}
                    </p>
                  </div>
                )}
                {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-base transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    confirmError ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Confirm your password"
                  required
                />
                {confirmError && <p className="text-red-500 text-sm mt-2">{confirmError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Create Account & Continue</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-indigo-600 hover:underline font-medium">
                  Sign in here
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SetupPasswordPage;

