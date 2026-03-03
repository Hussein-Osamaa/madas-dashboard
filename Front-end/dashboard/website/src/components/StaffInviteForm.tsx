'use client';

import { useState } from 'react';
import { StaffInviteService } from '@/modules/staff/inviteService';

interface StaffInviteFormProps {
  businessId: string;
  invitedBy: string;
  onInviteSent?: (invite: any) => void;
  onError?: (error: string) => void;
}

export default function StaffInviteForm({ 
  businessId, 
  invitedBy, 
  onInviteSent, 
  onError 
}: StaffInviteFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'staff' as 'staff' | 'manager' | 'admin'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email) {
      onError?.('Please enter an email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      onError?.('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending staff invite...');
      
      const invite = await StaffInviteService.sendInvite(
        formData.email,
        businessId,
        formData.role,
        invitedBy
      );

      console.log('Staff invite sent successfully:', invite);
      setSuccess(`Invitation sent to ${formData.email}`);
      
      // Reset form
      setFormData({
        email: '',
        role: 'staff'
      });

      onInviteSent?.(invite);

    } catch (error) {
      console.error('Error sending staff invite:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'staff',
      label: 'Staff',
      description: 'Basic access to view and manage orders and inventory'
    },
    {
      value: 'manager',
      label: 'Manager',
      description: 'Extended access including customer management and reports'
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Full access including staff management and settings'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Staff Member</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="staff@example.com"
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>

        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            id="role"
            name="role"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.role}
            onChange={handleInputChange}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Invite...
              </div>
            ) : (
              'Send Invitation'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              The invited person will receive an email with a link to join your business. 
              The invitation will expire in 7 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
