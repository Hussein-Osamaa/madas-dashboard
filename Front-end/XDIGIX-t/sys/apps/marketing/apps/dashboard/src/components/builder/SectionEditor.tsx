import React, { Suspense } from 'react';
import type { Section } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';

/* ─────────────────────────────────────────────────────────────────────────
   SectionEditor — thin dispatcher
   Looks up the registered Editor component for the given section type and
   renders it inside a Suspense boundary (editors are lazy-loaded chunks).
   The panel header (back button, label, icon) is rendered here; all field
   editing and StylePanel are owned by the individual *Editor components.
───────────────────────────────────────────────────────────────────────── */

type Props = {
  section: Section;
  onUpdate: (data: any) => void;
  onClose: () => void;
  businessId?: string;
  siteId?: string;
};

const EditorLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs text-gray-400">Loading editor…</p>
    </div>
  </div>
);

const SectionEditor: React.FC<Props> = ({ section, onUpdate, onClose, businessId, siteId }) => {
  const entry = SECTION_REGISTRY[section.type];

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
      </div>

      {/* ── Editor body ── */}
      <div className="flex-1 overflow-y-auto">
        {entry ? (
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
              No editor registered for section type <code className="text-xs bg-gray-100 px-1 rounded">{section.type}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionEditor;
