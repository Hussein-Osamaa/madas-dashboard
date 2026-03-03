import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserSites, createSite } from "../../services/siteService";
import PublishButton from "./PublishButton";
import PublishLogs from "./PublishLogs";
import DomainManager from "./DomainManager";
import SEOSettings from "./SEOSettings";

const PublishingDashboard = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [activeTab, setActiveTab] = useState("sites");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadSites();
    }
  }, [currentUser]);

  const loadSites = async () => {
    try {
      setLoading(true);
      const sitesData = await getUserSites(currentUser.uid);
      setSites(sitesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    try {
      const newSite = await createSite(
        {
          name: newSiteName.trim(),
          description: "A new website created with our builder",
        },
        currentUser.uid
      );

      setSites((prev) => [newSite, ...prev]);
      setSelectedSite(newSite);
      setNewSiteName("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublishSuccess = (result) => {
    // Update the selected site's status
    setSelectedSite((prev) => ({
      ...prev,
      status: "published",
      publishedAt: new Date(),
      url: result.url,
    }));

    // Update the sites list
    setSites((prev) =>
      prev.map((site) =>
        site.id === selectedSite.id
          ? {
              ...site,
              status: "published",
              publishedAt: new Date(),
              url: result.url,
            }
          : site
      )
    );
  };

  const handlePublishError = (error) => {
    setError(error);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published":
        return "text-green-600 bg-green-100";
      case "draft":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date.toDate ? date.toDate() : date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Publishing Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your websites and publishing settings
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Site
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Sites
                </h2>
              </div>
              <div className="p-4">
                {sites.length === 0 ? (
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
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p>No sites yet</p>
                    <p className="text-sm">
                      Create your first site to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sites.map((site) => (
                      <div
                        key={site.id}
                        onClick={() => setSelectedSite(site)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedSite?.id === site.id
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {site.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              site.status
                            )}`}
                          >
                            {site.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {site.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {formatDate(site.updatedAt)}
                        </p>
                        {site.url && (
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Site →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSite ? (
              <div className="space-y-6">
                {/* Site Header */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedSite.name}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {selectedSite.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            selectedSite.status
                          )}`}
                        >
                          {selectedSite.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Last updated: {formatDate(selectedSite.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <PublishButton
                      siteId={selectedSite.id}
                      siteData={selectedSite.draftData}
                      onPublishSuccess={handlePublishSuccess}
                      onPublishError={handlePublishError}
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="border-b">
                    <nav className="flex space-x-8 px-6">
                      {[
                        { id: "publish", label: "Publish", icon: "🚀" },
                        { id: "logs", label: "Publishing Logs", icon: "📋" },
                        { id: "domains", label: "Custom Domains", icon: "🌐" },
                        { id: "seo", label: "SEO Settings", icon: "🔍" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <span className="mr-2">{tab.icon}</span>
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="p-6">
                    {activeTab === "publish" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Publishing Options
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">
                                Quick Publish
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                Publish your site immediately with default
                                settings
                              </p>
                              <PublishButton
                                siteId={selectedSite.id}
                                siteData={selectedSite.draftData}
                                onPublishSuccess={handlePublishSuccess}
                                onPublishError={handlePublishError}
                              />
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">
                                Site Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <strong>Status:</strong> {selectedSite.status}
                                </div>
                                <div>
                                  <strong>Created:</strong>{" "}
                                  {formatDate(selectedSite.createdAt)}
                                </div>
                                {selectedSite.publishedAt && (
                                  <div>
                                    <strong>Published:</strong>{" "}
                                    {formatDate(selectedSite.publishedAt)}
                                  </div>
                                )}
                                {selectedSite.url && (
                                  <div>
                                    <strong>URL:</strong>
                                    <a
                                      href={selectedSite.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 ml-1"
                                    >
                                      {selectedSite.url}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "logs" && (
                      <PublishLogs siteId={selectedSite.id} />
                    )}

                    {activeTab === "domains" && (
                      <DomainManager siteId={selectedSite.id} />
                    )}

                    {activeTab === "seo" && (
                      <SEOSettings
                        siteId={selectedSite.id}
                        initialSettings={selectedSite.seoSettings}
                        onUpdate={(settings) => {
                          setSelectedSite((prev) => ({
                            ...prev,
                            seoSettings: settings,
                          }));
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Site
                </h3>
                <p className="text-gray-500">
                  Choose a site from the sidebar to manage its publishing
                  settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Site
            </h3>
            <form onSubmit={handleCreateSite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="My Awesome Website"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishingDashboard;
