import React, { useState, useEffect } from "react";
import {
  getCustomDomains,
  addCustomDomain,
  removeCustomDomain,
  verifyDomain,
} from "../../services/domainService";
import { useAuth } from "../../contexts/AuthContext";

const DomainManager = ({ siteId }) => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser && siteId) {
      loadDomains();
    }
  }, [currentUser, siteId]);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const domainsData = await getCustomDomains(currentUser.uid, siteId);
      setDomains(domainsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      setIsAdding(true);
      await addCustomDomain({
        domain: newDomain.trim(),
        siteId,
        userId: currentUser.uid,
      });
      setNewDomain("");
      await loadDomains();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (domainId) => {
    if (!confirm("Are you sure you want to remove this domain?")) return;

    try {
      await removeCustomDomain(domainId);
      await loadDomains();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      await verifyDomain(domainId);
      await loadDomains();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "verified":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading domains...</span>
      </div>
    );
  }

  return (
    <div className="domain-manager-container">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Custom Domains
        </h3>
        <p className="text-sm text-gray-600">
          Connect your own domain to your published site
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Add Domain Form */}
      <form onSubmit={handleAddDomain} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={isAdding || !newDomain.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAdding ? "Adding..." : "Add Domain"}
          </button>
        </div>
      </form>

      {/* Domains List */}
      {domains.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
            />
          </svg>
          <p>No custom domains configured</p>
          <p className="text-sm">Add a domain to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {domain.domain}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      domain.status
                    )}`}
                  >
                    {domain.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {domain.status === "pending" && (
                    <button
                      onClick={() => handleVerifyDomain(domain.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Verify
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveDomain(domain.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {domain.status === "pending" && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    DNS Setup Required
                  </h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p>
                      <strong>CNAME Record:</strong> {domain.domain} →
                      yoursite.web.app
                    </p>
                    <p>
                      <strong>TXT Record:</strong> {domain.verificationToken}
                    </p>
                    <p className="text-xs mt-2">
                      Add these records to your DNS settings and click "Verify"
                      when ready.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DomainManager;
