import React, { Suspense, useState } from 'react';
import type { Section } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';
import type { ApiBinding, AnalyticsEvents } from '../../registry/types';

/* ─────────────────────────────────────────────────────────────────────────
   SectionEditor — thin dispatcher with Content + Data & Analytics tabs
   Looks up the registered Editor component for the given section type and
   renders it inside a Suspense boundary (editors are lazy-loaded chunks).
───────────────────────────────────────────────────────────────────────── */

type Props = {
  section: Section;
  onUpdate: (data: any) => void;
  onClose: () => void;
  businessId?: string;
  siteId?: string;
};

type Tab = 'content' | 'analytics';

const EditorLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs text-gray-400">Loading editor…</p>
    </div>
  </div>
);

/* ── Analytics Event Row ────────────────────────────────────────────── */
const EVENT_ICONS: Record<string, string> = {
  section_view:         'visibility',
  product_view:         'storefront',
  product_click:        'touch_app',
  collection_view:      'photo_library',
  collection_click:     'touch_app',
  add_to_cart:          'add_shopping_cart',
  cta_click:            'campaign',
  newsletter_subscribe: 'email',
  contact_submit:       'contact_mail',
  video_play:           'play_circle',
};

const EVENT_LABELS: Record<string, string> = {
  onSectionView: 'Section enters viewport',
  onItemView:    'Each item enters viewport',
  onItemClick:   'Item card is clicked',
  onCtaClick:    'CTA button is clicked',
  onFormSubmit:  'Form submitted successfully',
};

const AnalyticsEventRow: React.FC<{ trigger: string; eventName: string }> = ({ trigger, eventName }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-2 min-w-0">
      <span className="material-icons text-base text-primary/50 flex-shrink-0">
        {EVENT_ICONS[eventName] ?? 'bolt'}
      </span>
      <span className="text-xs text-gray-600 truncate">{EVENT_LABELS[trigger] ?? trigger}</span>
    </div>
    <span className="ml-2 text-[10px] font-mono bg-primary/8 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
      {eventName}
    </span>
  </div>
);

/* ── Platform badges ────────────────────────────────────────────────── */
const PLATFORMS = [
  { label: 'GA4',   color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { label: 'Meta',  color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: 'TikTok',color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

/* ── Data & Analytics Panel ─────────────────────────────────────────── */
const DataAnalyticsPanel: React.FC<{
  apiBinding?: ApiBinding;
  analyticsEvents?: AnalyticsEvents;
}> = ({ apiBinding, analyticsEvents }) => {
  const hasApi       = !!apiBinding;
  const hasAnalytics = !!analyticsEvents && Object.keys(analyticsEvents).length > 0;

  if (!hasApi && !hasAnalytics) {
    return (
      <div className="p-6 flex flex-col items-center text-center py-12">
        <span className="material-icons text-3xl text-gray-200 mb-3">analytics</span>
        <p className="text-sm font-medium text-gray-400 mb-1">No live data or analytics</p>
        <p className="text-xs text-gray-400/70">This is a static section — content is baked into the page at publish time.</p>
      </div>
    );
  }

  const ttlLabel = !apiBinding?.cacheTtlMs
    ? 'Always live (no cache)'
    : apiBinding.cacheTtlMs < 60_000
    ? `${apiBinding.cacheTtlMs / 1000}s cache`
    : `${apiBinding.cacheTtlMs / 60_000}m cache`;

  const analyticsEntries = analyticsEvents
    ? (Object.entries(analyticsEvents) as [string, string][])
    : [];

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* ── Live Data Binding ── */}
      {hasApi && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <span className="material-icons text-base text-green-600">cloud_sync</span>
            <span className="text-xs font-semibold text-green-700">Live Data</span>
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              Auto-fetched on publish
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {/* Endpoint */}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Endpoint</p>
              <code className="text-[11px] bg-gray-50 border border-gray-100 rounded px-2 py-1 block text-gray-700 break-all">
                {apiBinding!.method ?? 'GET'} {apiBinding!.endpoint}
              </code>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {ttlLabel}
              </span>
              {apiBinding!.paginates && (
                <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full">
                  Paginated
                </span>
              )}
              {apiBinding!.paramsFromData?.map(p => (
                <span key={p} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                  ?{p}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              The storefront runtime fetches this endpoint automatically after page load.
              Static baked-in data is shown immediately — live data replaces it within seconds.
            </p>
          </div>
        </div>
      )}

      {/* ── Analytics Events ── */}
      {hasAnalytics && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <span className="material-icons text-base text-indigo-500">insights</span>
            <span className="text-xs font-semibold text-indigo-700">Analytics Events</span>
            <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
              Auto-wired
            </span>
          </div>

          {/* Platform row */}
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 mr-1">Fires to:</span>
            {PLATFORMS.map(p => (
              <span key={p.label} className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${p.color}`}>
                {p.label}
              </span>
            ))}
          </div>

          {/* Event list */}
          <div className="px-3 pb-1">
            {analyticsEntries.map(([trigger, eventName]) => (
              <AnalyticsEventRow key={trigger} trigger={trigger} eventName={eventName} />
            ))}
          </div>

          <div className="px-3 pb-3">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Events fire via IntersectionObserver — no code needed. All platforms receive events simultaneously.
            </p>
          </div>
        </div>
      )}

      {/* ── Info note ── */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
        <span className="material-icons text-base text-amber-500 flex-shrink-0 mt-0.5">info</span>
        <p className="text-[11px] text-amber-700 leading-relaxed">
          This configuration is automatic — merchants never write code. Events and data
          bindings activate the moment the site is published.
        </p>
      </div>
    </div>
  );
};

/* ── Main SectionEditor ─────────────────────────────────────────────── */
const SectionEditor: React.FC<Props> = ({ section, onUpdate, onClose, businessId, siteId }) => {
  const entry = SECTION_REGISTRY[section.type];
  const [activeTab, setActiveTab] = useState<Tab>('content');

  const hasDataTab = !!(entry?.apiBinding || entry?.analyticsEvents);

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-madas-text/70 hover:text-primary transition-colors mb-3"
        >
          <span className="material-icons text-lg">arrow_back</span>
          <span>Back to Sections</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary">
              {entry?.label ?? section.type}
            </h3>
            <p className="text-xs text-madas-text/60 mt-0.5">
              {entry?.description ?? `Edit ${section.type} section`}
            </p>
          </div>
          {entry && (
            <span className="material-icons text-2xl text-gray-200">{entry.icon}</span>
          )}
        </div>

        {/* ── Tab bar — only shown when the section has data/analytics info ── */}
        {hasDataTab && (
          <div className="flex mt-3 bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === 'content'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="material-icons text-sm">edit</span>
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="material-icons text-sm">insights</span>
              Data & Analytics
            </button>
          </div>
        )}
      </div>

      {/* ── Editor body ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'analytics' ? (
          <DataAnalyticsPanel
            apiBinding={entry?.apiBinding}
            analyticsEvents={entry?.analyticsEvents}
          />
        ) : entry ? (
          <Suspense fallback={<EditorLoadingFallback />}>
            <entry.Editor
              section={section}
              onUpdate={onUpdate}
              onClose={onClose}
              businessId={businessId}
              siteId={siteId}
            />
          </Suspense>
        ) : (
          <div className="p-6 flex flex-col items-center text-center py-16">
            <span className="material-icons text-4xl text-gray-200 mb-3">widgets</span>
            <p className="text-sm text-gray-400">
              No editor registered for section type{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">{section.type}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionEditor;
