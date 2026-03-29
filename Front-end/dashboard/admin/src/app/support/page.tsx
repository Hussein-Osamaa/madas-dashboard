'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, serverTimestamp, db } from '@/lib/backend';

interface SupportTicket {
  id: string;
  uid: string;
  email: string;
  businessId: string;
  businessName: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'billing' | 'technical' | 'feature_request' | 'bug_report' | 'general';
  createdAt: any;
  updatedAt: any;
  resolvedAt?: any;
  assignedTo?: string;
  response?: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load support tickets
      const ticketsQuery = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
      const ticketsSnapshot = await getDocs(ticketsQuery);

      // Load users to get email info
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));

      // Load businesses to get business names
      const businessesQuery = query(collection(db, 'businesses'));
      const businessesSnapshot = await getDocs(businessesQuery);
      const businessesMap = new Map(businessesSnapshot.docs.map(doc => [doc.id, doc.data()]));

      const ticketsData: SupportTicket[] = ticketsSnapshot.docs.map(doc => {
        const ticketData = doc.data();
        const userData = usersMap.get(ticketData.uid) || {};
        const businessData = businessesMap.get(ticketData.businessId) || {};

        return {
          id: doc.id,
          uid: ticketData.uid,
          email: userData.email || 'N/A',
          businessId: ticketData.businessId || 'N/A',
          businessName: businessData.businessName || 'N/A',
          subject: ticketData.subject || 'No Subject',
          message: ticketData.message || '',
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'general',
          createdAt: ticketData.createdAt,
          updatedAt: ticketData.updatedAt,
          resolvedAt: ticketData.resolvedAt,
          assignedTo: ticketData.assignedTo,
          response: ticketData.response
        };
      });

      setTickets(ticketsData);

    } catch (error) {
      console.error('Error loading support tickets:', error);
      setError('Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: SupportTicket['status']) => {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(ticketRef, updateData);
      await loadTickets();

    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status');
    }
  };

  const handleRespondToTicket = async (ticketId: string) => {
    if (!response.trim()) {
      alert('Please enter a response');
      return;
    }

    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        response: response,
        status: 'in_progress',
        updatedAt: serverTimestamp()
      });

      setResponse('');
      setSelectedTicket(null);
      await loadTickets();

    } catch (error) {
      console.error('Error responding to ticket:', error);
      alert('Failed to send response');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'billing':
        return 'bg-blue-100 text-blue-800';
      case 'technical':
        return 'bg-purple-100 text-purple-800';
      case 'feature_request':
        return 'bg-green-100 text-green-800';
      case 'bug_report':
        return 'bg-red-100 text-red-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-600">Manage customer support requests</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="feature_request">Feature Request</option>
              <option value="bug_report">Bug Report</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Support Tickets ({filteredTickets.length})
          </h2>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No support tickets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No support tickets have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.message}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.email}</div>
                        <div className="text-sm text-gray-500">{ticket.businessName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(ticket.category)}`}>
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.createdAt ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </button>
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'in_progress')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Start
                          </button>
                        )}
                        {ticket.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedTicket.subject}</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <p className="text-sm text-gray-900">{selectedTicket.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business</label>
                    <p className="text-sm text-gray-900">{selectedTicket.businessName}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedTicket.message}</p>
                </div>

                {selectedTicket.response && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Response</label>
                    <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-md">{selectedTicket.response}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="response" className="block text-sm font-medium text-gray-700">
                    Add Response
                  </label>
                  <textarea
                    id="response"
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your response..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleRespondToTicket(selectedTicket.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Send Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








