import { useState, useEffect } from 'react';
import type { SitePage } from './PageManager';

interface Props {
  page: SitePage;
  siteName: string;
  onUpdate: (seo: NonNullable<SitePage['seo']>) => void;
  onClose: () => void;
}

const SEOPanel = ({ page, siteName, onUpdate, onClose }: Props) => {
  const [seo, setSeo] = useState<NonNullable<SitePage['seo']>>(page.seo ?? {});

  // Re-sync when the active page changes
  useEffect(() => {
    setSeo(page.seo ?? {});
  }, [page.id]);

  const set = (field: keyof NonNullable<SitePage['seo']>, value: string) => {
    const next = { ...seo, [field]: value };
    setSeo(next);
    onUpdate(next);
  };

  const titleLen = (seo.title || '').length;
  const descLen  = (seo.description || '').length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-icons text-primary text-lg">travel_explore</span>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">SEO Settings</h2>
            <p className="text-xs text-gray-400">{page.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
        >
          <span className="material-icons text-base text-gray-500">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Meta Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meta Title</label>
            <span className={`text-xs ${titleLen > 60 ? 'text-red-500' : titleLen > 50 ? 'text-amber-500' : 'text-gray-400'}`}>
              {titleLen}/60
            </span>
          </div>
          <input
            type="text"
            value={seo.title || ''}
            onChange={(e) => set('title', e.target.value)}
            placeholder={`${page.name} | ${siteName}`}
            maxLength={80}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <p className="text-xs text-gray-400 mt-1">Shown in browser tab and search results. Keep under 60 chars.</p>
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meta Description</label>
            <span className={`text-xs ${descLen > 160 ? 'text-red-500' : descLen > 140 ? 'text-amber-500' : 'text-gray-400'}`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            value={seo.description || ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe this page for search engines…"
            maxLength={200}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Shown in search snippets. Keep under 160 chars.</p>
        </div>

        {/* OG Image */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Social Image (OG Image)
          </label>
          <input
            type="url"
            value={seo.ogImage || ''}
            onChange={(e) => set('ogImage', e.target.value)}
            placeholder="https://example.com/og-image.jpg"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {seo.ogImage && (
            <img
              src={seo.ogImage}
              alt="OG preview"
              className="mt-2 w-full h-28 object-cover rounded-lg border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <p className="text-xs text-gray-400 mt-1">Recommended: 1200×630 px. Shown when sharing on social media.</p>
        </div>

        {/* Canonical URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Canonical URL
          </label>
          <input
            type="url"
            value={seo.canonical || ''}
            onChange={(e) => set('canonical', e.target.value)}
            placeholder="https://yourdomain.com/page"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank to use the default page URL.</p>
        </div>

        {/* SERP Preview */}
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 mb-2">SERP Preview</p>
          <p className="text-sm text-blue-700 font-medium truncate">
            {seo.title || `${page.name} | ${siteName}`}
          </p>
          <p className="text-xs text-green-700 mt-0.5">yourdomain.com/{page.slug}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {seo.description || 'No description set — add one to improve click-through rates.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SEOPanel;
