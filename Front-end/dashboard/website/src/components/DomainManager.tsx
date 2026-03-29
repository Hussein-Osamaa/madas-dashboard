'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/backend';
import { DomainService, CustomDomain } from '@/modules/domains/domainService';
import { SubscriptionService } from '@/modules/billing/subscriptionService';

interface DomainManagerProps {
  businessId: string;
  siteId: string;
}

export default function DomainManager({ businessId, siteId }: DomainManagerProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [canAddDomains, setCanAddDomains] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    // Initialize auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && businessId) {
      loadDomains();
      checkPermissions();
    }
  }, [user, businessId]);

  const loadDomains = async () => {
    try {
      const businessDomains = await DomainService.getBusinessDomains(businessId);
      setDomains(businessDomains);
    } catch (error) {
      console.error('Error loading domains:', error);
      setMessage('Failed to load domains');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    if (!user) return;

    try {
      const canAdd = await DomainService.canAddCustomDomain(businessId);
      setCanAddDomains(canAdd);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanAddDomains(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setIsAdding(true);
    setMessage('');

    try {
      console.log('Adding custom domain:', newDomain);
      
      const domain = await DomainService.addCustomDomain(newDomain, businessId, siteId);
      
      setDomains(prev => [...prev, domain]);
      setNewDomain('');
      setMessage(`Domain ${newDomain} added successfully. Please add the DNS records to verify.`);
      setMessageType('success');

    } catch (error) {
      console.error('Error adding domain:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to add domain');
      setMessageType('error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setIsVerifying(domainId);
    setMessage('');

    try {
      console.log('Verifying domain:', domainId);
      
      const result = await DomainService.verifyDomain(domainId);
      
      if (result.success) {
        setMessage('Domain verified successfully!');
        setMessageType('success');
        await loadDomains(); // Reload domains to get updated status
      } else {
        setMessage(result.message);
        setMessageType('error');
      }

    } catch (error) {
      console.error('Error verifying domain:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to verify domain');
      setMessageType('error');
    } finally {
      setIsVerifying(null);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) {
      return;
    }

    try {
      console.log('Removing domain:', domainId);
      
      await DomainService.removeCustomDomain(domainId);
      
      setDomains(prev => prev.filter(domain => domain.id !== domainId));
      setMessage('Domain removed successfully');
      setMessageType('success');

    } catch (error) {
      console.error('Error removing domain:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to remove domain');
      setMessageType('error');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to manage domains</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom Domains</h2>
        <p className="text-gray-600">Manage custom domains for your published sites</p>
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

      {/* Add Domain Form */}
      {canAddDomains ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Domain</h3>
          
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Domain Name
              </label>
              <input
                id="domain"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter your domain name without http:// or www
              </p>
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="bg-indigo-600 text-white py-2 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Custom Domains Not Available
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Custom domains are only available for Pro and Enterprise plans. 
                  <a href="/billing" className="font-medium underline hover:text-yellow-600">
                    Upgrade your plan
                  </a> to use custom domains.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domains List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Domains</h3>
        </div>

        {domains.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No domains</h3>
            <p className="mt-1 text-sm text-gray-500">
              {canAddDomains 
                ? 'Get started by adding your first custom domain.'
                : 'Upgrade your plan to add custom domains.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <div key={domain.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{domain.domain}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DomainService.getStatusColor(domain.status)}`}>
                        {DomainService.getStatusLabel(domain.status)}
                      </span>
                    </div>
                    
                    {domain.status === 'pending' && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">Add these DNS records to verify your domain:</p>
                        <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                          {domain.dnsRecords.map((record, index) => (
                            <div key={index} className="mb-1">
                              <span className="text-gray-500">{record.type}</span> {record.name} → {record.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {domain.status === 'pending' && (
                      <button
                        onClick={() => handleVerifyDomain(domain.id)}
                        disabled={isVerifying === domain.id}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying === domain.id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRemoveDomain(domain.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
