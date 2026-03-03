import React, { useState, useEffect } from "react";
import { updateSEOSettings } from "../../services/siteService";

const SEOSettings = ({ siteId, initialSettings, onUpdate }) => {
  const [settings, setSettings] = useState({
    title: "",
    description: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "summary_large_image",
    canonicalUrl: "",
    ...initialSettings,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateSEOSettings(siteId, settings);
      onUpdate(settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = () => {
    return {
      title: settings.title || "Your Site Title",
      description: settings.description || "Your site description",
      url: settings.canonicalUrl || "https://yoursite.com",
    };
  };

  const preview = generatePreview();

  return (
    <div className="seo-settings-container">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          SEO Settings
        </h3>
        <p className="text-sm text-gray-600">
          Configure how your site appears in search engines and social media
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Title
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Your Amazing Website"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={60}
            />
            <p className="text-xs text-gray-500 mt-1">
              {settings.title.length}/60 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              value={settings.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="A brief description of your website"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={160}
            />
            <p className="text-xs text-gray-500 mt-1">
              {settings.description.length}/160 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords
            </label>
            <input
              type="text"
              value={settings.keywords}
              onChange={(e) => handleChange("keywords", e.target.value)}
              placeholder="website, business, services"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated keywords
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canonical URL
            </label>
            <input
              type="url"
              value={settings.canonicalUrl}
              onChange={(e) => handleChange("canonicalUrl", e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Open Graph Title
            </label>
            <input
              type="text"
              value={settings.ogTitle}
              onChange={(e) => handleChange("ogTitle", e.target.value)}
              placeholder="Social media title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Open Graph Description
            </label>
            <textarea
              value={settings.ogDescription}
              onChange={(e) => handleChange("ogDescription", e.target.value)}
              placeholder="Social media description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Open Graph Image URL
            </label>
            <input
              type="url"
              value={settings.ogImage}
              onChange={(e) => handleChange("ogImage", e.target.value)}
              placeholder="https://yoursite.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twitter Card Type
            </label>
            <select
              value={settings.twitterCard}
              onChange={(e) => handleChange("twitterCard", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">
                Summary with Large Image
              </option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save SEO Settings"}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Search Engine Preview</h4>

          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-blue-600 text-sm mb-1">{preview.url}</div>
            <div className="text-lg text-blue-600 font-medium mb-1">
              {preview.title}
            </div>
            <div className="text-sm text-gray-600">{preview.description}</div>
          </div>

          <h4 className="font-medium text-gray-900 mt-6">
            Social Media Preview
          </h4>

          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            {settings.ogImage && (
              <img
                src={settings.ogImage}
                alt="Social preview"
                className="w-full h-32 object-cover rounded mb-3"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <div className="text-sm text-gray-500 mb-1">{preview.url}</div>
            <div className="font-medium text-gray-900 mb-1">
              {settings.ogTitle || preview.title}
            </div>
            <div className="text-sm text-gray-600">
              {settings.ogDescription || preview.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEOSettings;
