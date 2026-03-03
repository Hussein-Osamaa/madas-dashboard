import React, { useState, useEffect } from 'react';
import { getPublishingLogs } from '../../services/publishingService';
import { useAuth } from '../../contexts/AuthContext';

const PublishLogs = ({ siteId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser && siteId) {
      loadLogs();
    }
  }, [currentUser, siteId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getPublishingLogs(currentUser.uid, siteId);
      setLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Error loading logs: {error}
      </div>
    );
  }

  return (
    <div className="publish-logs-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Publishing History</h3>
        <button
          onClick={loadLogs}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No publishing logs found</p>
          <p className="text-sm">Publish your site to see logs here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                {log.url && (
                  <a
                    href={log.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Site →
                  </a>
                )}
              </div>
              
              <div className="text-sm text-gray-700">
                <p><strong>Site:</strong> {log.siteName}</p>
                {log.message && <p><strong>Message:</strong> {log.message}</p>}
                {log.error && (
                  <p className="text-red-600"><strong>Error:</strong> {log.error}</p>
                )}
                {log.duration && (
                  <p><strong>Duration:</strong> {log.duration}ms</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublishLogs;
