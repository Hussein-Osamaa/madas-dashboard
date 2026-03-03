'use client';

import { useState, useEffect } from 'react';
import { Search, Building2, User, Calendar, Phone, Mail, Plus, X } from 'lucide-react';
import { AdminService, Business } from '@/lib/adminService';

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    ownerName: '',
    businessName: '',
    industry: '',
    email: '',
    phone: '',
    plan: 'Starter' as 'Starter' | 'Pro' | 'Enterprise',
    password: ''
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = businesses.filter(business =>
        business.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBusinesses(filtered);
    } else {
      setFilteredBusinesses(businesses);
    }
  }, [searchTerm, businesses]);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const businessesData = await AdminService.getBusinesses();
      setBusinesses(businessesData);
      setFilteredBusinesses(businessesData);
    } catch (error) {
      setError('Failed to load businesses');
      console.error('Error loading businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      try {
        setIsLoading(true);
        const searchResults = await AdminService.searchBusinessesByName(searchTerm);
        setFilteredBusinesses(searchResults);
      } catch (error) {
        setError('Failed to search businesses');
        console.error('Error searching businesses:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setFilteredBusinesses(businesses);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getPlanBadge = (plan: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (plan) {
      case 'Enterprise':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Pro':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Starter':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'inactive':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');

    try {
      await AdminService.createBusinessWithDashboardAccess(newBusiness);
      setShowAddModal(false);
      setNewBusiness({
        ownerName: '',
        businessName: '',
        industry: '',
        email: '',
        phone: '',
        plan: 'Starter',
        password: ''
      });
      await loadBusinesses(); // Reload the list
    } catch (error: any) {
      setError(`Failed to create business: ${error.message}`);
      console.error('Error creating business:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewBusiness(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading && businesses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Businesses Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage business accounts and subscriptions
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search businesses by name..."
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Businesses table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Businesses ({filteredBusinesses.length})
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All registered businesses in the system
          </p>
        </div>
        
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No businesses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'No businesses have been registered yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredBusinesses.map((business) => (
              <li key={business.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {business.businessName}
                          </p>
                          <span className={`ml-2 ${getPlanBadge(business.plan)}`}>
                            {business.plan}
                          </span>
                          <span className={`ml-2 ${getStatusBadge(business.status)}`}>
                            {business.status}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {business.ownerName}
                          </span>
                          <span className="ml-4 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {business.email}
                          </span>
                          {business.phone && (
                            <span className="ml-4 flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {business.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(business.createdAt)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Industry:</span> {business.industry}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Business</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddBusiness} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={newBusiness.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter owner full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    required
                    value={newBusiness.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Industry</label>
                  <input
                    type="text"
                    required
                    value={newBusiness.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., E-commerce, Restaurant, Retail"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={newBusiness.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter business email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={newBusiness.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <select
                    value={newBusiness.plan}
                    onChange={(e) => handleInputChange('plan', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={newBusiness.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter password for dashboard access"
                    minLength={6}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isAdding ? 'Creating...' : 'Create Business'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
