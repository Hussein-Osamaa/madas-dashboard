'use client';

import { useState } from 'react';
import { signupService } from '@/modules/auth/signup';
import { loginService } from '@/modules/auth/login';

export default function TestSignupPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpass123');
  const [businessName, setBusinessName] = useState('Test Business');
  const [ownerName, setOwnerName] = useState('Test Owner');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const result = await signupService.signUpWithEmailAndPassword(
        email,
        password,
        businessName,
        ownerName,
        'Starter'
      );
      setResult({ type: 'signup', data: result });
    } catch (error) {
      setResult({ type: 'error', data: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginService.signInWithEmailAndPassword(email, password);
      setResult({ type: 'login', data: result });
    } catch (error) {
      setResult({ type: 'error', data: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Signup/Login Flow</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleSignup}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </button>
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">
              {result.type === 'signup' ? 'Signup Result:' : 
               result.type === 'login' ? 'Login Result:' : 'Error:'}
            </h3>
            <pre className="text-sm text-gray-700 overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

