/**
 * Setup Password Page for Super Admin Invitations
 * Allows invited staff to create their account and set a password
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from '../lib/firebase';
import { Shield, Mail, User, Lock, CheckCircle, AlertCircle, Loader2, KeyRound } from 'lucide-react';

const SetupPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL Parameters
  const email = searchParams.get('email') || '';
  const inviteId = searchParams.get('invite') || '';
  const type = searchParams.get('type') || 'super_admin';
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  
  // Invitation data
  const [inviteData, setInviteData] = useState<any>(null);
  
  // Password strength
  const [strength, setStrength] = useState({ level: 0, text: '', color: '' });

  useEffect(() => {
    validateInvitation();
  }, [email, inviteId]);

  const validateInvitation = async () => {
    setValidating(true);
    
    if (!email || !inviteId) {
      setError('Invalid invitation link. Missing required parameters.');
      setValidating(false);
      return;
    }

    try {
      // Check if invitation exists and is valid
      const inviteRef = doc(db, 'superAdminInvites', inviteId);
      const inviteDoc = await getDoc(inviteRef);

      if (!inviteDoc.exists()) {
        setError('Invitation not found. It may have been cancelled or expired.');
        setValidating(false);
        return;
      }

      const data = inviteDoc.data();
      
      if (data.status !== 'pending') {
        setError('This invitation has already been used or has expired.');
        setValidating(false);
        return;
      }

      if (data.email.toLowerCase() !== email.toLowerCase()) {
        setError('Email mismatch. Please use the correct invitation link.');
        setValidating(false);
        return;
      }

      // Check if invitation is expired
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError('This invitation has expired. Please request a new invitation.');
        setValidating(false);
        return;
      }

      setInviteData(data);
    } catch (err) {
      console.error('Error validating invitation:', err);
      setError('Failed to validate invitation. Please try again.');
    } finally {
      setValidating(false);
    }
  };

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
      setStrength({ level, text: `Medium. Add: ${feedback.slice(0, 1).join(', ')}`, color: 'bg-amber-500' });
    } else {
      setStrength({ level, text: 'Strong password!', color: 'bg-emerald-500' });
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

      // Create user document for super admin
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.toLowerCase(),
        name: inviteData?.name || email.split('@')[0],
        tenant_id: null, // Super admin has no tenant
        role_id: inviteData?.role_id || null,
        type: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        setupCompleted: true
      });

      console.log('✅ User document created');

      // Update invitation status
      await updateDoc(doc(db, 'superAdminInvites', inviteId), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: user.uid
      });

      console.log('✅ Invitation marked as accepted');

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
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

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-5">
        <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Validating Invitation</h2>
          <p className="text-gray-400">Please wait while we verify your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid invitation)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-5">
        <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] px-6 py-3 rounded-xl font-semibold hover:from-amber-300 hover:to-amber-400 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b1a] flex items-center justify-center p-5">
      <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-8 max-w-md w-full relative overflow-hidden">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Shield className="w-8 h-8 text-[#0a0b1a]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup Your Account</h1>
          <p className="text-gray-400">Create a secure password to access the admin panel</p>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center mb-6 flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6" />
            <span>Account created successfully! Redirecting...</span>
          </div>
        ) : (
          <>
            {/* Invitation Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-sm font-medium text-white">{email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <User className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="text-sm font-medium text-white">{inviteData?.name || 'Staff Member'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Access Level</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Create Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition ${
                    passwordError ? 'border-red-500/50' : 'border-white/10'
                  }`}
                  placeholder="Enter a strong password"
                  required
                  autoFocus
                />
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${strength.color}`} 
                        style={{ width: `${strength.level * 20}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      strength.level <= 2 ? 'text-red-400' : strength.level <= 3 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {strength.text}
                    </p>
                  </div>
                )}
                {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition ${
                    confirmError ? 'border-red-500/50' : 'border-white/10'
                  }`}
                  placeholder="Confirm your password"
                  required
                />
                {confirmError && <p className="text-red-400 text-sm mt-2">{confirmError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] py-4 rounded-xl font-semibold text-base hover:from-amber-300 hover:to-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Create Account & Continue</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>
                Already have an account?{' '}
                <button onClick={() => navigate('/')} className="text-amber-400 hover:underline font-medium">
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

